const express = require("express");
const router = express.Router();
const {
  reportContent,
  getReports,
  updateReport,
  deleteReportedContent,
} = require("../controllers/moderationController");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

// Public report endpoint
router.post("/reports", authMiddleware, reportContent);

// Admin-only endpoints
router.get(
  "/admin/reports",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  getReports
);
router.patch(
  "/admin/reports/:reportId",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  updateReport
);
router.delete(
  "/admin/content/:type/:id",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  deleteReportedContent
);

module.exports = router;
