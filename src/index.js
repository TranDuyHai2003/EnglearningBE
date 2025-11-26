// Server entry point - Restart trigger
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

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

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(morgan("dev"));

// Stripe webhook MUST be before express.json() to receive raw body
app.use(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/payments")
);

app.use(express.json());

// Serve static files from uploads directory
app.use("/api/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/instructors", instructorRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/courses", reviewRoutes); // Review routes
app.use("/api/learning", learningRoutes);
app.use("/api/learning", discussionRoutes); // Discussion routes
app.use("/api/interaction", interactionRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes); // Notification routes
app.use("/api", moderationRoutes); // Moderation routes
app.use("/api", systemRoutes);

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

    app.listen(env.PORT, () => {
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
