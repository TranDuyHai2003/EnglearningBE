const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles, minRole } = require("../middleware/roles");
const {
  createDiscussion,
  listDiscussions,
  replyDiscussion,
  deleteDiscussion,
  deleteReply,
  createReview,
  listReviews,
  updateReviewStatus,
  listNotifications,
  markNotification,
  createNotification,
  listMessages,
  sendMessage,
  markMessageRead,
} = require("../controllers/interactionController");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/discussions",
  allowRoles("student", "instructor", "system_admin"),
  createDiscussion
);
router.get("/discussions", listDiscussions);
router.post(
  "/discussions/:id/replies",
  allowRoles("student", "instructor", "support_admin", "system_admin"),
  replyDiscussion
);
router.delete(
  "/discussions/:id",
  allowRoles("student", "instructor", "support_admin", "system_admin"),
  deleteDiscussion
);
router.delete(
  "/discussions/:id/replies/:replyId",
  allowRoles("student", "instructor", "support_admin", "system_admin"),
  deleteReply
);

router.post(
  "/reviews",
  allowRoles("student", "system_admin"),
  createReview
);
router.get("/reviews", listReviews);
router.patch(
  "/reviews/:id",
  allowRoles("instructor", "support_admin", "system_admin"),
  updateReviewStatus
);

router.get("/notifications", listNotifications);
router.patch("/notifications/:id", markNotification);
router.post(
  "/notifications",
  minRole("support_admin"),
  createNotification
);

router.get("/messages", listMessages);
router.post(
  "/messages",
  allowRoles("student", "instructor", "support_admin", "system_admin"),
  sendMessage
);
router.patch("/messages/:id/read", markMessageRead);

module.exports = router;
