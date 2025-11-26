const asyncHandler = require("express-async-handler");
const { Notification } = require("../models");

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, is_read } = req.query;
  const offset = (page - 1) * limit;

  const where = { user_id: req.user.id };
  if (is_read !== undefined) {
    where.is_read = is_read === "true" || is_read === true;
  }

  const notifications = await Notification.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    success: true,
    data: notifications.rows,
    meta: {
      total: notifications.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(notifications.count / limit),
    },
  });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const notificationId = parseInt(req.params.id);

  const notification = await Notification.findOne({
    where: {
      notification_id: notificationId,
      user_id: req.user.id,
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  await notification.update({ is_read: true });

  res.json({ success: true, data: notification });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/mark-all-read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  const [updatedCount] = await Notification.update(
    { is_read: true },
    {
      where: {
        user_id: req.user.id,
        is_read: false,
      },
    }
  );

  res.json({
    success: true,
    message: `Marked ${updatedCount} notifications as read`,
    count: updatedCount,
  });
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = asyncHandler(async (req, res) => {
  const notificationId = parseInt(req.params.id);

  const notification = await Notification.findOne({
    where: {
      notification_id: notificationId,
      user_id: req.user.id,
    },
  });

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  await notification.destroy();

  res.json({ success: true, message: "Notification deleted" });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
