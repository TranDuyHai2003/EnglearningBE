const asyncHandler = require("express-async-handler");
const {
  QaDiscussion,
  QaReply,
  Lesson,
  User,
  Notification,
  Section,
  Course,
} = require("../models");

const createDiscussion = asyncHandler(async (req, res) => {
  const lessonId = parseInt(req.params.lessonId);
  const { title, content } = req.body;

  const lesson = await Lesson.findByPk(lessonId);
  if (!lesson) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }

  const discussion = await QaDiscussion.create({
    lesson_id: lessonId,
    student_id: req.user.id,
    title,
    content,
  });

  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);

  await Notification.create({
    user_id: course.instructor_id,
    type: "discussion",
    title: "Câu hỏi mới",
    message: `${req.user.full_name} đã đặt câu hỏi trong bài "${lesson.title}"`,
    link: `/instructor/courses/${course.course_id}/lessons/${lessonId}`,
  });

  res.status(201).json({ success: true, data: discussion });
});

const getDiscussions = asyncHandler(async (req, res) => {
  const lessonId = parseInt(req.params.lessonId);
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  const discussions = await QaDiscussion.findAndCountAll({
    where: { lesson_id: lessonId },
    include: [
      {
        model: User,
        as: "student",
        attributes: ["user_id", "full_name", "avatar_url"],
      },
      {
        model: QaReply,
        as: "replies",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["user_id", "full_name", "avatar_url", "role"],
          },
        ],
        order: [["created_at", "ASC"]],
      },
    ],
    order: [
      ["is_resolved", "ASC"],
      ["created_at", "DESC"],
    ],
    limit: parseInt(limit),
    offset,
  });

  res.json({
    success: true,
    data: discussions.rows,
    meta: {
      total: discussions.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(discussions.count / limit),
    },
  });
});

const createReply = asyncHandler(async (req, res) => {
  const discussionId = parseInt(req.params.discussionId);
  const { content } = req.body;

  const discussion = await QaDiscussion.findByPk(discussionId, {
    include: [
      {
        model: Lesson,
        as: "lesson",
        include: [
          {
            model: Section,
            as: "section",
            include: [{ model: Course, as: "course" }],
          },
        ],
      },
    ],
  });

  if (!discussion) {
    return res
      .status(404)
      .json({ success: false, message: "Discussion not found" });
  }

  const reply = await QaReply.create({
    discussion_id: discussionId,
    user_id: req.user.id,
    content,
  });

  if (discussion.student_id !== req.user.id) {
    await Notification.create({
      user_id: discussion.student_id,
      type: "reply",
      title: "Câu trả lời mới",
      message: `${req.user.full_name} đã trả lời câu hỏi của bạn: "${discussion.title}"`,
      link: `/learn/courses/${discussion.lesson.section.course.course_id}/lessons/${discussion.lesson_id}`,
    });
  }

  const replyWithUser = await QaReply.findByPk(reply.reply_id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "full_name", "avatar_url", "role"],
      },
    ],
  });

  res.status(201).json({ success: true, data: replyWithUser });
});

const markReplyHelpful = asyncHandler(async (req, res) => {
  const replyId = parseInt(req.params.replyId);

  const reply = await QaReply.findByPk(replyId, {
    include: [
      {
        model: QaDiscussion,
        as: "discussion",
      },
    ],
  });

  if (!reply) {
    return res.status(404).json({ success: false, message: "Reply not found" });
  }

  if (reply.discussion.student_id !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await reply.update({ is_helpful: !reply.is_helpful });

  res.json({ success: true, data: reply });
});

const resolveDiscussion = asyncHandler(async (req, res) => {
  const discussionId = parseInt(req.params.discussionId);

  const discussion = await QaDiscussion.findByPk(discussionId, {
    include: [
      {
        model: Lesson,
        as: "lesson",
        include: [
          {
            model: Section,
            as: "section",
            include: [{ model: Course, as: "course" }],
          },
        ],
      },
    ],
  });

  if (!discussion) {
    return res
      .status(404)
      .json({ success: false, message: "Discussion not found" });
  }

  const canResolve =
    discussion.student_id === req.user.id ||
    discussion.lesson.section.course.instructor_id === req.user.id ||
    ["system_admin", "support_admin"].includes(req.user.role);

  if (!canResolve) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await discussion.update({ is_resolved: !discussion.is_resolved });

  res.json({ success: true, data: discussion });
});

const deleteDiscussion = asyncHandler(async (req, res) => {
  const discussionId = parseInt(req.params.discussionId);

  const discussion = await QaDiscussion.findByPk(discussionId);

  if (!discussion) {
    return res
      .status(404)
      .json({ success: false, message: "Discussion not found" });
  }

  if (
    discussion.student_id !== req.user.id &&
    !["system_admin", "support_admin"].includes(req.user.role)
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await discussion.destroy();

  res.json({ success: true, message: "Discussion deleted" });
});

const deleteReply = asyncHandler(async (req, res) => {
  const replyId = parseInt(req.params.replyId);

  const reply = await QaReply.findByPk(replyId);

  if (!reply) {
    return res.status(404).json({ success: false, message: "Reply not found" });
  }

  if (
    reply.user_id !== req.user.id &&
    !["system_admin", "support_admin"].includes(req.user.role)
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await reply.destroy();

  res.json({ success: true, message: "Reply deleted" });
});

module.exports = {
  createDiscussion,
  getDiscussions,
  createReply,
  markReplyHelpful,
  resolveDiscussion,
  deleteDiscussion,
  deleteReply,
};
