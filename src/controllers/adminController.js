const {
  User,
  Course,
  InstructorProfile,
  Lesson,
  Section,
  Enrollment,
  Transaction,
  SystemSetting,
  SupportTicket,
  SupportReply,
  Notification,
  sequelize,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");
const { Op } = require("sequelize");

const dashboardSummary = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalCourses,
    pendingCourses,
    pendingInstructors,
    interviewingInstructors,
    totalEnrollments,
    totalRevenue,
  ] = await Promise.all([
    User.count(),
    Course.count(),
    Course.count({ where: { approval_status: "pending" } }),
    InstructorProfile.count({ where: { approval_status: "pending" } }),
    InstructorProfile.count({ where: { approval_status: "interviewing" } }),
    Enrollment.count(),
    Transaction.sum("final_amount", { where: { status: "completed" } }),
  ]);

  res.json({
    success: true,
    data: {
      total_users: totalUsers,
      total_courses: totalCourses,
      pending_courses: pendingCourses,
      pending_instructors: pendingInstructors,
      interviewing_instructors: interviewingInstructors,
      total_enrollments: totalEnrollments,
      total_revenue: Number(totalRevenue || 0),
    },
  });
});

const listSettings = asyncHandler(async (req, res) => {
  const settings = await SystemSetting.findAll({
    order: [["setting_key", "ASC"]],
  });
  res.json({ success: true, data: settings });
});

const upsertSetting = asyncHandler(async (req, res) => {
  const { key, value, description } = req.body;
  if (!key) {
    return res.status(400).json({ success: false, message: "key required" });
  }

  const [setting] = await SystemSetting.upsert(
    {
      setting_key: key,
      setting_value: value,
      description,
    },
    { returning: true }
  );

  res.status(201).json({ success: true, data: setting });
});

const deleteSetting = asyncHandler(async (req, res) => {
  const setting = await SystemSetting.findOne({
    where: { setting_key: req.params.key },
  });
  if (!setting) {
    return res
      .status(404)
      .json({ success: false, message: "Setting not found" });
  }

  await setting.destroy();
  res.json({ success: true, message: "Setting removed" });
});

const listSupportTickets = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  if (req.user.role === "student" || req.user.role === "instructor") {
    where.user_id = req.user.id;
  } else if (req.query.status) {
    where.status = req.query.status;
  }

  const result = await SupportTicket.findAndCountAll({
    where,
    include: [
      { model: SupportReply, as: "replies" },
      {
        model: User,
        as: "user",
        attributes: ["user_id", "full_name", "email", "avatar_url"],
      },
    ],
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

const createSupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.create({
    user_id: req.user.id,
    category: req.body.category,
    subject: req.body.subject,
    description: req.body.description,
    priority: req.body.priority,
  });

  res.status(201).json({ success: true, data: ticket });
});

const updateSupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id);
  if (!ticket) {
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });
  }

  const canUpdate =
    req.user.role === "system_admin" ||
    req.user.role === "support_admin" ||
    ticket.user_id === req.user.id;
  if (!canUpdate) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await ticket.update({
    status: req.body.status ?? ticket.status,
    priority: req.body.priority ?? ticket.priority,
    assigned_to: req.body.assigned_to ?? ticket.assigned_to,
    resolved_at:
      req.body.status === "resolved" || req.body.status === "closed"
        ? new Date()
        : ticket.resolved_at,
  });

  res.json({ success: true, data: ticket });
});

const replySupportTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findByPk(req.params.id);
  if (!ticket) {
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });
  }

  const canReply =
    req.user.role === "system_admin" ||
    req.user.role === "support_admin" ||
    ticket.user_id === req.user.id;
  if (!canReply) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const reply = await SupportReply.create({
    ticket_id: ticket.ticket_id,
    user_id: req.user.id,
    reply_text: req.body.reply_text,
  });

  res.status(201).json({ success: true, data: reply });
});

const getSupportTicketDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await SupportTicket.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["user_id", "full_name", "email", "avatar_url"],
      },
      {
        model: SupportReply,
        as: "replies",
        include: [
          {
            model: User,
            as: "user",
            attributes: ["user_id", "full_name", "email", "avatar_url", "role"],
          },
        ],
      },
    ],
    order: [[{ model: SupportReply, as: "replies" }, "created_at", "ASC"]],
  });

  if (!ticket) {
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });
  }

  res.json({ success: true, data: ticket });
});

const getActionItems = asyncHandler(async (req, res) => {
  const [pendingCourses, pendingInstructors] = await Promise.all([
    Course.findAll({
      where: { approval_status: "pending" },
      include: [
        {
          model: User,
          as: "instructor",
          attributes: ["user_id", "full_name", "email", "avatar_url"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
    }),
    InstructorProfile.findAll({
      where: { approval_status: "pending" },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "email", "avatar_url"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
    }),
  ]);

  res.json({
    success: true,
    data: {
      pending_courses: pendingCourses,
      pending_instructors: pendingInstructors,
    },
  });
});

const getMetricsTimeseries = asyncHandler(async (req, res) => {
  const { metric = "revenue", period = "month" } = req.query;

  const allowedMetrics = [
    "revenue",
    "users",
    "enrollments",
    "courses",
    "transactions",
  ];
  const allowedPeriods = ["day", "week", "month"];

  if (!allowedMetrics.includes(metric)) {
    return res.status(400).json({
      success: false,
      message: `Invalid metric. Allowed values: ${allowedMetrics.join(", ")}`,
    });
  }

  if (!allowedPeriods.includes(period)) {
    return res.status(400).json({
      success: false,
      message: `Invalid period. Allowed values: ${allowedPeriods.join(", ")}`,
    });
  }

  const dateFormat = {
    day: "YYYY-MM-DD",
    week: "IYYY-IW",
    month: "YYYY-MM",
  }[period];

  const truncPeriod = {
    day: "day",
    week: "week",
    month: "month",
  }[period];

  const intervalValue = {
    day: "30 days",
    week: "12 weeks",
    month: "12 months",
  }[period];

  let queryResult;

  if (metric === "revenue") {
    queryResult = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC(:truncPeriod, payment_at), :dateFormat) as period,
        SUM(final_amount) as value
      FROM transactions
      WHERE status = 'completed'
        AND payment_at IS NOT NULL
        AND payment_at >= NOW() - INTERVAL :intervalValue
      GROUP BY DATE_TRUNC(:truncPeriod, payment_at)
      ORDER BY period ASC
    `,
      {
        replacements: { truncPeriod, dateFormat, intervalValue },
        type: sequelize.QueryTypes.SELECT,
      }
    );
  } else if (metric === "users") {
    queryResult = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC(:truncPeriod, created_at), :dateFormat) as period,
        COUNT(*) as value
      FROM users
      WHERE created_at >= NOW() - INTERVAL :intervalValue
      GROUP BY DATE_TRUNC(:truncPeriod, created_at)
      ORDER BY period ASC
    `,
      {
        replacements: { truncPeriod, dateFormat, intervalValue },
        type: sequelize.QueryTypes.SELECT,
      }
    );
  } else if (metric === "enrollments") {
    queryResult = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC(:truncPeriod, enrolled_at), :dateFormat) as period,
        COUNT(*) as value
      FROM enrollments
      WHERE enrolled_at >= NOW() - INTERVAL :intervalValue
      GROUP BY DATE_TRUNC(:truncPeriod, enrolled_at)
      ORDER BY period ASC
    `,
      {
        replacements: { truncPeriod, dateFormat, intervalValue },
        type: sequelize.QueryTypes.SELECT,
      }
    );
  } else if (metric === "courses") {
    queryResult = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC(:truncPeriod, created_at), :dateFormat) as period,
        COUNT(*) as value
      FROM courses
      WHERE created_at >= NOW() - INTERVAL :intervalValue
      GROUP BY DATE_TRUNC(:truncPeriod, created_at)
      ORDER BY period ASC
    `,
      {
        replacements: { truncPeriod, dateFormat, intervalValue },
        type: sequelize.QueryTypes.SELECT,
      }
    );
  } else if (metric === "transactions") {
    queryResult = await sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC(:truncPeriod, created_at), :dateFormat) as period,
        COUNT(*) as value
      FROM transactions
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL :intervalValue
      GROUP BY DATE_TRUNC(:truncPeriod, created_at)
      ORDER BY period ASC
    `,
      {
        replacements: { truncPeriod, dateFormat, intervalValue },
        type: sequelize.QueryTypes.SELECT,
      }
    );
  }

  res.json({
    success: true,
    data: {
      metric,
      period,
      timeseries: queryResult.map((item) => ({
        period: item.period,
        value: Number(item.value),
      })),
    },
  });
});

const getPendingCourses = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const courses = await Course.findAndCountAll({
    where: { approval_status: "pending" },
    include: [
      {
        model: User,
        as: "instructor",
        attributes: ["user_id", "full_name", "email", "avatar_url"],
        include: [
          {
            model: InstructorProfile,
            as: "instructorProfile",
            attributes: ["profile_id"],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  res.json({
    success: true,
    data: courses.rows,
    meta: {
      total: courses.count,
      page,
      limit,
      total_pages: Math.ceil(courses.count / limit),
    },
  });
});

const getPendingLessons = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const lessons = await Lesson.findAndCountAll({
    where: { approval_status: "pending" },
    include: [
      {
        model: Section,
        as: "section",
        attributes: ["section_id", "title"],
        include: [
          {
            model: Course,
            as: "course",
            attributes: ["course_id", "title"],
            include: [
              {
                model: User,
                as: "instructor",
                attributes: ["user_id", "full_name"],
              },
            ],
          },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
    limit,
    offset,
  });

  res.json({
    success: true,
    data: lessons.rows,
    meta: {
      total: lessons.count,
      page,
      limit,
      total_pages: Math.ceil(lessons.count / limit),
    },
  });
});

const approveCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  await course.update({
    status: "published",
    approval_status: "approved",
    rejection_reason: null,
    reviewed_by: req.user.id,
    reviewed_at: new Date(),
    published_at: new Date(),
  });

  await Notification.create({
    user_id: course.instructor_id,
    type: "course",
    title: "Khóa học được duyệt",
    content: `Khóa học "${course.title}" của bạn đã được duyệt và xuất bản.`,
    is_read: false,
  });

  res.json({ success: true, message: "Course approved", data: course });
});

const rejectCourse = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    return res
      .status(400)
      .json({ success: false, message: "Rejection reason required" });
  }

  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  await course.update({
    status: "rejected",
    approval_status: "rejected",
    rejection_reason: reason,
    reviewed_by: req.user.id,
    reviewed_at: new Date(),
  });

  await Notification.create({
    user_id: course.instructor_id,
    type: "course",
    title: "Khóa học bị từ chối",
    content: `Khóa học "${course.title}" bị từ chối. Lý do: ${reason}`,
    is_read: false,
  });

  res.json({ success: true, message: "Course rejected", data: course });
});

const approveLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.id);
  if (!lesson) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }

  await lesson.update({
    approval_status: "approved",
    rejection_reason: null,
  });

  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);

  await Notification.create({
    user_id: course.instructor_id,
    type: "system",
    title: "Bài học được duyệt",
    content: `Bài học "${lesson.title}" trong khóa học "${course.title}" đã được duyệt.`,
    is_read: false,
  });

  res.json({ success: true, message: "Lesson approved", data: lesson });
});

const rejectLesson = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    return res
      .status(400)
      .json({ success: false, message: "Rejection reason required" });
  }

  const lesson = await Lesson.findByPk(req.params.id);
  if (!lesson) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }

  await lesson.update({
    approval_status: "rejected",
    rejection_reason: reason,
  });

  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);

  await Notification.create({
    user_id: course.instructor_id,
    type: "system",
    title: "Bài học bị từ chối",
    content: `Bài học "${lesson.title}" trong khóa học "${course.title}" bị từ chối. Lý do: ${reason}`,
    is_read: false,
  });

  res.json({ success: true, message: "Lesson rejected", data: lesson });
});

module.exports = {
  dashboardSummary,
  listSettings,
  upsertSetting,
  deleteSetting,
  listSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  replySupportTicket,
  getActionItems,
  getMetricsTimeseries,
  getPendingCourses,
  getPendingLessons,
  approveCourse,
  rejectCourse,
  approveLesson,
  rejectLesson,
  getSupportTicketDetails,
};
