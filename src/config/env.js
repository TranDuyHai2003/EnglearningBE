require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT) || 5000,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: parseInt(process.env.DB_PORT) || 5432,
  DB_NAME: process.env.DB_NAME || "engbreaking_db",
  DB_USER: process.env.DB_USER || "postgres",
  DB_PASSWORD: process.env.DB_PASSWORD || "postgres",
  JWT_SECRET: process.env.JWT_SECRET || "secret-key",
  JWT_EXPIRE: process.env.JWT_EXPIRE || "7d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};
