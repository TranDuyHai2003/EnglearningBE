const express = require("express");
const {
  createProfile,
  updateProfile,
  listProfiles,
  reviewProfile,
  getInstructorCourses,
  getMyProfile,
} = require("../controllers/instructorController");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles, minRole } = require("../middleware/roles");

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

module.exports = router;
