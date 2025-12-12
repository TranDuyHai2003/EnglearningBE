const asyncHandler = require("../utils/asyncHandler");
const { Op } = require("sequelize");
const { randomUUID } = require("crypto");
const {
  LiveSession,
  SessionRegistration,
  Course,
  User,
} = require("../models");

const buildMeetingLink = (provider = "webrtc") => {
  if (provider === "webrtc") {
    return `${process.env.FRONTEND_URL.replace(/\/$/, "")}/live/${randomUUID()}`;
  }
  return "";
};

const listSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, from, to, instructor_id, course_id } = req.query;
  const where = {};

  if (from || to) {
    where.scheduled_start = {};
    if (from) where.scheduled_start[Op.gte] = new Date(from);
    if (to) where.scheduled_start[Op.lte] = new Date(to);
  }

  if (instructor_id) where.instructor_id = instructor_id;
  if (course_id) where.course_id = course_id;

  const result = await LiveSession.findAndCountAll({
    where,
    include: [
      { model: Course, as: "course" },
      { model: User, as: "instructor", attributes: ["user_id", "full_name"] },
      { model: SessionRegistration, as: "registrations" },
    ],
    order: [["scheduled_start", "ASC"]],
    limit: parseInt(limit),
    offset: (page - 1) * limit,
  });

  res.json({
    success: true,
    data: result.rows,
    meta: {
      total: result.count,
      page: parseInt(page),
      limit: parseInt(limit),
      total_pages: Math.ceil(result.count / limit),
    },
  });
});

const getSession = asyncHandler(async (req, res) => {
  const session = await LiveSession.findByPk(req.params.id, {
    include: [
      { model: Course, as: "course" },
      {
        model: SessionRegistration,
        as: "registrations",
        include: [{ model: User, as: "student", attributes: ["user_id", "full_name"] }],
      },
    ],
  });
  if (!session) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }
  res.json({ success: true, data: session });
});

const createSession = asyncHandler(async (req, res) => {
  if (!["instructor", "system_admin"].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const start = new Date(req.body.scheduled_start);
  const end = new Date(req.body.scheduled_end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid schedule time" });
  }
  if (end <= start) {
    return res.status(400).json({
      success: false,
      message: "scheduled_end must be after scheduled_start",
    });
  }

  const meeting_provider = req.body.meeting_provider || "webrtc";
  const meeting_link = req.body.meeting_link || buildMeetingLink(meeting_provider);

  const session = await LiveSession.create({
    course_id: req.body.course_id,
    instructor_id: req.user.role === "system_admin" ? req.body.instructor_id : req.user.id,
    session_type: req.body.session_type || "group",
    title: req.body.title,
    description: req.body.description,
    scheduled_start: start,
    scheduled_end: end,
    capacity: req.body.capacity || 10,
    meeting_provider,
    meeting_link,
    status: "scheduled",
  });

  res.status(201).json({ success: true, data: session });
});

const updateSession = asyncHandler(async (req, res) => {
  const session = await LiveSession.findByPk(req.params.id);
  if (!session) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== session.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const updates = {
    title: req.body.title ?? session.title,
    description: req.body.description ?? session.description,
    scheduled_start: req.body.scheduled_start
      ? new Date(req.body.scheduled_start)
      : session.scheduled_start,
    scheduled_end: req.body.scheduled_end
      ? new Date(req.body.scheduled_end)
      : session.scheduled_end,
    capacity: req.body.capacity ?? session.capacity,
    meeting_provider: req.body.meeting_provider ?? session.meeting_provider,
    meeting_link: req.body.meeting_link ?? session.meeting_link,
    status: req.body.status ?? session.status,
  };

  await session.update(updates);
  res.json({ success: true, data: session });
});

const cancelSession = asyncHandler(async (req, res) => {
  const session = await LiveSession.findByPk(req.params.id);
  if (!session) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== session.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await session.update({ status: "cancelled" });
  res.json({ success: true, data: session });
});

const registerSession = asyncHandler(async (req, res) => {
  const session = await LiveSession.findByPk(req.params.id, {
    include: [{ model: SessionRegistration, as: "registrations" }],
  });
  if (!session) {
    return res
      .status(404)
      .json({ success: false, message: "Session not found" });
  }
  if (session.status !== "scheduled") {
    return res.status(400).json({
      success: false,
      message: "Session is not open for registration",
    });
  }

  if (session.capacity > 0 && session.registrations.length >= session.capacity) {
    return res
      .status(400)
      .json({ success: false, message: "Session is full" });
  }

  const [registration] = await SessionRegistration.findOrCreate({
    where: {
      session_id: session.session_id,
      student_id: req.user.id,
    },
    defaults: {
      attendance_status: "registered",
    },
  });

  res.status(201).json({ success: true, data: registration });
});

const markAttendance = asyncHandler(async (req, res) => {
  const registration = await SessionRegistration.findByPk(
    req.params.registrationId
  );
  if (!registration) {
    return res
      .status(404)
      .json({ success: false, message: "Registration not found" });
  }

  const session = await LiveSession.findByPk(registration.session_id);
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== session.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await registration.update({
    attendance_status: req.body.attendance_status || "attended",
    joined_at: req.body.joined_at
      ? new Date(req.body.joined_at)
      : registration.joined_at,
    left_at: req.body.left_at
      ? new Date(req.body.left_at)
      : registration.left_at,
  });

  res.json({ success: true, data: registration });
});

module.exports = {
  listSessions,
  getSession,
  createSession,
  updateSession,
  cancelSession,
  registerSession,
  markAttendance,
};
