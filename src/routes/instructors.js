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

const router = express.Router();

router.use(authMiddleware);
router.get(
  "/profiles/my-profile",
  allowRoles("instructor", "student"),
  getMyProfile
);
router.post("/profiles", allowRoles("student", "instructor"), createProfile);
router.patch("/profiles", allowRoles("student", "instructor"), updateProfile);
router.get("/profiles", minRole("support_admin"), listProfiles);
router.patch("/profiles/:id/review", minRole("support_admin"), reviewProfile);
router.get("/:id/courses", getInstructorCourses);

// Instructor Dashboard APIs
router.get(
  "/dashboard/summary",
  allowRoles("instructor", "system_admin"),
  getDashboardSummary
);
router.get(
  "/dashboard/action-items",
  allowRoles("instructor", "system_admin"),
  getActionItems
);

// File upload routes for instructors
router.post(
  "/upload-cv",
  allowRoles("instructor", "student"),
  uploadCV,
  uploadInstructorCV
);
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

router.get("/profiles/:id", minRole("support_admin"), getProfileById);

module.exports = router;
