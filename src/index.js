const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const env = require("./config/env");
const { initDatabase } = require("./config/database");
const authRoutes = require("./routes/auth");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server running ✅",
    environment: env.NODE_ENV,
  });
});

const startServer = async () => {
  try {
    await initDatabase();

    app.listen(env.PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log(`🚀 SERVER STARTED`);
      console.log(`📍 http://localhost:${env.PORT}`);
      console.log(`🔗 API: http://localhost:${env.PORT}/api`);
      console.log(`🌐 CORS: ${env.FRONTEND_URL}`);
      console.log("=".repeat(60) + "\n");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
