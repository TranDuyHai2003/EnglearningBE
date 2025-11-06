const {
  InstructorProfile,
  User,
  Course,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");

const createProfile = asyncHandler(async (req, res) => {
  const existing = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "Profile already exists" });
  }

  const profile = await InstructorProfile.create({
    user_id: req.user.id,
    bio: req.body.bio,
    education: req.body.education,
    experience: req.body.experience,
    certificates: req.body.certificates,
    approval_status: "pending",
  });

  res.status(201).json({ success: true, data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });
  if (!profile) {
    return res.status(404).json({ success: false, message: "Profile not found" });
  }

  await profile.update({
    bio: req.body.bio ?? profile.bio,
    education: req.body.education ?? profile.education,
    experience: req.body.experience ?? profile.experience,
    certificates: req.body.certificates ?? profile.certificates,
    approval_status: "pending",
    rejection_reason: null,
  });

  res.json({ success: true, data: profile });
});

const listProfiles = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};
  if (req.query.status) {
    where.approval_status = req.query.status;
  }

  const result = await InstructorProfile.findAndCountAll({
    where,
    include: [{ model: User, as: "user" }],
    limit,
    offset,
    order: [["profile_id", "DESC"]],
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

const reviewProfile = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const profile = await InstructorProfile.findByPk(req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, message: "Profile not found" });
  }

  await profile.update({
    approval_status: status,
    approved_by: req.user.id,
    approved_at: status === "approved" ? new Date() : null,
    rejection_reason: status === "rejected" ? reason : null,
  });

  const user = await User.findByPk(profile.user_id);
  if (status === "approved" && user.role === "student") {
    user.role = "instructor";
    await user.save();
  }

  res.json({ success: true, data: profile });
});

const getInstructorCourses = asyncHandler(async (req, res) => {
  const instructorId = parseInt(req.params.id, 10);
  const courses = await Course.findAll({
    where: { instructor_id: instructorId },
    order: [["created_at", "DESC"]],
  });
  res.json({ success: true, data: courses });
});

module.exports = {
  createProfile,
  updateProfile,
  listProfiles,
  reviewProfile,
  getInstructorCourses,
};
