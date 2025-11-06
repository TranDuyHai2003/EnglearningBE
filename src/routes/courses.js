const express = require("express");
const { authMiddleware } = require("../middleware/auth");
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

router.use(authMiddleware);

router.get("/meta/categories", listCategories);
router.post("/meta/categories", minRole("support_admin"), createCategory);
router.patch("/meta/categories/:id", minRole("support_admin"), updateCategory);
router.delete("/meta/categories/:id", minRole("support_admin"), deleteCategory);

router.get("/meta/tags", listTags);
router.post("/meta/tags", minRole("support_admin"), createTag);
router.patch("/meta/tags/:id", minRole("support_admin"), updateTag);
router.delete("/meta/tags/:id", minRole("support_admin"), deleteTag);

router.get("/", listCourses);
router.post("/", allowRoles("instructor", "system_admin"), createCourse);
router.get("/:id", getCourse);
router.patch(
  "/:id",
  allowRoles("instructor", "support_admin", "system_admin"),
  updateCourse
);
router.patch(
  "/:id/status",
  allowRoles("instructor", "support_admin", "system_admin"),
  changeCourseStatus
);
router.delete("/:id", allowRoles("instructor", "system_admin"), deleteCourse);

router.post("/:courseId/sections", allowRoles("instructor", "system_admin"), createSection);
router.patch(
  "/:courseId/sections/:sectionId",
  allowRoles("instructor", "system_admin"),
  updateSection
);
router.delete(
  "/:courseId/sections/:sectionId",
  allowRoles("instructor", "system_admin"),
  deleteSection
);

router.post(
  "/sections/:sectionId/lessons",
  allowRoles("instructor", "system_admin"),
  createLesson
);
router.patch(
  "/sections/:sectionId/lessons/:lessonId",
  allowRoles("instructor", "system_admin"),
  updateLesson
);
router.delete(
  "/sections/:sectionId/lessons/:lessonId",
  allowRoles("instructor", "system_admin"),
  deleteLesson
);

router.post(
  "/lessons/:lessonId/resources",
  allowRoles("instructor", "system_admin"),
  addLessonResource
);
router.delete(
  "/lessons/:lessonId/resources/:resourceId",
  allowRoles("instructor", "system_admin"),
  deleteLessonResource
);

module.exports = router;
