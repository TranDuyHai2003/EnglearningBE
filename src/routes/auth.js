const express = require("express");
const { login, register, getMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", authMiddleware, getMe);

// Forgot & Reset Password
router.post("/forgot-password", require("../controllers/authController").forgotPassword);
router.post("/reset-password", require("../controllers/authController").resetPassword);

module.exports = router;
