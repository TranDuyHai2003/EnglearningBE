const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles, minRole } = require("../middleware/roles");
const {
  addToCart,
  listTransactions,
  checkout,
  requestRefund,
  webhook,
} = require("../controllers/paymentController");

const router = express.Router();

router.use(authMiddleware);

router.post(
  "/cart",
  allowRoles("student", "system_admin"),
  addToCart
);
router.get("/transactions", listTransactions);
router.post(
  "/checkout",
  allowRoles("student", "system_admin"),
  checkout
);
router.post(
  "/transactions/:id/refund",
  allowRoles("student", "support_admin", "system_admin"),
  requestRefund
);
router.post("/webhook", minRole("support_admin"), webhook);

module.exports = router;
