const { Op } = require("sequelize");
const bcryptjs = require("bcryptjs");
const {
  User,
  InstructorProfile,
  Enrollment,
  Course,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");

const serializeUser = (user) => ({
  id: user.user_id,
  email: user.email,
  full_name: user.full_name,
  phone: user.phone,
  avatar_url: user.avatar_url,
  role: user.role,
  status: user.status,
  last_login: user.last_login,
  instructor_profile: user.instructorProfile
    ? {
        profile_id: user.instructorProfile.profile_id,
        bio: user.instructorProfile.bio,
        education: user.instructorProfile.education,
        experience: user.instructorProfile.experience,
        certificates: user.instructorProfile.certificates,
        approval_status: user.instructorProfile.approval_status,
      }
    : null,
});

const listUsers = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  if (req.query.role) {
    where.role = req.query.role;
  }
  if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.keyword) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${req.query.keyword}%` } },
      { full_name: { [Op.iLike]: `%${req.query.keyword}%` } },
    ];
  }

  const result = await User.findAndCountAll({
    where,
    include: [{ model: InstructorProfile, as: "instructorProfile" }],
    limit,
    offset,
    order: [["created_at", "DESC"]],
  });

  res.json({
    success: true,
    data: result.rows.map(serializeUser),
    meta: {
      total: result.count,
      page,
      limit,
      total_pages: Math.ceil(result.count / limit),
    },
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.params.id, {
    include: [{ model: InstructorProfile, as: "instructorProfile" }],
  });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const canView =
    req.user.role === "support_admin" ||
    req.user.role === "system_admin" ||
    req.user.id === user.user_id;
  if (!canView) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.json({ success: true, data: serializeUser(user) });
});

const updateUser = asyncHandler(async (req, res) => {
  const allowed = ["full_name", "phone", "avatar_url", "status"];
  const payload = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      payload[field] = req.body[field];
    }
  });

  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const canEdit =
    req.user.role === "support_admin" ||
    req.user.role === "system_admin" ||
    req.user.id === user.user_id;
  if (!canEdit) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await user.update(payload);
  res.json({ success: true, data: serializeUser(user) });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  const VALID_ROLES = ["student", "instructor", "support_admin", "system_admin"];
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  user.role = role;
  await user.save();
  res.json({ success: true, data: serializeUser(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!new_password) {
    return res
      .status(400)
      .json({ success: false, message: "New password required" });
  }

  const user = await User.findByPk(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const isSelf = req.user.role === "system_admin" || req.user.id === user.user_id;
  if (!isSelf && req.user.role !== "support_admin") {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (req.user.id === user.user_id && user.password_hash) {
    const match = await bcryptjs.compare(current_password || "", user.password_hash);
    if (!match) {
      return res
        .status(400)
        .json({ success: false, message: "Current password invalid" });
    }
  }

  user.password_hash = new_password;
  await user.save();

  res.json({ success: true, message: "Password updated" });
});

const getUserCourses = asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (
    req.user.role === "student" &&
    req.user.id !== userId
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (user.role === "instructor") {
    const courses = await Course.findAll({
      where: { instructor_id: userId },
      order: [["created_at", "DESC"]],
    });
    return res.json({
      success: true,
      data: courses,
    });
  }

  const enrollments = await Enrollment.findAll({
    where: { student_id: userId },
    include: [{ model: Course, as: "course" }],
    order: [["enrolled_at", "DESC"]],
  });

  res.json({
    success: true,
    data: enrollments,
  });
});

module.exports = {
  listUsers,
  getUser,
  updateUser,
  updateUserRole,
  changePassword,
  getUserCourses,
};
