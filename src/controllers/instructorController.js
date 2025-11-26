// src/controllers/instructorController.js
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
  Notification,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const getMyProfile = asyncHandler(async (req, res) => {
  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["full_name", "email", "avatar_url", "phone"],
      },
    ],
  });

  // Trả về null data thay vì 404 để FE dễ xử lý logic (người dùng chưa tạo hồ sơ)
  if (!profile) {
    return res.json({ success: true, data: null });
  }

  res.json({ success: true, data: profile });
});

const createProfile = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Kiểm tra nếu đã có hồ sơ
  const existing = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: "Bạn đã có hồ sơ. Vui lòng sử dụng chức năng cập nhật.",
    });
  }

  const profile = await InstructorProfile.create({
    user_id: req.user.id,
    bio: req.body.bio,
    education: req.body.education,
    experience: req.body.experience,
    certificates: req.body.certificates,
    cv_url: req.body.cv_url, // Link nhanh hoặc đường dẫn file upload sau
    intro_video_url: req.body.intro_video_url,
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

  // Logic bảo mật: Nếu đã Approved thì KHÔNG cho phép user tự ý sửa CV/Video qua API updateProfile này
  const isApproved = profile.approval_status === "approved";

  await profile.update({
    bio: req.body.bio ?? profile.bio,
    education: req.body.education ?? profile.education,
    experience: req.body.experience ?? profile.experience,
    certificates: req.body.certificates ?? profile.certificates,

    // CV & Video: Nếu đã duyệt -> Giữ nguyên. Nếu chưa -> Cho phép sửa.
    cv_url: isApproved ? profile.cv_url : req.body.cv_url ?? profile.cv_url,
    intro_video_url: isApproved
      ? profile.intro_video_url
      : req.body.intro_video_url ?? profile.intro_video_url,

    // Status: Nếu đã duyệt -> Giữ nguyên. Nếu chưa (vd rejected) -> Reset về Pending để duyệt lại.
    approval_status: isApproved ? "approved" : "pending",
    rejection_reason: isApproved ? profile.rejection_reason : null,
  });

  res.json({ success: true, data: profile });
});

const listProfiles = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  // Hỗ trợ filter theo status (pending, interviewing, approved...)
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

// === HÀM REVIEW ĐÃ CẬP NHẬT ===
const reviewProfile = asyncHandler(async (req, res) => {
  const { status, reason, interview_notes, interview_date } = req.body;

  // 1. Validate status
  if (!["approved", "rejected", "interviewing", "pending"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const profile = await InstructorProfile.findByPk(req.params.id);
  if (!profile) {
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  }

  // 2. Cập nhật thông tin Profile
  await profile.update({
    approval_status: status,
    approved_by: status === "approved" ? req.user.id : null,
    approved_at: status === "approved" ? new Date() : null,
    rejection_reason: status === "rejected" ? reason : null,
    interview_notes: interview_notes ?? profile.interview_notes,
    interview_date: interview_date ?? profile.interview_date,
  });

  // 3. Đảm bảo Role User là Instructor (nếu chưa phải)
  // Chúng ta KHÔNG hạ role về student nữa, giữ role instructor để họ truy cập được /instructor/profile
  if (status === "approved") {
    const user = await User.findByPk(profile.user_id);
    if (user && user.role === "student") {
      user.role = "instructor";
      await user.save();
    }
  }

  // Send notification
  let notifTitle = "";
  let notifContent = "";
  if (status === "approved") {
    notifTitle = "Hồ sơ giảng viên được duyệt";
    notifContent = "Chúc mừng! Hồ sơ giảng viên của bạn đã được duyệt. Bạn có thể bắt đầu tạo khóa học.";
  } else if (status === "rejected") {
    notifTitle = "Hồ sơ giảng viên bị từ chối";
    notifContent = `Hồ sơ của bạn bị từ chối. Lý do: ${reason}`;
  } else if (status === "interviewing") {
    notifTitle = "Mời phỏng vấn";
    notifContent = `Bạn có lịch phỏng vấn vào ${interview_date || "sớm nhất"}. Ghi chú: ${interview_notes}`;
  }

  if (notifTitle) {
    await Notification.create({
      user_id: profile.user_id,
      type: "system",
      title: notifTitle,
      content: notifContent,
      is_read: false,
    });
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

// --- DASHBOARD APIS ---
const getDashboardSummary = asyncHandler(async (req, res) => {
  const instructorId = req.user.id;

  // Lấy danh sách khóa học của giảng viên
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

  // Query thống kê song song
  const [stats, pendingQuestionsResult, revenueOverTime, enrollmentsOverTime] =
    await Promise.all([
      // Tổng Enroll, Revenue, Rating
      sequelize.query(
        `SELECT 
            (SELECT COUNT(*) FROM enrollments WHERE course_id IN (:courseIds)) AS "totalEnrollments", 
            (SELECT SUM(td.final_price) FROM transaction_details td JOIN transactions t ON td.transaction_id = t.transaction_id WHERE td.course_id IN (:courseIds) AND t.status = 'completed') AS "totalRevenue", 
            (SELECT AVG(r.rating) FROM reviews r WHERE r.course_id IN (:courseIds) AND r.status = 'approved') AS "averageRating"`,
        {
          replacements: { courseIds },
          type: sequelize.QueryTypes.SELECT,
          plain: true,
        }
      ),
      // Đếm câu hỏi chưa trả lời
      sequelize.query(
        `SELECT COUNT(d.discussion_id) as count FROM qa_discussions d 
         JOIN lessons l ON d.lesson_id = l.lesson_id 
         JOIN sections s ON l.section_id = s.section_id 
         WHERE s.course_id IN (:courseIds) 
         AND NOT EXISTS (SELECT 1 FROM qa_replies r WHERE r.discussion_id = d.discussion_id)`,
        {
          replacements: { courseIds },
          type: sequelize.QueryTypes.SELECT,
          plain: true,
        }
      ),
      // Revenue Over Time
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
      // Enrollments Over Time
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

// --- FILE UPLOAD HANDLERS ---
const uploadInstructorCV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (!profile) {
    fs.unlinkSync(req.file.path); // Xóa file rác
    return res.status(404).json({
      success: false,
      message: "Instructor profile not found. Please create a profile first.",
    });
  }

  // Xóa file cũ nếu tồn tại
  if (profile.cv_url) {
    const oldCVPath = path.join(__dirname, "../../", profile.cv_url);
    if (fs.existsSync(oldCVPath)) {
      try {
        fs.unlinkSync(oldCVPath);
      } catch (err) {
        console.error("Failed to delete old CV:", err);
      }
    }
  }

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
    return res
      .status(400)
      .json({ success: false, message: "No files uploaded" });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (!profile) {
    req.files.forEach((file) => fs.unlinkSync(file.path));
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  }

  const certificateFiles = req.files.map((file) => ({
    url: `/uploads/certificates/${file.filename}`,
    file_name: file.originalname,
    file_size: file.size,
    uploaded_at: new Date(),
  }));

  const existingCertificates = profile.certificate_files || [];
  const updatedCertificates = [...existingCertificates, ...certificateFiles];

  await profile.update({ certificate_files: updatedCertificates });

  res.json({
    success: true,
    message: "Uploaded successfully",
    data: {
      uploaded_certificates: certificateFiles,
      total_certificates: updatedCertificates.length,
    },
  });
});

const deleteInstructorCertificate = asyncHandler(async (req, res) => {
  const { certificateUrl } = req.body;
  if (!certificateUrl) {
    return res
      .status(400)
      .json({ success: false, message: "Certificate URL required" });
  }

  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });

  if (!profile) {
    return res
      .status(404)
      .json({ success: false, message: "Profile not found" });
  }

  const existingCertificates = profile.certificate_files || [];
  const updatedCertificates = existingCertificates.filter(
    (cert) => cert.url !== certificateUrl
  );

  if (existingCertificates.length === updatedCertificates.length) {
    return res
      .status(404)
      .json({ success: false, message: "Certificate not found" });
  }

  // Xóa file vật lý
  const filePath = path.join(__dirname, "../../", certificateUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await profile.update({ certificate_files: updatedCertificates });

  res.json({
    success: true,
    message: "Deleted successfully",
    data: { remaining_certificates: updatedCertificates.length },
  });
});

const getProfileById = asyncHandler(async (req, res) => {
  const profile = await InstructorProfile.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["full_name", "email", "avatar_url", "phone"],
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
