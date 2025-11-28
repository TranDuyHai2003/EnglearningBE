const express = require("express");
const router = express.Router();
const {
  createCheckoutSession,
  handleWebhook,
  getSessionStatus,
  getTransactions,
  requestRefund,
  resumePayment,
  cancelTransaction,
} = require("../controllers/paymentController");
const { authMiddleware } = require("../middleware/auth");

// Webhook route - NO auth middleware, uses raw body
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

const { allowRoles } = require("../middleware/roles");

// Protected routes
router.post("/create-checkout", authMiddleware, createCheckoutSession);
router.get("/session/:sessionId", authMiddleware, getSessionStatus);
router.get("/transactions", authMiddleware, getTransactions);
router.post(
  "/transactions/:id/resume",
  authMiddleware,
  allowRoles("student"),
  resumePayment
);

router.post(
  "/transactions/:id/cancel",
  authMiddleware,
  allowRoles("student"),
  cancelTransaction
);

router.post(
  "/transactions/:id/refund",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  requestRefund
);

module.exports = router;
