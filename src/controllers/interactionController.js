const { Op } = require("sequelize");
const {
  QaDiscussion,
  QaReply,
  Lesson,
  Section,
  Course,
  Review,
  Notification,
  Message,
  User,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");

const createDiscussion = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.body.lesson_id);
  if (!lesson) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }

  const discussion = await QaDiscussion.create({
    lesson_id: lesson.lesson_id,
    student_id: req.user.id,
    question: req.body.question,
  });

  res.status(201).json({ success: true, data: discussion });
});

const listDiscussions = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.lesson_id) {
    where.lesson_id = req.query.lesson_id;
  }
  if (req.query.course_id) {
    const lessons = await Lesson.findAll({
      include: [
        { model: Section, as: "section", where: { course_id: req.query.course_id } },
      ],
      attributes: ["lesson_id"],
    });
    where.lesson_id = {
      [Op.in]: lessons.map((l) => l.lesson_id),
    };
  }

  const discussions = await QaDiscussion.findAll({
    where,
    include: [
      { model: QaReply, as: "replies", include: [{ model: User, as: "user" }] },
    ],
    order: [["created_at", "DESC"]],
  });

  res.json({ success: true, data: discussions });
});

const replyDiscussion = asyncHandler(async (req, res) => {
  const discussion = await QaDiscussion.findByPk(req.params.id);
  if (!discussion) {
    return res.status(404).json({ success: false, message: "Discussion not found" });
  }

  const reply = await QaReply.create({
    discussion_id: discussion.discussion_id,
    user_id: req.user.id,
    reply_text: req.body.reply_text,
  });

  res.status(201).json({ success: true, data: reply });
});

const deleteDiscussion = asyncHandler(async (req, res) => {
  const discussion = await QaDiscussion.findByPk(req.params.id);
  if (!discussion) {
    return res.status(404).json({ success: false, message: "Discussion not found" });
  }
  if (
    req.user.role !== "system_admin" &&
    req.user.role !== "support_admin" &&
    req.user.id !== discussion.student_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await discussion.destroy();
  res.json({ success: true, message: "Discussion removed" });
});

const deleteReply = asyncHandler(async (req, res) => {
  const reply = await QaReply.findByPk(req.params.replyId);
  if (!reply) {
    return res.status(404).json({ success: false, message: "Reply not found" });
  }
  if (
    req.user.role !== "system_admin" &&
    req.user.role !== "support_admin" &&
    req.user.id !== reply.user_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await reply.destroy();
  res.json({ success: true, message: "Reply removed" });
});

const createReview = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.body.course_id);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  const existing = await Review.findOne({
    where: { course_id: course.course_id, student_id: req.user.id },
  });
  if (existing) {
    return res.status(400).json({ success: false, message: "Review already exists" });
  }

  const review = await Review.create({
    course_id: course.course_id,
    student_id: req.user.id,
    rating: req.body.rating,
    comment: req.body.comment,
    status: "pending",
  });

  res.status(201).json({ success: true, data: review });
});

const listReviews = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }

  if (req.user.role === "instructor") {
    const courses = await Course.findAll({
      where: { instructor_id: req.user.id },
      attributes: ["course_id"],
    });
    where.course_id = {
      [Op.in]: courses.map((c) => c.course_id),
    };
  }
  if (req.user.role === "student") {
    where.student_id = req.user.id;
  }

  const result = await Review.findAndCountAll({
    where,
    include: [{ model: Course, as: "course" }],
    limit,
    offset,
    order: [["created_at", "DESC"]],
  });

  res.json({
    success: true,
    data: result.rows,
    meta: {
      total: result.count,
      page,
      limit,
      total_pages: Math.ceil(result.count / limit),
    },
  });
});

const updateReviewStatus = asyncHandler(async (req, res) => {
  const review = await Review.findByPk(req.params.id, {
    include: [{ model: Course, as: "course" }],
  });
  if (!review) {
    return res.status(404).json({ success: false, message: "Review not found" });
  }

  const canModerate =
    req.user.role === "system_admin" ||
    req.user.role === "support_admin" ||
    (req.user.role === "instructor" &&
      review.course?.instructor_id === req.user.id);
  if (!canModerate) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await review.update({
    status: req.body.status ?? review.status,
    comment: req.body.comment ?? review.comment,
  });

  res.json({ success: true, data: review });
});

const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.findAll({
    where: { user_id: req.user.id },
    order: [["created_at", "DESC"]],
  });
  res.json({ success: true, data: notifications });
});

const markNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification || notification.user_id !== req.user.id) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  await notification.update({
    is_read: req.body.is_read ?? true,
  });

  res.json({ success: true, data: notification });
});

const createNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.create({
    user_id: req.body.user_id,
    type: req.body.type,
    title: req.body.title,
    content: req.body.content,
  });
  res.status(201).json({ success: true, data: notification });
});

const listMessages = asyncHandler(async (req, res) => {
  const where = {
    [Op.or]: [{ sender_id: req.user.id }, { receiver_id: req.user.id }],
  };
  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }

  const messages = await Message.findAll({
    where,
    include: [
      { model: User, as: "sender", attributes: ["user_id", "full_name"] },
      { model: User, as: "receiver", attributes: ["user_id", "full_name"] },
    ],
    order: [["sent_at", "DESC"]],
  });

  res.json({ success: true, data: messages });
});

const sendMessage = asyncHandler(async (req, res) => {
  const message = await Message.create({
    sender_id: req.user.id,
    receiver_id: req.body.receiver_id,
    course_id: req.body.course_id,
    message_text: req.body.message_text,
  });
  res.status(201).json({ success: true, data: message });
});

const markMessageRead = asyncHandler(async (req, res) => {
  const message = await Message.findByPk(req.params.id);
  if (!message || message.receiver_id !== req.user.id) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }
  await message.update({ is_read: true });
  res.json({ success: true, data: message });
});

module.exports = {
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
};
