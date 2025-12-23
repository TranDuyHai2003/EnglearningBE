const express = require("express");
const { authMiddlewareWithQuery } = require("../../middleware/auth");
const { streamLessonVideoController } = require("./videos.controller");

const router = express.Router();

router.use(authMiddlewareWithQuery);
router.get("/:lessonId/stream", streamLessonVideoController);

module.exports = router;
