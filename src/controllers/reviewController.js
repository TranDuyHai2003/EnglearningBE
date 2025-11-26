const asyncHandler = require("express-async-handler");
const { Review, Course, User, Enrollment } = require("../models");
const { sequelize } = require("../config/database");

// @desc    Create or update course review
// @route   POST /api/courses/:courseId/reviews
// @access  Private (Student only)
const upsertReview = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const { rating, comment } = req.body;

  // Check if student is enrolled
  const enrollment = await Enrollment.findOne({
    where: {
      student_id: req.user.id,
      course_id: courseId,
    },
  });

  if (!enrollment) {
    return res.status(403).json({
      success: false,
      message: "Bạn phải ghi danh khóa học để đánh giá",
    });
  }

  // Find or create review
  const [review, created] = await Review.findOrCreate({
    where: {
      student_id: req.user.id,
      course_id: courseId,
    },
    defaults: {
      rating,
      comment,
    },
  });

  if (!created) {
    await review.update({ rating, comment });
  }

  // Update course average rating
  await updateCourseAverageRating(courseId);

  const reviewWithUser = await Review.findByPk(review.review_id, {
    include: [
      {
        model: User,
        as: "student",
        attributes: ["user_id", "full_name", "avatar_url"],
      },
    ],
  });

  res.status(created ? 201 : 200).json({
    success: true,
    data: reviewWithUser,
  });
});

// @desc    Get reviews for a course
// @route   GET /api/courses/:courseId/reviews
// @access  Public
const getCourseReviews = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId);
  const { page = 1, limit = 20, rating } = req.query;
  const offset = (page - 1) * limit;

  const where = { course_id: courseId };
  if (rating) {
    where.rating = parseInt(rating);
  }

  const reviews = await Review.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "student",
        attributes: ["user_id", "full_name", "avatar_url"],
      },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    success: true,
    data: reviews.rows,
    meta: {
      total: reviews.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(reviews.count / limit),
    },
  });
});

// @desc    Get my review for a course
// @route   GET /api/courses/:courseId/reviews/me
// @access  Private
const getMyReview = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId);

  const review = await Review.findOne({
    where: {
      student_id: req.user.id,
      course_id: courseId,
    },
    include: [
      {
        model: User,
        as: "student",
        attributes: ["user_id", "full_name", "avatar_url"],
      },
    ],
  });

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Bạn chưa đánh giá khóa học này",
    });
  }

  res.json({ success: true, data: review });
});

// @desc    Delete my review
// @route   DELETE /api/courses/:courseId/reviews
// @access  Private
const deleteMyReview = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId);

  const review = await Review.findOne({
    where: {
      student_id: req.user.id,
      course_id: courseId,
    },
  });

  if (!review) {
    return res.status(404).json({
      success: false,
      message: "Review not found",
    });
  }

  await review.destroy();

  // Update course average rating
  await updateCourseAverageRating(courseId);

  res.json({ success: true, message: "Review deleted" });
});

// Helper function to update course average rating
async function updateCourseAverageRating(courseId) {
  const result = await Review.findOne({
    where: { course_id: courseId },
    attributes: [
      [sequelize.fn("AVG", sequelize.col("rating")), "avg_rating"],
      [sequelize.fn("COUNT", sequelize.col("review_id")), "total_reviews"],
    ],
    raw: true,
  });

  const avgRating = result.avg_rating ? parseFloat(result.avg_rating).toFixed(2) : null;

  await Course.update(
    { average_rating: avgRating },
    { where: { course_id: courseId } }
  );
}

module.exports = {
  upsertReview,
  getCourseReviews,
  getMyReview,
  deleteMyReview,
};
