const express = require("express");
const { authMiddleware, optionalAuth } = require("../middleware/auth");
const { allowRoles, minRole } = require("../middleware/roles");
const {
  listCourses,
  createCourse,
  updateCourse,
  getCourse,
  changeCourseStatus,
  deleteCourse,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  addLessonResource,
  deleteLessonResource,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTags,
  createTag,
  updateTag,
  deleteTag,
} = require("../controllers/courseController");

const router = express.Router();

// =================================================================
// PUBLIC ROUTES - CÁC ROUTE CÔNG KHAI, KHÔNG CẦN ĐĂNG NHẬP
// =================================================================

// Lấy danh sách danh mục và tag để hiển thị cho tất cả người dùng
router.get("/meta/categories", listCategories);
router.get("/meta/tags", listTags);

// Lấy danh sách các khóa học (ví dụ: cho trang khám phá khóa học)
router.get("/", listCourses);

// Lấy thông tin chi tiết của một khóa học
router.get("/:id", optionalAuth, getCourse);

// =================================================================
// PROTECTED ROUTES - CÁC ROUTE CẦN XÁC THỰC VÀ PHÂN QUYỀN
// =================================================================

// --- Quản lý Danh mục & Tag (yêu cầu quyền admin) ---
router.post(
  "/meta/categories",
  authMiddleware,
  minRole("support_admin"),
  createCategory
);
router.patch(
  "/meta/categories/:id",
  authMiddleware,
  minRole("support_admin"),
  updateCategory
);
router.delete(
  "/meta/categories/:id",
  authMiddleware,
  minRole("support_admin"),
  deleteCategory
);

router.post("/meta/tags", authMiddleware, minRole("support_admin"), createTag);
router.patch(
  "/meta/tags/:id",
  authMiddleware,
  minRole("support_admin"),
  updateTag
);
router.delete(
  "/meta/tags/:id",
  authMiddleware,
  minRole("support_admin"),
  deleteTag
);

// --- Quản lý Khóa học (yêu cầu quyền instructor hoặc admin) ---
router.post(
  "/",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  createCourse
);
router.patch(
  "/:id",
  authMiddleware,
  allowRoles("instructor", "support_admin", "system_admin"),
  updateCourse
);
router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles("instructor", "support_admin", "system_admin"),
  changeCourseStatus
);
router.delete(
  "/:id",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  deleteCourse
);

// --- Quản lý Chương học (Section) ---
router.post(
  "/:courseId/sections",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  createSection
);
router.patch(
  "/:courseId/sections/:sectionId",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  updateSection
);
router.delete(
  "/:courseId/sections/:sectionId",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  deleteSection
);

// --- Quản lý Bài học (Lesson) ---
router.post(
  "/sections/:sectionId/lessons",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  createLesson
);
router.patch(
  "/sections/:sectionId/lessons/:lessonId",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  updateLesson
);
router.delete(
  "/sections/:sectionId/lessons/:lessonId",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  deleteLesson
);

// --- Quản lý Tài nguyên Bài học (Resource) ---
router.post(
  "/lessons/:lessonId/resources",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  addLessonResource
);
router.delete(
  "/lessons/:lessonId/resources/:resourceId",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  deleteLessonResource
);

module.exports = router;
