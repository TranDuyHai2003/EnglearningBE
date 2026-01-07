const path = require("path");
const { createReadStream } = require("fs");
const fs = require("fs/promises");
const asyncHandler = require("../utils/asyncHandler");
const env = require("../config/env");
const { slugify } = require("../utils/slugify");
const { uploadObject, getPresignedUrl, getFileStream } = require("../store/s3");
const { Lesson, Section, Course, Enrollment } = require("../models");

const uploadLectureVideo = asyncHandler(async (req, res) => {
  const lessonId = req.body.lessonId || req.body.lesson_id;

  if (!lessonId) {
    return res
      .status(400)
      .json({ success: false, message: "lessonId is required" });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const lesson = await Lesson.findByPk(lessonId, {
    include: [
      {
        model: Section,
        as: "section",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  if (!lesson || !lesson.section || !lesson.section.course) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }

  const course = lesson.section.course;
  const isAdmin = ["system_admin", "support_admin"].includes(req.user.role);
  const isOwner = req.user.id === course.instructor_id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to upload to this lesson",
    });
  }

  const bucket = env.S3_VIDEO_BUCKET;
  const extension = path.extname(req.file.originalname || "").toLowerCase();
  const baseName = path
    .basename(req.file.originalname || "lecture", extension)
    .trim();
  const safeName = slugify(baseName) || "lecture";
  const key = `courses/${course.course_id}/lessons/${lesson.lesson_id}/${Date.now()}-${safeName}${extension}`;

  const cleanupTempFile = async () => {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  };

  console.log(`[Storage] Uploading file: ${req.file.originalname}, Size: ${req.file.size}, Path: ${req.file.path}`);

  const fileBody =
    req.file.buffer || (req.file.path && createReadStream(req.file.path));

  try {
    await uploadObject({
      bucket,
      key,
      body: fileBody,
      contentType: req.file.mimetype,
      contentLength: req.file.size,
    });
  } catch (error) {
    await cleanupTempFile();
    console.error("Upload to S3 failed:", error);
    const status = error?.$metadata?.httpStatusCode === 403 ? 502 : 500;
    return res.status(status).json({
      success: false,
      message:
        "Không thể tải video lên kho lưu trữ. Vui lòng kiểm tra cấu hình SeaweedFS S3 (AccessKey/SecretKey, bucket, endpoint).",
      detail: error?.message,
    });
  }

  await cleanupTempFile();

  await lesson.update({
    video_bucket: bucket,
    video_key: key,
    video_url: key,
    video_uploaded_at: new Date(),
    video_mime_type: req.file.mimetype || "video/webm",
    video_size_bytes: req.file.size || null,
  });

  res.status(201).json({
    success: true,
    data: {
      lesson_id: lesson.lesson_id,
      bucket,
      key,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_at: lesson.video_uploaded_at,
    },
  });
});


const uploadLessonDocument = asyncHandler(async (req, res) => {
  const lessonId = req.body.lessonId || req.body.lesson_id;

  if (!lessonId) {
    return res.status(400).json({ success: false, message: "lessonId is required" });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const lesson = await Lesson.findByPk(lessonId, {
    include: [
      {
        model: Section,
        as: "section",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  if (!lesson || !lesson.section || !lesson.section.course) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }

  const course = lesson.section.course;
  const isAdmin = ["system_admin", "support_admin"].includes(req.user.role);
  const isOwner = req.user.id === course.instructor_id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to upload to this lesson",
    });
  }

  const bucket = env.S3_VIDEO_BUCKET; // Using same bucket for now, or define S3_DOC_BUCKET
  const extension = path.extname(req.file.originalname || "").toLowerCase();
  const baseName = path.basename(req.file.originalname || "document", extension).trim();
  const safeName = slugify(baseName) || "document";
  const key = `courses/${course.course_id}/lessons/${lesson.lesson_id}/docs/${Date.now()}-${safeName}${extension}`;

  const cleanupTempFile = async () => {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  };

  const fileBody = req.file.buffer || (req.file.path && createReadStream(req.file.path));

  try {
    await uploadObject({
      bucket,
      key,
      body: fileBody,
      contentType: req.file.mimetype,
      contentLength: req.file.size,
    });
  } catch (error) {
    await cleanupTempFile();
    console.error("Upload document to S3 failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
      detail: error?.message,
    });
  }

  await cleanupTempFile();

  await lesson.update({
    document_bucket: bucket,
    document_key: key,
    document_url: key,
    document_uploaded_at: new Date(),
    document_mime_type: req.file.mimetype || "application/pdf",
    document_size_bytes: req.file.size || null,
  });

  res.status(201).json({
    success: true,
    data: {
      lesson_id: lesson.lesson_id,
      bucket,
      key,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_at: lesson.document_uploaded_at,
    },
  });
});

const uploadCourseThumbnail = asyncHandler(async (req, res) => {
  const courseId = req.body.courseId || req.body.course_id;

  if (!courseId) {
    return res
      .status(400)
      .json({ success: false, message: "courseId is required" });
  }

  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No file uploaded" });
  }

  const course = await Course.findByPk(courseId);

  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  const isAdmin = ["system_admin", "support_admin"].includes(req.user.role);
  const isOwner = req.user.id === course.instructor_id;

  if (!isAdmin && !isOwner) {
    return res.status(403).json({
      success: false,
      message: "You are not allowed to upload to this course",
    });
  }

  const bucket = env.S3_VIDEO_BUCKET;
  const extension = path.extname(req.file.originalname || "").toLowerCase();
  const baseName = path
    .basename(req.file.originalname || "thumbnail", extension)
    .trim();
  const safeName = slugify(baseName) || "thumbnail";
  const key = `courses/${course.course_id}/thumbnails/${Date.now()}-${safeName}${extension}`;

  const cleanupTempFile = async () => {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
  };

  const fileBody =
    req.file.buffer || (req.file.path && createReadStream(req.file.path));

  try {
    await uploadObject({
      bucket,
      key,
      body: fileBody,
      contentType: req.file.mimetype,
      contentLength: req.file.size,
    });
  } catch (error) {
    await cleanupTempFile();
    console.error("Upload thumbnail to S3 failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload thumbnail",
      detail: error?.message,
    });
  }

  await cleanupTempFile();

  const thumbnailUrl = key;
  
  await course.update({
    thumbnail_url: thumbnailUrl,
  });

  res.status(201).json({
    success: true,
    data: {
      course_id: course.course_id,
      thumbnail_url: thumbnailUrl,
      bucket,
      key,
    },
  });
});

const getLecturePlaybackUrl = asyncHandler(async (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res
      .status(400)
      .json({ success: false, message: "Object key is required" });
  }

  const lesson = await Lesson.findOne({
    where: { video_key: key },
    include: [
      {
        model: Section,
        as: "section",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  if (!lesson || !lesson.section || !lesson.section.course) {
    return res
      .status(404)
      .json({ success: false, message: "Lecture not found" });
  }

  const course = lesson.section.course;
  const bucket = lesson.video_bucket || env.S3_VIDEO_BUCKET;
  if (!lesson.video_key || !bucket) {
    return res
      .status(400)
      .json({ success: false, message: "Lecture is missing video data" });
  }

  const isAdmin = ["system_admin", "support_admin"].includes(req.user.role);
  const isInstructor =
    req.user.role === "instructor" && req.user.id === course.instructor_id;

  let canView = isAdmin || isInstructor;

  if (!canView && lesson.allow_preview) {
    canView = true;
  }

  if (!canView) {
    const enrollment = await Enrollment.findOne({
      where: {
        student_id: req.user.id,
        course_id: course.course_id,
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this lecture",
      });
    }
  }

  const url = await getPresignedUrl({
    bucket,
    key: lesson.video_key,
    expiresIn: env.S3_SIGNED_URL_TTL,
  });

  res.json({
    success: true,
    data: {
      url,
      expires_in: env.S3_SIGNED_URL_TTL,
      lesson_id: lesson.lesson_id,
    },
  });
});

const serveCourseThumbnail = asyncHandler(async (req, res) => {
  const { courseId, filename } = req.params;
  // Construct key based on how we saved it: courses/:id/thumbnails/:filename
  const key = `courses/${courseId}/thumbnails/${filename}`;
  const bucket = env.S3_VIDEO_BUCKET;

  try {
    const fileStreamResponse = await getFileStream({ bucket, key });
    
    if (fileStreamResponse.ContentType) {
      res.setHeader("Content-Type", fileStreamResponse.ContentType);
    }
    // Cache for 1 year
    res.setHeader("Cache-Control", "public, max-age=31536000"); 

    // fileStreamResponse.Body is a Node.js Readable stream
    fileStreamResponse.Body.pipe(res);
  } catch (error) {
    // Check if file not found
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ success: false, message: "Thumbnail not found" });
    }
    console.error("Error serving thumbnail:", error);
    res.status(500).json({ success: false, message: "Failed to serve thumbnail" });
  }
});

const getLessonDocumentUrl = asyncHandler(async (req, res) => { // Line 397
  const { lessonId } = req.query;
  console.log(`[getLessonDocumentUrl] Request for lessonId: ${lessonId}`);

  if (!lessonId) {
    return res.status(400).json({ success: false, message: "lessonId is required" });
  }

  const lesson = await Lesson.findByPk(lessonId, {
    include: [
      {
        model: Section,
        as: "section",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });

  if (!lesson) {
      console.log(`[getLessonDocumentUrl] Lesson ${lessonId} not found in DB`);
      return res.status(404).json({ success: false, message: "Lesson not found" });
  }
  
  if (!lesson.section || !lesson.section.course) {
    console.log(`[getLessonDocumentUrl] Lesson ${lessonId} missing section or course relations`);
    return res.status(404).json({ success: false, message: "Lesson data incomplete (missing section/course)" });
  }

  const course = lesson.section.course;
  const bucket = lesson.document_bucket || env.S3_VIDEO_BUCKET;

  console.log(`[getLessonDocumentUrl] Found lesson ${lessonId}, document_key: ${lesson.document_key}`);

  if (!lesson.document_key) {
    console.warn(`[getLessonDocumentUrl] Lesson ${lessonId} has no document_key`);
    return res.status(404).json({ success: false, message: "No document found for this lesson" });
  }

  const isAdmin = ["system_admin", "support_admin"].includes(req.user.role);
  const isOwner = req.user.id === course.instructor_id;
  let canView = isAdmin || isOwner;

  if (!canView) {
    const enrollment = await Enrollment.findOne({
      where: {
        student_id: req.user.id,
        course_id: course.course_id,
      },
    });

    if (enrollment) {
      canView = true;
    }
  }

  if (!canView) {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this document",
    });
  }

  const url = await getPresignedUrl({
    bucket,
    key: lesson.document_key,
    expiresIn: env.S3_SIGNED_URL_TTL,
  });

  res.json({
    success: true,
    data: {
      url,
      expires_in: env.S3_SIGNED_URL_TTL,
      lesson_id: lesson.lesson_id,
    },
  });
});

module.exports = {
  uploadLectureVideo,
  uploadCourseThumbnail,
  getLecturePlaybackUrl,
  uploadLessonDocument,
  serveCourseThumbnail,
  getLessonDocumentUrl,
};
