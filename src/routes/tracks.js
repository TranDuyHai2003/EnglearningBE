const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  listTracks,
  getTrack,
  createTrack,
  updateTrack,
  upsertTrackLessons,
  getTrackLessons,
  enrollTrack,
  listMyTrackEnrollments,
} = require("../controllers/trackController");

router.get("/", listTracks);
router.get("/me/enrollments", authMiddleware, listMyTrackEnrollments);
router.get("/:trackId", getTrack);
router.get("/:trackId/lessons", getTrackLessons);

router.post(
  "/",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  createTrack
);

router.put(
  "/:trackId",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  updateTrack
);

router.post(
  "/:trackId/lessons",
  authMiddleware,
  allowRoles("system_admin", "support_admin"),
  upsertTrackLessons
);

router.post(
  "/:trackId/enroll",
  authMiddleware,
  allowRoles("student", "instructor", "system_admin"),
  enrollTrack
);

module.exports = router;
