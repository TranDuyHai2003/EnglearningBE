const {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const env = require("../config/env");

const { NodeHttpHandler } = require("@smithy/node-http-handler");
const http = require("http");

const s3Client = new S3Client({
  region: env.S3_REGION || "us-east-1",
  endpoint: env.S3_ENDPOINT.replace("localhost", "127.0.0.1"), // Force IPv4 to prevent ECONNRESET
  forcePathStyle: true, // SeaweedFS requires path style
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },

  // 🔥 FIX ECONNRESET
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 30000,
    socketTimeout: 30000,
    httpAgent: new http.Agent({
      keepAlive: false, // 🔥 RẤT QUAN TRỌNG
    }),
  }),

  maxAttempts: 1, // không retry
});



const ensuredBuckets = new Set();

const ensureBucketExists = async (bucket) => {
  if (!bucket || ensuredBuckets.has(bucket)) {
    return;
  }

  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    ensuredBuckets.add(bucket);
  } catch (error) {
    console.log(error,"error")
    if (
      error?.name === "NotFound" ||
      error?.$metadata?.httpStatusCode === 404
    ) {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
      ensuredBuckets.add(bucket);
    } else if (error?.$metadata?.httpStatusCode === 301) {
      ensuredBuckets.add(bucket);
    } else {
      throw error;
    }
  }
};

const uploadObject = async ({ bucket, key, body, contentType, contentLength }) => {
  await ensureBucketExists(bucket);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  await s3Client.send(command);
  return { bucket, key };
};

const getPresignedUrl = async ({ bucket, key, expiresIn }) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

const getFileStream = async ({ bucket, key }) => {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await s3Client.send(command);
  return response;
};

module.exports = {
  s3Client,
  ensureBucketExists,
  uploadObject,
  getPresignedUrl,
  getFileStream,
};
