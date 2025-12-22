const { Lesson, Section, Course, Enrollment } = require("../../models");
const env = require("../../config/env");

const ADMIN_ROLES = new Set(["system_admin", "support_admin"]);

const getLessonWithAccessCheck = async ({ userId, role, lessonId }) => {
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
    const error = new Error("Lesson not found");
    error.status = 404;
    throw error;
  }

  if (!lesson.video_key) {
    const error = new Error("Lesson is missing video data");
    error.status = 404;
    throw error;
  }

  const bucket = lesson.video_bucket || env.S3_VIDEO_BUCKET;
  if (!bucket) {
    const error = new Error("Video bucket is not configured");
    error.status = 500;
    throw error;
  }

  const course = lesson.section.course;
  const isAdmin = ADMIN_ROLES.has(role);
  const isInstructor = role === "instructor" && course?.instructor_id === userId;

  let hasAccess = isAdmin || isInstructor;

  if (!hasAccess && lesson.allow_preview) {
    hasAccess = true;
  }

  if (!hasAccess) {
    const enrollment = await Enrollment.findOne({
      where: { student_id: userId, course_id: course.course_id },
    });
    hasAccess = Boolean(enrollment);
  }

  if (!hasAccess) {
    const error = new Error("You do not have access to this lesson");
    error.status = 403;
    throw error;
  }

  return {
    lessonId: lesson.lesson_id,
    courseId: course.course_id,
    bucket,
    objectKey: lesson.video_key,
    mimeType: lesson.video_mime_type || "video/webm",
    sizeBytes: lesson.video_size_bytes || null,
  };
};

module.exports = {
  getLessonWithAccessCheck,
};
