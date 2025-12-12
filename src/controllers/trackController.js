const asyncHandler = require("../utils/asyncHandler");
const { slugify } = require("../utils/slugify");
const {
  Track,
  TrackLesson,
  TrackEnrollment,
  Lesson,
  Course,
  Section,
  User,
} = require("../models");

const normalizeSkillFocus = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const listTracks = asyncHandler(async (req, res) => {
  const tracks = await Track.findAll({
    include: [
      {
        model: Course,
        as: "courses",
      },
      {
        model: TrackLesson,
        as: "trackLessons",
        include: [
          {
            model: Lesson,
            as: "lesson",
            include: [{ model: Section, as: "section" }],
          },
        ],
        order: [["display_order", "ASC"]],
      },
    ],
    order: [["created_at", "DESC"]],
  });

  res.json({ success: true, data: tracks });
});

const getTrack = asyncHandler(async (req, res) => {
  const track = await Track.findByPk(req.params.trackId, {
    include: [
      { model: Course, as: "courses" },
      {
        model: TrackLesson,
        as: "trackLessons",
        include: [{ model: Lesson, as: "lesson" }],
        order: [["display_order", "ASC"]],
      },
    ],
  });

  if (!track) {
    return res
      .status(404)
      .json({ success: false, message: "Track not found" });
  }

  res.json({ success: true, data: track });
});

const createTrack = asyncHandler(async (req, res) => {
  const track = await Track.create({
    name: req.body.name,
    slug: req.body.slug || slugify(req.body.name),
    description: req.body.description,
    cefr_path: req.body.cefr_path,
    prerequisites: req.body.prerequisites,
  });

  res.status(201).json({ success: true, data: track });
});

const updateTrack = asyncHandler(async (req, res) => {
  const track = await Track.findByPk(req.params.trackId);
  if (!track) {
    return res
      .status(404)
      .json({ success: false, message: "Track not found" });
  }

  await track.update({
    name: req.body.name ?? track.name,
    slug: req.body.slug || slugify(req.body.name || track.name),
    description: req.body.description ?? track.description,
    cefr_path: req.body.cefr_path ?? track.cefr_path,
    prerequisites: req.body.prerequisites ?? track.prerequisites,
  });

  res.json({ success: true, data: track });
});

const upsertTrackLessons = asyncHandler(async (req, res) => {
  const track = await Track.findByPk(req.params.trackId);
  if (!track) {
    return res
      .status(404)
      .json({ success: false, message: "Track not found" });
  }

  if (!Array.isArray(req.body.lessons) || !req.body.lessons.length) {
    return res.status(400).json({
      success: false,
      message: "lessons array is required",
    });
  }

  await TrackLesson.destroy({
    where: { track_id: track.track_id },
  });

  const records = req.body.lessons.map((lesson, index) => ({
    track_id: track.track_id,
    lesson_id: lesson.lesson_id,
    display_order:
      lesson.display_order !== undefined ? lesson.display_order : index + 1,
    prerequisite_lesson_id: lesson.prerequisite_lesson_id,
    gating_rule: lesson.gating_rule,
  }));

  await TrackLesson.bulkCreate(records, {
    ignoreDuplicates: true,
  });

  const updatedSteps = await TrackLesson.findAll({
    where: { track_id: track.track_id },
    include: [{ model: Lesson, as: "lesson" }],
    order: [["display_order", "ASC"]],
  });

  res.json({ success: true, data: updatedSteps });
});

const getTrackLessons = asyncHandler(async (req, res) => {
  const track = await Track.findByPk(req.params.trackId);
  if (!track) {
    return res
      .status(404)
      .json({ success: false, message: "Track not found" });
  }

  const lessons = await TrackLesson.findAll({
    where: { track_id: track.track_id },
    include: [
      {
        model: Lesson,
        as: "lesson",
        include: [{ model: Section, as: "section" }],
      },
    ],
    order: [["display_order", "ASC"]],
  });

  res.json({ success: true, data: { track, lessons } });
});

const enrollTrack = asyncHandler(async (req, res) => {
  const track = await Track.findByPk(req.params.trackId, {
    include: [
      {
        model: TrackLesson,
        as: "trackLessons",
        include: [{ model: Lesson, as: "lesson" }],
        order: [["display_order", "ASC"]],
      },
    ],
  });

  if (!track) {
    return res
      .status(404)
      .json({ success: false, message: "Track not found" });
  }

  const [enrollment] = await TrackEnrollment.findOrCreate({
    where: { track_id: track.track_id, student_id: req.user.id },
    defaults: {
      status: "active",
      current_position: 0,
      progress_percent: 0,
      unlocked_lesson_id:
        track.trackLessons?.length > 0
          ? track.trackLessons[0].lesson_id
          : null,
    },
  });

  res.status(201).json({ success: true, data: enrollment });
});

const listMyTrackEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await TrackEnrollment.findAll({
    where: { student_id: req.user.id },
    include: [
      {
        model: Track,
        as: "track",
      },
    ],
  });

  res.json({ success: true, data: enrollments });
});

module.exports = {
  listTracks,
  getTrack,
  createTrack,
  updateTrack,
  upsertTrackLessons,
  getTrackLessons,
  enrollTrack,
  listMyTrackEnrollments,
};
