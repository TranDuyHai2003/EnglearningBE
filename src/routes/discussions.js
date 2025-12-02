const express = require("express");
const router = express.Router();
const {
  createDiscussion,
  getDiscussions,
  createReply,
  markReplyHelpful,
  resolveDiscussion,
  deleteDiscussion,
  deleteReply,
} = require("../controllers/discussionController");
const { authMiddleware } = require("../middleware/auth");

router.post("/lessons/:lessonId/discussions", authMiddleware, createDiscussion);
router.get("/lessons/:lessonId/discussions", authMiddleware, getDiscussions);
router.delete("/discussions/:discussionId", authMiddleware, deleteDiscussion);
router.patch(
  "/discussions/:discussionId/resolve",
  authMiddleware,
  resolveDiscussion
);

router.post("/discussions/:discussionId/replies", authMiddleware, createReply);
router.patch("/replies/:replyId/helpful", authMiddleware, markReplyHelpful);
router.delete("/replies/:replyId", authMiddleware, deleteReply);

module.exports = router;
