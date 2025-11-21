// src/routes/instructors.js
const express = require("express");
const {
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
} = require("../controllers/instructorController");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles, minRole } = require("../middleware/roles");
const { uploadCV, uploadCertificate } = require("../middleware/upload");
const { InstructorProfile } = require("../models");

const router = express.Router();

// Middleware nội bộ check Approved (nếu chưa có file riêng)
const requireApproved = async (req, res, next) => {
  if (req.user.role.includes("admin")) return next();
  const profile = await InstructorProfile.findOne({
    where: { user_id: req.user.id },
  });
  if (profile && profile.approval_status === "approved") return next();
  return res
    .status(403)
    .json({ success: false, message: "Account not approved yet" });
};

router.use(authMiddleware);

// 1. Nhóm API quản lý Profile (Ai cũng gọi được để xem/sửa hồ sơ của mình)
router.get(
  "/profiles/my-profile",
  allowRoles("instructor", "student"), // Cho phép cả student xem nếu họ lỡ đk nhầm
  getMyProfile
);
router.post("/profiles", allowRoles("student", "instructor"), createProfile);
router.patch("/profiles", allowRoles("student", "instructor"), updateProfile);

// 2. Nhóm API Upload (Cho phép upload kể cả khi chưa approved để nộp hồ sơ)
router.post(
  "/upload-cv",
  allowRoles("instructor", "student"),
  uploadCV,
  uploadInstructorCV
);
// Upload Certificate cũng vậy, cần upload để nộp hồ sơ
router.post(
  "/upload-certificates",
  allowRoles("instructor", "student"),
  uploadCertificate,
  uploadInstructorCertificates
);
router.delete(
  "/delete-certificate",
  allowRoles("instructor", "student"),
  deleteInstructorCertificate
);

// 3. Nhóm API Admin (Duyệt/Xem danh sách)
router.get("/profiles", minRole("support_admin"), listProfiles);
router.patch("/profiles/:id/review", minRole("support_admin"), reviewProfile);
router.get("/profiles/:id", minRole("support_admin"), getProfileById);

// 4. Nhóm API Dashboard & Khóa học (CHỈ DÀNH CHO APPROVED INSTRUCTOR)
// Áp dụng requireApproved để chặn người đang phỏng vấn gọi trộm API
router.get(
  "/dashboard/summary",
  allowRoles("instructor", "system_admin"),
  requireApproved, // <--- CHẶN Ở ĐÂY
  getDashboardSummary
);
router.get(
  "/dashboard/action-items",
  allowRoles("instructor", "system_admin"),
  requireApproved, // <--- CHẶN Ở ĐÂY
  getActionItems
);

// API Public (Ai cũng xem được danh sách khóa học của 1 GV)
router.get("/:id/courses", getInstructorCourses);

module.exports = router;
