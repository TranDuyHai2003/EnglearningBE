require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT) || 5000,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || "elearning_db",
  DB_USER: process.env.DB_USER || "elearning_admin",
  DB_PASSWORD: process.env.DB_PASSWORD || "123456",
  JWT_SECRET: process.env.JWT_SECRET || "secret-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://192.168.1.61:3000",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:8333",
  S3_REGION: process.env.S3_REGION || "seaweedfs",
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || "mykey",
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || "mysecret",
  S3_FORCE_PATH_STYLE:
    process.env.S3_FORCE_PATH_STYLE === "false" ? false : true,
  S3_VIDEO_BUCKET: process.env.S3_VIDEO_BUCKET || "course-videos",
  S3_SIGNED_URL_TTL: parseInt(process.env.S3_SIGNED_URL_TTL, 10) || 900,
  S3_MAX_UPLOAD_BYTES:
    parseInt(process.env.S3_MAX_UPLOAD_BYTES, 10) || 1024 * 1024 * 1024,
};
