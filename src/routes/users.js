const express = require("express");
const {
  listUsers,
  getUser,
  updateUser,
  updateUserRole,
  changePassword,
  getUserCourses,
  uploadAvatar,
  uploadCV,
} = require("../controllers/userController");
const { authMiddleware } = require("../middleware/auth");
const { minRole } = require("../middleware/roles");
const { uploadAvatar: uploadAvatarMiddleware, uploadCV: uploadCVMiddleware } = require("../middleware/upload");

const router = express.Router();

router.use(authMiddleware);

router.get("/", minRole("support_admin"), listUsers);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.patch("/:id/role", minRole("support_admin"), updateUserRole);
router.patch("/:id/password", changePassword);
router.get("/:id/courses", getUserCourses);

// File upload routes
router.post("/:id/upload-avatar", uploadAvatarMiddleware, uploadAvatar);
router.post("/:id/upload-cv", uploadCVMiddleware, uploadCV);

module.exports = router;
