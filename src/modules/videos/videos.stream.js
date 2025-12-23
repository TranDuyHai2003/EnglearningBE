const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { pipeline } = require("stream");
const { promisify } = require("util");
const { s3Client } = require("../../store/s3");
const env = require("../../config/env");

const streamPipeline = promisify(pipeline);

class RangeNotSatisfiableError extends Error {
  constructor(message = "Requested Range Not Satisfiable") {
    super(message);
    this.name = "RangeNotSatisfiableError";
    this.status = 416;
  }
}

const parseRange = (header) => {
  if (!header) return null;
  const value = header.trim();
  const match = /^bytes=(\d+)-(\d+)?$/i.exec(value);
  if (!match) {
    throw new RangeNotSatisfiableError("Invalid Range header");
  }
  const start = Number.parseInt(match[1], 10);
  const end = match[2] ? Number.parseInt(match[2], 10) : undefined;

  if (Number.isNaN(start) || (match[2] && Number.isNaN(end))) {
    throw new RangeNotSatisfiableError("Invalid byte positions");
  }

  if (end !== undefined && end < start) {
    throw new RangeNotSatisfiableError("Range end must be >= start");
  }

  return { start, end };
};

const formatRangeHeader = (range) => {
  if (!range) return undefined;
  const endPortion = range.end !== undefined ? range.end : "";
  return `bytes=${range.start}-${endPortion}`;
};

const parseContentRange = (value) => {
  if (!value) return null;
  const match = /bytes\s+(\d+)-(\d+)\/(\d+|\*)/i.exec(value);
  if (!match) return null;
  return {
    start: Number.parseInt(match[1], 10),
    end: Number.parseInt(match[2], 10),
    size: match[3] === "*" ? null : Number.parseInt(match[3], 10),
  };
};

const streamVideoFromS3 = async ({
  req,
  res,
  bucket,
  key,
  mimeType,
  rangeHeader,
}) => {
  const range = rangeHeader ? parseRange(rangeHeader) : null;
  const commandInput = {
    Bucket: bucket,
    Key: key,
  };
  if (range) {
    commandInput.Range = formatRangeHeader(range);
  }

  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
  });

  let s3Response;
  try {
    s3Response = await s3Client.send(
      new GetObjectCommand(commandInput),
      { abortSignal: abortController.signal }
    );
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 416) {
      throw new RangeNotSatisfiableError();
    }
    if (error?.$metadata?.httpStatusCode === 404) {
      const notFound = new Error("Video object not found");
      notFound.status = 404;
      throw notFound;
    }
    throw error;
  }

  const responseHeaders = {
    "Cache-Control": "private, no-store",
    "Content-Type": mimeType || s3Response.ContentType || "video/webm",
    "Access-Control-Allow-Origin": env.FRONTEND_URL || "*",
    "Access-Control-Allow-Credentials": "true",
    "Cross-Origin-Resource-Policy": "cross-origin",
  };

  const parsedContentRange = parseContentRange(s3Response.ContentRange);

  if (range) {
    res.status(206);
    responseHeaders["Accept-Ranges"] = "bytes";
    if (s3Response.ContentRange) {
      responseHeaders["Content-Range"] = s3Response.ContentRange;
    }
    const chunkLength =
      s3Response.ContentLength != null
        ? s3Response.ContentLength
        : parsedContentRange
        ? parsedContentRange.end - parsedContentRange.start + 1
        : undefined;
    if (chunkLength != null) {
      responseHeaders["Content-Length"] = chunkLength;
    }
  } else {
    res.status(200);
    responseHeaders["Accept-Ranges"] = "bytes";
    if (parsedContentRange?.size != null) {
      responseHeaders["Content-Length"] = parsedContentRange.size;
    } else if (s3Response.ContentLength != null) {
      responseHeaders["Content-Length"] = s3Response.ContentLength;
    }
  }

  res.set(responseHeaders);
  await streamPipeline(s3Response.Body, res);
};

module.exports = {
  parseRange,
  streamVideoFromS3,
  RangeNotSatisfiableError,
};
