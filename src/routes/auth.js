const express = require("express");
const { login, register, getMe } = require("../controllers/authController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", authMiddleware, getMe);

module.exports = router;
