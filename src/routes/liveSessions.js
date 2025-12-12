const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  listSessions,
  getSession,
  createSession,
  updateSession,
  cancelSession,
  registerSession,
  markAttendance,
} = require("../controllers/liveSessionController");

router.get("/", authMiddleware, listSessions);
router.get("/:id", authMiddleware, getSession);

router.post(
  "/",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  createSession
);

router.put(
  "/:id",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  updateSession
);

router.post(
  "/:id/cancel",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  cancelSession
);

router.post("/:id/register", authMiddleware, registerSession);

router.post(
  "/registrations/:registrationId/attendance",
  authMiddleware,
  allowRoles("instructor", "system_admin"),
  markAttendance
);

module.exports = router;
