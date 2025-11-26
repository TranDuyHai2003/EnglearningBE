const express = require("express");
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const { authMiddleware } = require("../middleware/auth");

// All routes require authentication
router.use(authMiddleware);

router.get("/", getNotifications);
router.patch("/mark-all-read", markAllAsRead); // Must be before /:id routes
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
