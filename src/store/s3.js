const {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const env = require("../config/env");

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
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

const uploadObject = async ({ bucket, key, body, contentType }) => {
  await ensureBucketExists(bucket);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
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

module.exports = {
  s3Client,
  ensureBucketExists,
  uploadObject,
  getPresignedUrl,
};
