const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { minRole } = require("../middleware/roles");
const {
  dashboardSummary,
  listSettings,
  upsertSetting,
  deleteSetting,
  listSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  replySupportTicket,
  getActionItems,
  getMetricsTimeseries,
  getPendingCourses,
  getPendingLessons,
  approveCourse,
  rejectCourse,
  approveLesson,
  rejectLesson,
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard/summary", minRole("support_admin"), dashboardSummary);
router.get("/action-items", minRole("support_admin"), getActionItems);
router.get(
  "/metrics/timeseries",
  minRole("support_admin"),
  getMetricsTimeseries
);
router.get(
  "/dashboard/metrics",
  minRole("support_admin"),
  getMetricsTimeseries
);

router.get("/approvals/courses", minRole("support_admin"), getPendingCourses);
router.get("/approvals/lessons", minRole("support_admin"), getPendingLessons);
router.post(
  "/approvals/courses/:id/approve",
  minRole("support_admin"),
  approveCourse
);
router.post(
  "/approvals/courses/:id/reject",
  minRole("support_admin"),
  rejectCourse
);
router.post(
  "/approvals/lessons/:id/approve",
  minRole("support_admin"),
  approveLesson
);
router.post(
  "/approvals/lessons/:id/reject",
  minRole("support_admin"),
  rejectLesson
);

router.get("/settings", minRole("support_admin"), listSettings);
router.post("/settings", minRole("support_admin"), upsertSetting);
router.put("/settings/:key", minRole("support_admin"), upsertSetting);
router.delete("/settings/:key", minRole("support_admin"), deleteSetting);

router.get("/support/tickets", listSupportTickets);
router.post("/support/tickets", createSupportTicket);
router.patch(
  "/support/tickets/:id",
  minRole("support_admin"),
  updateSupportTicket
);
router.post("/support/tickets/:id/replies", replySupportTicket);

module.exports = router;
