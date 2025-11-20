const { sequelize } = require("../config/database");
const {
  InstructorProfile,
  User,
  Course,
  Enrollment,
  TransactionDetail,
  Transaction,
  Review,
  QaDiscussion,
  QaReply,
  Lesson,
  Section,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const getMyProfile = asyncHandler(async (req, res) => {
  // req.user.id được lấy từ token đã được authMiddleware giải mã
  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
    include: [{ model: User, as: "user", attributes: ["full_name", "email"] }],
  });

  if (!profile) {
    // Trả về 404 nếu không tìm thấy, đúng với mong đợi của frontend
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found for the current user.",
    });
  }

  res.json({ success: true, data: profile });
});

// src/controllers/instructorController.js

const createProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  if (user.role === "instructor") {
    const existingApprovedProfile = await InstructorProfile.findOne({
      where: { user_id: req.user.id, approval_status: "approved" },
    });
    if (existingApprovedProfile) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã là một giảng viên đã được phê duyệt.",
      });
    }
  }
  const existing = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "Bạn đã có hồ sơ. Vui lòng cập nhật." });
  }
  const profile = await InstructorProfile.create({
    user_id: req.user.id,
    ...req.body,
    approval_status: "pending",
  });
  res.status(201).json({ success: true, data: profile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });
  if (!profile) {
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  }
  await profile.update({
    ...req.body,
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
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
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
  const courses = await Course.findAll({
    where: { instructor_id: parseInt(req.params.id, 10) },
    order: [["created_at", "DESC"]],
  });
  res.json({ success: true, data: courses });
});

// ==========================================================
// === CÁC HÀM DASHBOARD ĐÃ SỬA LỖI ===
// ==========================================================

const getDashboardSummary = asyncHandler(async (req, res) => {
  const instructorId = req.user.id;
  const courseIds = (
    await Course.findAll({
      where: { instructor_id: instructorId },
      attributes: ["course_id"],
      raw: true,
    })
  ).map((c) => c.course_id);
  if (courseIds.length === 0) {
    return res.json({
      success: true,
      data: {
        total_students: 0,
        total_revenue: 0,
        average_rating: 0,
        pending_questions_count: 0,
        total_courses: 0,
        total_enrollments: 0,
        revenue_over_time: [],
        enrollments_over_time: [],
      },
    });
  }
  const [stats, pendingQuestionsResult, revenueOverTime, enrollmentsOverTime] =
    await Promise.all([
      sequelize.query(
        `SELECT (SELECT COUNT(*) FROM enrollments WHERE course_id IN (:courseIds)) AS "totalEnrollments", (SELECT SUM(td.final_price) FROM transaction_details td JOIN transactions t ON td.transaction_id = t.transaction_id WHERE td.course_id IN (:courseIds) AND t.status = 'completed') AS "totalRevenue", (SELECT AVG(r.rating) FROM reviews r WHERE r.course_id IN (:courseIds) AND r.status = 'approved') AS "averageRating"`,
        {
          replacements: { courseIds },
          type: sequelize.QueryTypes.SELECT,
          plain: true,
        }
      ),
      sequelize.query(
        `SELECT COUNT(d.discussion_id) FROM qa_discussions d JOIN lessons l ON d.lesson_id = l.lesson_id JOIN sections s ON l.section_id = s.section_id WHERE s.course_id IN (:courseIds) AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.discussion_id = d.discussion_id)`,
        {
          replacements: { courseIds },
          type: sequelize.QueryTypes.SELECT,
          plain: true,
        }
      ),
      TransactionDetail.findAll({
        attributes: [
          [
            sequelize.fn(
              "date_trunc",
              "month",
              sequelize.col("transaction.created_at")
            ),
            "month",
          ],
          [sequelize.fn("SUM", sequelize.col("final_price")), "revenue"],
        ],
        include: [
          {
            model: Transaction,
            as: "transaction",
            where: { status: "completed" },
            attributes: [],
          },
        ],
        where: { course_id: courseIds },
        group: [
          sequelize.fn(
            "date_trunc",
            "month",
            sequelize.col("transaction.created_at")
          ),
        ],
        order: [
          [
            sequelize.fn(
              "date_trunc",
              "month",
              sequelize.col("transaction.created_at")
            ),
            "ASC",
          ],
        ],
        raw: true,
      }),
      Enrollment.findAll({
        attributes: [
          [
            sequelize.fn("date_trunc", "month", sequelize.col("enrolled_at")),
            "month",
          ],
          [
            sequelize.fn("COUNT", sequelize.col("enrollment_id")),
            "enrollments",
          ],
        ],
        where: { course_id: courseIds },
        group: [
          sequelize.fn("date_trunc", "month", sequelize.col("enrolled_at")),
        ],
        order: [
          [
            sequelize.fn("date_trunc", "month", sequelize.col("enrolled_at")),
            "ASC",
          ],
        ],
        raw: true,
      }),
    ]);
  res.json({
    success: true,
    data: {
      total_students: Number(stats.totalEnrollments) || 0,
      total_revenue: Number(stats.totalRevenue) || 0,
      average_rating: parseFloat(stats.averageRating) || 0,
      pending_questions_count: Number(pendingQuestionsResult.count) || 0,
      total_courses: courseIds.length,
      total_enrollments: Number(stats.totalEnrollments) || 0,
      revenue_over_time: revenueOverTime,
      enrollments_over_time: enrollmentsOverTime,
    },
  });
});

const getActionItems = asyncHandler(async (req, res) => {
  const instructorId = req.user.id;
  const courseIds = (
    await Course.findAll({
      where: { instructor_id: instructorId },
      attributes: ["course_id"],
      raw: true,
    })
  ).map((c) => c.course_id);
  if (courseIds.length === 0) {
    return res.json({
      success: true,
      data: { pending_questions: [], recent_reviews: [] },
    });
  }
  const [pendingQuestions, recentReviews] = await Promise.all([
    QaDiscussion.findAll({
      where: {
        [Op.and]: [
          // Op.and yêu cầu import Op
          sequelize.literal(
            `"lesson->section"."course_id" IN (${courseIds.join(",")})`
          ),
          sequelize.literal(
            `NOT EXISTS (SELECT 1 FROM qa_replies WHERE qa_replies.discussion_id = "QaDiscussion".discussion_id)`
          ),
        ],
      },
      include: [
        {
          model: Lesson,
          as: "lesson",
          attributes: ["title"],
          required: true,
          include: [
            {
              model: Section,
              as: "section",
              attributes: [],
              required: true,
              include: [
                {
                  model: Course,
                  as: "course",
                  attributes: ["course_id", "title"],
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: "student",
          attributes: ["user_id", "full_name", "avatar_url"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
    }),
    Review.findAll({
      where: { course_id: courseIds },
      include: [
        { model: Course, as: "course", attributes: ["course_id", "title"] },
        {
          model: User,
          as: "student",
          attributes: ["user_id", "full_name", "avatar_url"],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
    }),
  ]);
  res.json({
    success: true,
    data: {
      pending_questions: pendingQuestions,
      recent_reviews: recentReviews,
    },
  });
});

const uploadInstructorCV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (!profile) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found. Please create a profile first.",
    });
  }

  // Delete old CV if exists
  if (profile.cv_url) {
    const oldCVPath = path.join(__dirname, "../../", profile.cv_url);
    if (fs.existsSync(oldCVPath)) {
      fs.unlinkSync(oldCVPath);
    }
  }

  // Update profile with new CV information
  const cvUrl = `/uploads/cvs/${req.file.filename}`;
  await profile.update({
    cv_url: cvUrl,
    cv_file_name: req.file.originalname,
    cv_uploaded_at: new Date(),
  });

  res.json({
    success: true,
    message: "CV uploaded successfully",
    data: {
      cv_url: cvUrl,
      cv_file_name: req.file.originalname,
      cv_uploaded_at: profile.cv_uploaded_at,
      file_size: req.file.size,
    },
  });
});

const uploadInstructorCertificates = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded",
    });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (!profile) {
    // Delete uploaded files if profile not found
    req.files.forEach((file) => fs.unlinkSync(file.path));
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found. Please create a profile first.",
    });
  }

  // Process uploaded certificate files
  const certificateFiles = req.files.map((file) => ({
    url: `/uploads/certificates/${file.filename}`,
    file_name: file.originalname,
    file_size: file.size,
    uploaded_at: new Date(),
  }));

  // Get existing certificates and append new ones
  const existingCertificates = profile.certificate_files || [];
  const updatedCertificates = [...existingCertificates, ...certificateFiles];

  await profile.update({
    certificate_files: updatedCertificates,
  });

  res.json({
    success: true,
    message: `${req.files.length} certificate(s) uploaded successfully`,
    data: {
      uploaded_certificates: certificateFiles,
      total_certificates: updatedCertificates.length,
    },
  });
});

const deleteInstructorCertificate = asyncHandler(async (req, res) => {
  const { certificateUrl } = req.body;

  if (!certificateUrl) {
    return res.status(400).json({
      success: false,
      message: "Certificate URL is required",
    });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found",
    });
  }

  const existingCertificates = profile.certificate_files || [];
  const updatedCertificates = existingCertificates.filter(
    (cert) => cert.url !== certificateUrl
  );

  if (existingCertificates.length === updatedCertificates.length) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found",
    });
  }

  // Delete the file from filesystem
  const filePath = path.join(__dirname, "../../", certificateUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await profile.update({
    certificate_files: updatedCertificates,
  });

  res.json({
    success: true,
    message: "Certificate deleted successfully",
    data: {
      remaining_certificates: updatedCertificates.length,
    },
  });
});

const getProfileById = asyncHandler(async (req, res) => {
  const profile = await InstructorProfile.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["full_name", "email", "avatar_url"],
      },
    ],
  });

  if (!profile) {
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  }

  res.json({ success: true, data: profile });
});

module.exports = {
  createProfile,
  updateProfile,
  listProfiles,
  reviewProfile,
  getInstructorCourses,
  getMyProfile,
  getDashboardSummary,
  getActionItems,
  uploadInstructorCV,
  uploadInstructorCertificates,
  deleteInstructorCertificate,
  getProfileById,
};
