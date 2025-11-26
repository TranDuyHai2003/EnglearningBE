const express = require("express");
const router = express.Router();
const {
  upsertReview,
  getCourseReviews,
  getMyReview,
  deleteMyReview,
} = require("../controllers/reviewController");
const { authMiddleware, optionalAuth } = require("../middleware/auth");

// Review routes
router.post("/:courseId/reviews", authMiddleware, upsertReview);
router.get("/:courseId/reviews", optionalAuth, getCourseReviews);
router.get("/:courseId/reviews/me", authMiddleware, getMyReview);
router.delete("/:courseId/reviews", authMiddleware, deleteMyReview);

module.exports = router;
