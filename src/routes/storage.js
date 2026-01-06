const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { authMiddleware } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  uploadLectureVideo,
  uploadCourseThumbnail,
  getLecturePlaybackUrl,
  serveCourseThumbnail,
  uploadLessonDocument,
  getLessonDocumentUrl,
} = require("../controllers/storageController");
const env = require("../config/env");

const router = express.Router();
const tempDir = path.join(__dirname, "../../uploads/tmp");
fs.mkdirSync(tempDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: tempDir,
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const original = file.originalname || "upload";
      const sanitized = original
        .replace(/[^a-zA-Z0-9_.-]/g, "_")
        .replace(/_+/g, "_")
        .trim();
      const finalName = sanitized.length ? sanitized : "upload.webm";
      cb(null, `${timestamp}-${finalName}`);
    },
  }),
  limits: {
    fileSize: env.S3_MAX_UPLOAD_BYTES,
  },
});

router.post(
  "/upload",
  authMiddleware,
  allowRoles("instructor", "support_admin", "system_admin"),
  upload.single("file"),
  uploadLectureVideo
);

router.post(
  "/upload/thumbnail",
  authMiddleware,
  allowRoles("instructor", "support_admin", "system_admin"),
  upload.single("file"),
  uploadCourseThumbnail
);

router.post(
  "/upload/document",
  authMiddleware,
  allowRoles("instructor", "support_admin", "system_admin"),
  upload.single("file"),
  uploadLessonDocument
);

router.get("/lecture/url", authMiddleware, getLecturePlaybackUrl);
router.get("/document/url", authMiddleware, getLessonDocumentUrl);

router.get("/courses/:courseId/thumbnails/:filename", serveCourseThumbnail);

module.exports = router;
