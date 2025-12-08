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
  reorderSections,
} = require("../controllers/courseController");

const router = express.Router();

router.get("/meta/categories", listCategories);
router.get("/meta/tags", listTags);

router.get("/", listCourses);

router.get("/:id", optionalAuth, getCourse);

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

router.patch(
  "/:id/sections/reorder",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  reorderSections
);

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
