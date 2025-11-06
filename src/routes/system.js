const express = require("express");
const { healthCheck, metrics } = require("../controllers/systemController");
const { authMiddleware } = require("../middleware/auth");
const { minRole } = require("../middleware/roles");

const router = express.Router();

router.get("/healthz", healthCheck);
router.get("/metrics", authMiddleware, minRole("support_admin"), metrics);

module.exports = router;
