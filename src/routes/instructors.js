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

router.get(
  "/profiles/my-profile",
  allowRoles("instructor", "student"),
  getMyProfile
);
router.post("/profiles", allowRoles("student", "instructor"), createProfile);
router.patch("/profiles", allowRoles("student", "instructor"), updateProfile);

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

router.get("/profiles", minRole("support_admin"), listProfiles);
router.patch("/profiles/:id/review", minRole("support_admin"), reviewProfile);
router.get("/profiles/:id", minRole("support_admin"), getProfileById);

router.get(
  "/dashboard/summary",
  allowRoles("instructor", "system_admin"),
  requireApproved,
  getDashboardSummary
);
router.get(
  "/dashboard/action-items",
  allowRoles("instructor", "system_admin"),
  requireApproved,
  getActionItems
);

router.get("/:id/courses", getInstructorCourses);

module.exports = router;
