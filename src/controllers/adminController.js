const {
  User,
  Course,
  InstructorProfile,
  Enrollment,
  Transaction,
  SystemSetting,
  SupportTicket,
  SupportReply,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");

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

module.exports = {
  dashboardSummary,
  listSettings,
  upsertSetting,
  deleteSetting,
  listSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  replySupportTicket,
};
