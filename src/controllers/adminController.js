const {
  User,
  Course,
  InstructorProfile,
  Enrollment,
  Transaction,
  SystemSetting,
  SupportTicket,
  SupportReply,
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
    totalEnrollments,
    totalRevenue,
  ] = await Promise.all([
    User.count(),
    Course.count(),
    Course.count({ where: { approval_status: "pending" } }),
    InstructorProfile.count({ where: { approval_status: "pending" } }),
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
    return res.status(404).json({ success: false, message: "Setting not found" });
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
    include: [{ model: SupportReply, as: "replies" }],
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
    return res.status(404).json({ success: false, message: "Ticket not found" });
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
    return res.status(404).json({ success: false, message: "Ticket not found" });
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
};
