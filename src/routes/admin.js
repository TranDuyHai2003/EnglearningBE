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
} = require("../controllers/adminController");

const router = express.Router();

router.use(authMiddleware);

router.get("/dashboard/summary", minRole("support_admin"), dashboardSummary);

router.get("/settings", minRole("support_admin"), listSettings);
router.post("/settings", minRole("support_admin"), upsertSetting);
router.put("/settings/:key", minRole("support_admin"), upsertSetting);
router.delete("/settings/:key", minRole("support_admin"), deleteSetting);

router.get("/support/tickets", listSupportTickets);
router.post("/support/tickets", createSupportTicket);
router.patch("/support/tickets/:id", minRole("support_admin"), updateSupportTicket);
router.post("/support/tickets/:id/replies", replySupportTicket);

module.exports = router;
