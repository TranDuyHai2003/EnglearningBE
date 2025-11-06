const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  enrollCourse,
  listEnrollments,
  getEnrollment,
  recordLessonProgress,
  getCourseProgress,
  getQuiz,
  upsertQuiz,
  upsertQuestion,
  deleteQuestion,
  startQuizAttempt,
  submitQuizAttempt,
  listQuizAttempts,
} = require("../controllers/learningController");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/enrollments",
  allowRoles("student", "system_admin"),
  enrollCourse
);
router.get("/enrollments", listEnrollments);
router.get("/enrollments/:id", getEnrollment);

router.post(
  "/progress",
  allowRoles("student", "system_admin"),
  recordLessonProgress
);
router.get(
  "/progress/course/:courseId",
  allowRoles("student", "system_admin"),
  getCourseProgress
);

router.get("/quizzes/:quizId", getQuiz);
router.post("/quizzes", allowRoles("instructor", "system_admin"), upsertQuiz);
router.post(
  "/quizzes/:quizId/questions",
  allowRoles("instructor", "system_admin"),
  upsertQuestion
);
router.put(
  "/quizzes/:quizId/questions/:questionId",
  allowRoles("instructor", "system_admin"),
  upsertQuestion
);
router.delete(
  "/quizzes/:quizId/questions/:questionId",
  allowRoles("instructor", "system_admin"),
  deleteQuestion
);

router.post(
  "/quizzes/:quizId/attempts",
  allowRoles("student", "system_admin"),
  startQuizAttempt
);
router.post(
  "/attempts/:attemptId/submit",
  allowRoles("student", "system_admin"),
  submitQuizAttempt
);
router.get("/quizzes/:quizId/attempts", listQuizAttempts);

module.exports = router;
