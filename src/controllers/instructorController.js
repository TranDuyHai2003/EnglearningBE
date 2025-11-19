const {
  InstructorProfile,
  User,
  Course,
  Enrollment,
  TransactionDetail,
  Transaction,
  Review,
  QaDiscussion,
  sequelize,
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
  // === Bổ sung logic kiểm tra ===
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Nếu user đã là instructor (được duyệt), không cho tạo lại profile
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
  // === Kết thúc bổ sung ===

  const existing = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });
  if (existing) {
    return res
      .status(400)
      .json({ success: false, message: "Bạn đã có hồ sơ. Vui lòng cập nhật." }); // Sửa lại message cho rõ ràng
  }

  const profile = await InstructorProfile.create({
    user_id: req.user.id,
    bio: req.body.bio,
    education: req.body.education,
    experience: req.body.experience,
    certificates: req.body.certificates,
    approval_status: "pending", // Trạng thái mặc định khi tạo là 'pending'
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
  const instructorId = parseInt(req.params.id, 10);
  const courses = await Course.findAll({
    where: { instructor_id: instructorId },
    order: [["created_at", "DESC"]],
  });
  res.json({ success: true, data: courses });
});

const getDashboardSummary = asyncHandler(async (req, res) => {
  const instructorId = req.user.id;

  const instructorCourses = await Course.findAll({
    where: { instructor_id: instructorId },
    attributes: ["course_id", "total_students", "average_rating"],
  });

  const courseIds = instructorCourses.map((c) => c.course_id);

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

  const [
    totalEnrollments,
    totalRevenue,
    pendingQuestions,
    revenueOverTime,
    enrollmentsOverTime,
  ] = await Promise.all([
    Enrollment.count({
      where: { course_id: { [Op.in]: courseIds } },
    }),
    TransactionDetail.sum("final_price", {
      where: { course_id: { [Op.in]: courseIds } },
      include: [
        {
          model: Transaction,
          as: "transaction",
          where: { status: "completed" },
          attributes: [],
        },
      ],
    }),
    QaDiscussion.count({
      where: {
        course_id: { [Op.in]: courseIds },
        parent_discussion_id: null,
        is_instructor_reply: false,
      },
      include: [
        {
          model: QaDiscussion,
          as: "replies",
          required: false,
        },
      ],
      having: sequelize.literal(
        '(SELECT COUNT(*) FROM "qa_discussions" AS "reply" WHERE "reply"."parent_discussion_id" = "QaDiscussion"."discussion_id" AND "reply"."is_instructor_reply" = true) = 0'
      ),
    }),
    sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('month', t.payment_at), 'YYYY-MM') as month,
        SUM(td.final_price) as revenue
      FROM transactions t
      JOIN transaction_details td ON t.transaction_id = td.transaction_id
      WHERE t.status = 'completed'
        AND td.course_id IN (:courseIds)
        AND t.payment_at IS NOT NULL
        AND t.payment_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', t.payment_at)
      ORDER BY month ASC
    `,
      {
        replacements: { courseIds },
        type: sequelize.QueryTypes.SELECT,
      }
    ),
    sequelize.query(
      `
      SELECT
        TO_CHAR(DATE_TRUNC('month', enrolled_at), 'YYYY-MM') as month,
        COUNT(*) as enrollments
      FROM enrollments
      WHERE course_id IN (:courseIds)
        AND enrolled_at >= NOW() - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', enrolled_at)
      ORDER BY month ASC
    `,
      {
        replacements: { courseIds },
        type: sequelize.QueryTypes.SELECT,
      }
    ),
  ]);

  const totalStudents = instructorCourses.reduce(
    (sum, course) => sum + Number(course.total_students || 0),
    0
  );

  const averageRating =
    instructorCourses.reduce(
      (sum, course) => sum + Number(course.average_rating || 0),
      0
    ) / instructorCourses.length;

  res.json({
    success: true,
    data: {
      total_students: totalStudents,
      total_revenue: Number(totalRevenue || 0),
      average_rating: Number(averageRating.toFixed(2)),
      pending_questions_count: pendingQuestions,
      total_courses: instructorCourses.length,
      total_enrollments: totalEnrollments,
      revenue_over_time: revenueOverTime.map((item) => ({
        month: item.month,
        revenue: Number(item.revenue),
      })),
      enrollments_over_time: enrollmentsOverTime.map((item) => ({
        month: item.month,
        enrollments: Number(item.enrollments),
      })),
    },
  });
});

const getActionItems = asyncHandler(async (req, res) => {
  const instructorId = req.user.id;

  const instructorCourses = await Course.findAll({
    where: { instructor_id: instructorId },
    attributes: ["course_id"],
  });

  const courseIds = instructorCourses.map((c) => c.course_id);

  if (courseIds.length === 0) {
    return res.json({
      success: true,
      data: {
        pending_questions: [],
        recent_reviews: [],
      },
    });
  }

  const [pendingQuestions, recentReviews] = await Promise.all([
    QaDiscussion.findAll({
      where: {
        course_id: { [Op.in]: courseIds },
        parent_discussion_id: null,
        is_instructor_reply: false,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["user_id", "full_name", "avatar_url"],
        },
        {
          model: Course,
          as: "course",
          attributes: ["course_id", "title"],
        },
        {
          model: QaDiscussion,
          as: "replies",
          required: false,
          where: { is_instructor_reply: true },
        },
      ],
      order: [["created_at", "DESC"]],
      limit: 5,
      having: sequelize.literal(
        '(SELECT COUNT(*) FROM "qa_discussions" AS "reply" WHERE "reply"."parent_discussion_id" = "QaDiscussion"."discussion_id" AND "reply"."is_instructor_reply" = true) = 0'
      ),
    }),
    Review.findAll({
      where: {
        course_id: { [Op.in]: courseIds },
        status: "approved",
      },
      include: [
        {
          model: User,
          as: "student",
          attributes: ["user_id", "full_name", "avatar_url"],
        },
        {
          model: Course,
          as: "course",
          attributes: ["course_id", "title"],
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
      message: "No file uploaded"
    });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id }
  });

  if (!profile) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found. Please create a profile first."
    });
  }

  // Delete old CV if exists
  if (profile.cv_url) {
    const oldCVPath = path.join(__dirname, '../../', profile.cv_url);
    if (fs.existsSync(oldCVPath)) {
      fs.unlinkSync(oldCVPath);
    }
  }

  // Update profile with new CV information
  const cvUrl = `/uploads/cvs/${req.file.filename}`;
  await profile.update({
    cv_url: cvUrl,
    cv_file_name: req.file.originalname,
    cv_uploaded_at: new Date()
  });

  res.json({
    success: true,
    message: "CV uploaded successfully",
    data: {
      cv_url: cvUrl,
      cv_file_name: req.file.originalname,
      cv_uploaded_at: profile.cv_uploaded_at,
      file_size: req.file.size
    }
  });
});

const uploadInstructorCertificates = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No files uploaded"
    });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id }
  });

  if (!profile) {
    // Delete uploaded files if profile not found
    req.files.forEach(file => fs.unlinkSync(file.path));
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found. Please create a profile first."
    });
  }

  // Process uploaded certificate files
  const certificateFiles = req.files.map(file => ({
    url: `/uploads/certificates/${file.filename}`,
    file_name: file.originalname,
    file_size: file.size,
    uploaded_at: new Date()
  }));

  // Get existing certificates and append new ones
  const existingCertificates = profile.certificate_files || [];
  const updatedCertificates = [...existingCertificates, ...certificateFiles];

  await profile.update({
    certificate_files: updatedCertificates
  });

  res.json({
    success: true,
    message: `${req.files.length} certificate(s) uploaded successfully`,
    data: {
      uploaded_certificates: certificateFiles,
      total_certificates: updatedCertificates.length
    }
  });
});

const deleteInstructorCertificate = asyncHandler(async (req, res) => {
  const { certificateUrl } = req.body;

  if (!certificateUrl) {
    return res.status(400).json({
      success: false,
      message: "Certificate URL is required"
    });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id }
  });

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found"
    });
  }

  const existingCertificates = profile.certificate_files || [];
  const updatedCertificates = existingCertificates.filter(
    cert => cert.url !== certificateUrl
  );

  if (existingCertificates.length === updatedCertificates.length) {
    return res.status(404).json({
      success: false,
      message: "Certificate not found"
    });
  }

  // Delete the file from filesystem
  const filePath = path.join(__dirname, '../../', certificateUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await profile.update({
    certificate_files: updatedCertificates
  });

  res.json({
    success: true,
    message: "Certificate deleted successfully",
    data: {
      remaining_certificates: updatedCertificates.length
    }
  });
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
};
