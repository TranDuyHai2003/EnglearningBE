const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const {
  listPackages,
  buyPackage,
  getMyCredit,
  listCurriculum,
  getScheduleForTopic,
  bookSlot
} = require("../controllers/speakingController");

// Packages & Credits
router.get("/packages", listPackages);
router.post("/buy", authMiddleware, buyPackage);
router.get("/credit", authMiddleware, getMyCredit);

// Curriculum
router.get("/curriculum", listCurriculum);

// Booking
router.get("/schedule", authMiddleware, getScheduleForTopic);
router.post("/book", authMiddleware, bookSlot);

// Instructor
const { getInstructorSchedule } = require("../controllers/speakingController");
router.get("/instructor/schedule", authMiddleware, getInstructorSchedule);


// Admin
const { createPackage, createTopic } = require("../controllers/speakingController");
router.post("/packages", authMiddleware, createPackage);
router.post("/topics", authMiddleware, createTopic);

module.exports = router;

