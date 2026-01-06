const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
const env = require("./config/env");
const { initDatabase } = require("./config/database");
require("./models");
const { errorHandler } = require("./middleware/errorHandler");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const instructorRoutes = require("./routes/instructors");
const courseRoutes = require("./routes/courses");
const learningRoutes = require("./routes/learning");
const interactionRoutes = require("./routes/interaction");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");
const systemRoutes = require("./routes/system");
const discussionRoutes = require("./routes/discussions");
const reviewRoutes = require("./routes/reviews");
const moderationRoutes = require("./routes/moderation");
const notificationRoutes = require("./routes/notifications");
const storageRoutes = require("./routes/storage");
const trackRoutes = require("./routes/tracks");
const liveSessionRoutes = require("./routes/liveSessions");
const { initLiveSocket } = require("./services/liveSessionSocket");
const videoRoutes = require("./modules/videos/videos.routes");
const flashcardRoutes = require("./modules/flashcards/flashcards.routes");

const dictionaryRoutes = require("./modules/dictionary/dictionary.routes");
const speakingRoutes = require("./routes/speaking");


const app = express();
const server = http.createServer(
  app
);

app.use(helmet());
app.use(cors({
  origin: [env.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true
}));
app.use(morgan("dev"));

app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/payments")
);

app.use(express.json());

app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/instructors", instructorRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/speaking", speakingRoutes);

app.use("/api/courses", reviewRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/learning", discussionRoutes);
app.use("/api/interaction", interactionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api", moderationRoutes);
app.use("/api", systemRoutes);
app.use("/api", storageRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/live-sessions", liveSessionRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/dict", dictionaryRoutes);

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server running",
    environment: env.NODE_ENV,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await initDatabase();
    initLiveSocket(server);

    server.listen(env.PORT, () => {
      console.log("\n" + "=".repeat(60));
      console.log("SERVER STARTED");
      console.log(`URL : http://localhost:${env.PORT}`);
      console.log(`API : http://localhost:${env.PORT}/api`);
      console.log(`CORS: ${env.FRONTEND_URL}`);
      console.log("=".repeat(60) + "\n");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
