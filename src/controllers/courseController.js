const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const {
  Course,
  Category,
  CourseTag,
  CourseTagMapping,
  Section,
  Lesson,
  LessonResource,
  User,
  Enrollment,
  Track,
  LessonProgress,
  Quiz,
  QaDiscussion,
  QaReply,
  FlashcardDeck,
  TrackLesson,
  Flashcard,
  QuizAttempt,
  StudentAnswer,
  Question,
  AnswerOption,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");
const { slugify } = require("../utils/slugify");

const parseDateInput = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeSkillFocus = (input, fallback = []) => {
  if (Array.isArray(input)) {
    return input;
  }
  if (typeof input === "string" && input.trim()) {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
};

const courseInclude = [
  {
    model: User,
    as: "instructor",
    attributes: ["user_id", "full_name", "email", "avatar_url"],
  },
  {
    model: Category,
    as: "category",
  },
  {
    model: Section,
    as: "sections",
    include: [
      {
        model: Lesson,
        as: "lessons",
        include: [{ model: LessonResource, as: "resources" }],
      },
    ],
  },
  {
    model: CourseTag,
    as: "tags",
    through: { attributes: [] },
  },
  {
    model: Track,
    as: "track",
  },
];

const listCourses = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.approval_status) {
    where.approval_status = req.query.approval_status;
  }
  if (req.query.instructor_id) {
    where.instructor_id = req.query.instructor_id;
  }
  if (req.query.category_id) {
    where.category_id = req.query.category_id;
  }
  if (req.query.search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${req.query.search}%` } },
      { description: { [Op.iLike]: `%${req.query.search}%` } },
    ];
  }

  if (req.user?.role === "instructor") {
    where.instructor_id = req.user.id;
  }

  if (req.user?.role === "student") {
    where.status = "published";
    where.approval_status = "approved";
  }

  const result = await Course.findAndCountAll({
    where,
    include: [
      {
        model: CourseTag,
        as: "tags",
        through: { attributes: [] },
      },
      {
        model: Category,
        as: "category",
      },

      {
        model: User,
        as: "instructor",
        attributes: ["user_id", "full_name"],
      },
    ],
    limit,
    offset,
    order: [["created_at", "DESC"]],
    distinct: true,
  });

  // Convert to JSON to attach custom properties
  const courses = result.rows.map((c) => c.toJSON());

  // If user is logged in, check enrollment status
  if (req.user) {
    const courseIds = courses.map((c) => c.course_id);
    if (courseIds.length > 0) {
      const enrollments = await Enrollment.findAll({
        where: {
          student_id: req.user.id,
          course_id: { [Op.in]: courseIds },
          status: { [Op.in]: ["active", "completed"] },
        },
        attributes: ["course_id"],
      });

      const enrolledSet = new Set(enrollments.map((e) => e.course_id));
      courses.forEach((c) => {
        c.is_enrolled = enrolledSet.has(c.course_id);
      });
    }
  }

  res.json({
    success: true,
    data: courses,
    meta: {
      total: result.count,
      page,
      limit,
      total_pages: Math.ceil(result.count / limit),
    },
  });
});

const createCourse = asyncHandler(async (req, res) => {
  const payload = {
    instructor_id: req.user.id,
    category_id: req.body.category_id,
    title: req.body.title,
    slug: req.body.slug || slugify(req.body.title),
    description: req.body.description,
    thumbnail_url: req.body.thumbnail_url,
    level: req.body.level,
    language: req.body.language,
    price: req.body.price,
    discount_price: req.body.discount_price,
    duration_hours: req.body.duration_hours,
    level_cefr: req.body.level_cefr || "general",
    skill_focus: normalizeSkillFocus(req.body.skill_focus, []),
    track_id: req.body.track_id,
  };

  const result = await sequelize.transaction(async (t) => {
    const course = await Course.create(payload, { transaction: t });

    if (Array.isArray(req.body.tag_ids) && req.body.tag_ids.length) {
      const bulk = req.body.tag_ids.map((tagId) => ({
        course_id: course.course_id,
        tag_id: tagId,
      }));
      await CourseTagMapping.bulkCreate(bulk, {
        ignoreDuplicates: true,
        transaction: t,
      });
    }

    return course;
  });

  res.status(201).json({ success: true, data: result });
});

const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.role !== "support_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const payload = {
    category_id: req.body.category_id ?? course.category_id,
    title: req.body.title ?? course.title,
    slug: req.body.slug || slugify(req.body.title || course.title),
    description: req.body.description ?? course.description,
    thumbnail_url: req.body.thumbnail_url ?? course.thumbnail_url,
    level: req.body.level ?? course.level,
    language: req.body.language ?? course.language,
    price: req.body.price ?? course.price,
    discount_price: req.body.discount_price ?? course.discount_price,
    duration_hours: req.body.duration_hours ?? course.duration_hours,
    level_cefr: req.body.level_cefr ?? course.level_cefr,
    skill_focus: req.body.skill_focus
      ? normalizeSkillFocus(req.body.skill_focus, course.skill_focus)
      : course.skill_focus,
    track_id: req.body.track_id ?? course.track_id,
  };

  const updatedCourse = await sequelize.transaction(async (t) => {
    await course.update(payload, { transaction: t });

    if (Array.isArray(req.body.tag_ids)) {
      await CourseTagMapping.destroy({
        where: { course_id: course.course_id },
        transaction: t,
      });
      const bulk = req.body.tag_ids.map((tagId) => ({
        course_id: course.course_id,
        tag_id: tagId,
      }));
      if (bulk.length) {
        await CourseTagMapping.bulkCreate(bulk, {
          transaction: t,
        });
      }
    }

    return course;
  });

  res.json({ success: true, data: updatedCourse });
});

const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id, {
    include: courseInclude,
    order: [
      [{ model: Section, as: "sections" }, "display_order", "ASC"],
      [
        { model: Section, as: "sections" },
        { model: Lesson, as: "lessons" },
        "display_order",
        "ASC",
      ],
    ],
  });
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  // Determine if user has privileged access to this course
  const userRole = req.user?.role;
  const isAdmin = ["system_admin", "support_admin", "content_admin"].includes(
    userRole
  );
  const isOwner =
    userRole === "instructor" && req.user.id === course.instructor_id;

  const canViewHidden = isAdmin || isOwner;

  // If not privileged, ensure course is published
  if (!canViewHidden) {
    if (
      course.status !== "published" ||
      course.approval_status !== "approved"
    ) {
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }
  }

  let isEnrolled = false;
  if (req.user) {
    const enrollment = await Enrollment.findOne({
      where: {
        student_id: req.user.id,
        course_id: course.course_id,
        status: "active",
      },
    });
    isEnrolled = !!enrollment;
  }

  const courseData = course.toJSON();

  // Filter hidden lessons and sections for non-privileged users
  if (!canViewHidden) {
    courseData.sections = courseData.sections
      .filter((section) => section.approval_status === "approved")
      .map((section) => ({
        ...section,
        lessons: section.lessons.filter(
          (lesson) => lesson.approval_status === "approved"
        ),
      }));
  }

  courseData.is_enrolled = isEnrolled;

  res.json({ success: true, data: courseData });
});
const changeCourseStatus = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  const { status, approval_status, rejection_reason } = req.body;

  if (
    status &&
    !["draft", "pending", "published", "rejected", "archived"].includes(status)
  ) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (
    approval_status &&
    !["pending", "approved", "rejected"].includes(approval_status)
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid approval status" });
  }

  if (req.user.role === "instructor" && req.user.id !== course.instructor_id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  if (
    ["support_admin", "system_admin"].includes(req.user.role) === false &&
    approval_status &&
    approval_status !== "pending"
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await course.update({
    status: status ?? course.status,
    approval_status: approval_status ?? course.approval_status,
    rejection_reason: rejection_reason ?? course.rejection_reason,
    reviewed_by:
      approval_status && approval_status !== "pending"
        ? req.user.id
        : course.reviewed_by,
    reviewed_at:
      approval_status && approval_status !== "pending"
        ? new Date()
        : course.reviewed_at,
    published_at: status === "published" ? new Date() : course.published_at,
  });

  res.json({ success: true, data: course });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  // Prevent instructors from deleting approved courses
  if (req.user.role === "instructor" && course.approval_status === "approved") {
    return res.status(403).json({
      success: false,
      message:
        "Bạn không thể xóa khóa học đã được duyệt. Vui lòng liên hệ quản trị viên.",
    });
  }

  await course.destroy();
  res.json({ success: true, message: "Course removed" });
});

const createSection = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.courseId);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const maxOrder = await Section.max("display_order", {
    where: { course_id: course.course_id },
  });

  const nextOrder = maxOrder !== null && !isNaN(maxOrder) ? maxOrder + 1 : 0;

  const section = await Section.create({
    course_id: course.course_id,
    title: req.body.title,
    description: req.body.description,
    display_order: req.body.display_order ?? nextOrder,
    approval_status: ["system_admin", "support_admin"].includes(req.user.role)
      ? "approved"
      : "pending",
  });

  res.status(201).json({ success: true, data: section });
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findByPk(req.params.sectionId);
  if (!section) {
    return res
      .status(404)
      .json({ success: false, message: "Section not found" });
  }

  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this section" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await section.update({
    title: req.body.title ?? section.title,
    description: req.body.description ?? section.description,
    display_order: req.body.display_order ?? section.display_order,
  });

  res.json({ success: true, data: section });
});

const deleteSection = asyncHandler(async (req, res) => {
  const section = await Section.findByPk(req.params.sectionId);
  if (!section) {
    return res
      .status(404)
      .json({ success: false, message: "Section not found" });
  }
  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this section" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await section.destroy();
  res.json({ success: true, message: "Section removed" });
});

const createLesson = asyncHandler(async (req, res) => {
  const section = await Section.findByPk(req.params.sectionId);
  if (!section) {
    return res
      .status(404)
      .json({ success: false, message: "Section not found" });
  }
  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this section" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const maxOrder = await Lesson.max("display_order", {
    where: { section_id: section.section_id },
  });

  const nextOrder = maxOrder !== null && !isNaN(maxOrder) ? maxOrder + 1 : 0;

  const lesson = await Lesson.create({
    section_id: section.section_id,
    title: req.body.title,
    description: req.body.description,
    lesson_type: req.body.lesson_type,
    cefr_level: req.body.cefr_level || course.level_cefr || "general",
    skill_focus: normalizeSkillFocus(req.body.skill_focus, []),
    video_url: req.body.video_url,
    video_bucket: req.body.video_bucket,
    video_key: req.body.video_key,
    video_uploaded_at: parseDateInput(req.body.video_uploaded_at),
    video_duration: req.body.video_duration,
    content: req.body.content,
    allow_preview: req.body.allow_preview,
    display_order:
      req.body.display_order && req.body.display_order > 0
        ? req.body.display_order
        : nextOrder,
    approval_status: ["system_admin", "support_admin"].includes(req.user.role)
      ? "approved"
      : "pending",
  });

  res.status(201).json({ success: true, data: lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.lessonId);
  if (!lesson) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this lesson" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await lesson.update({
    title: req.body.title ?? lesson.title,
    description: req.body.description ?? lesson.description,
    lesson_type: req.body.lesson_type ?? lesson.lesson_type,
    cefr_level: req.body.cefr_level ?? lesson.cefr_level,
    skill_focus: req.body.skill_focus
      ? normalizeSkillFocus(req.body.skill_focus, lesson.skill_focus)
      : lesson.skill_focus,
    video_url: req.body.video_url ?? lesson.video_url,
    video_bucket: req.body.video_bucket ?? lesson.video_bucket,
    video_key: req.body.video_key ?? lesson.video_key,
    video_uploaded_at:
      req.body.video_uploaded_at !== undefined
        ? parseDateInput(req.body.video_uploaded_at)
        : lesson.video_uploaded_at,
    video_duration: req.body.video_duration ?? lesson.video_duration,
    content: req.body.content ?? lesson.content,
    allow_preview: req.body.allow_preview ?? lesson.allow_preview,
    display_order: req.body.display_order ?? lesson.display_order,
  });

  res.json({ success: true, data: lesson });
});

const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.lessonId);
  if (!lesson) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this lesson" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  // Use transaction to ensure all related data is deleted or nothing is
  await sequelize.transaction(async (t) => {
    const lessonId = lesson.lesson_id;

    // 1. Delete Lesson Progress
    await LessonProgress.destroy({
      where: { lesson_id: lessonId },
      transaction: t,
    });

    // 2. Delete Lesson Resources
    await LessonResource.destroy({
      where: { lesson_id: lessonId },
      transaction: t,
    });

    // 3. Delete Track Lesson mappings
    await TrackLesson.destroy({
      where: { lesson_id: lessonId },
      transaction: t,
    });

    // 4. Delete Flashcard Decks and Cards
    const decks = await FlashcardDeck.findAll({
      where: { lesson_id: lessonId },
      attributes: ["id"],
      transaction: t,
    });
    const deckIds = decks.map((d) => d.id);
    if (deckIds.length > 0) {
      await Flashcard.destroy({
        where: { deck_id: deckIds },
        transaction: t,
      });
      await FlashcardDeck.destroy({
        where: { id: deckIds },
        transaction: t,
      });
    }

    // 5. Delete Discussions and Replies
    const discussions = await QaDiscussion.findAll({
      where: { lesson_id: lessonId },
      attributes: ["discussion_id"],
      transaction: t,
    });
    const discussionIds = discussions.map((d) => d.discussion_id);
    if (discussionIds.length > 0) {
      await QaReply.destroy({
        where: { discussion_id: discussionIds },
        transaction: t,
      });
      await QaDiscussion.destroy({
        where: { discussion_id: discussionIds },
        transaction: t,
      });
    }

    // 6. Delete Quizzes (Attempts -> Answers, Questions -> Options)
    const quizzes = await Quiz.findAll({
      where: { lesson_id: lessonId },
      attributes: ["quiz_id"],
      transaction: t,
    });

    for (const quiz of quizzes) {
      const quizId = quiz.quiz_id;

      // Delete Attempts and Student Answers
      const attempts = await QuizAttempt.findAll({
        where: { quiz_id: quizId },
        attributes: ["attempt_id"],
        transaction: t,
      });
      const attemptIds = attempts.map((a) => a.attempt_id);
      if (attemptIds.length > 0) {
        await StudentAnswer.destroy({
          where: { attempt_id: attemptIds },
          transaction: t,
        });
        await QuizAttempt.destroy({
          where: { attempt_id: attemptIds },
          transaction: t,
        });
      }

      // Delete Questions and Options
      const questions = await Question.findAll({
        where: { quiz_id: quizId },
        attributes: ["question_id"],
        transaction: t,
      });
      const questionIds = questions.map((q) => q.question_id);
      if (questionIds.length > 0) {
        await AnswerOption.destroy({
          where: { question_id: questionIds },
          transaction: t,
        });
        await Question.destroy({
          where: { question_id: questionIds },
          transaction: t,
        });
      }

      // Delete the Quiz itself
      await quiz.destroy({ transaction: t });
    }

    // Finally, delete the lesson
    await lesson.destroy({ transaction: t });
  });

  res.json({ success: true, message: "Lesson removed" });
});

const addLessonResource = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.lessonId);
  if (!lesson) {
    return res
      .status(404)
      .json({ success: false, message: "Lesson not found" });
  }
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this section" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const resource = await LessonResource.create({
    lesson_id: lesson.lesson_id,
    title: req.body.title,
    file_url: req.body.file_url,
    file_type: req.body.file_type,
    file_size: req.body.file_size,
  });

  res.status(201).json({ success: true, data: resource });
});

const deleteLessonResource = asyncHandler(async (req, res) => {
  const resource = await LessonResource.findByPk(req.params.resourceId);
  if (!resource) {
    return res
      .status(404)
      .json({ success: false, message: "Resource not found" });
  }
  const lesson = await Lesson.findByPk(resource.lesson_id);
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found for this section" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await resource.destroy();
  res.json({ success: true, message: "Resource removed" });
});

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    order: [["display_order", "ASC"]],
  });
  res.json({ success: true, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create({
    name: req.body.name,
    slug: req.body.slug || slugify(req.body.name),
    description: req.body.description,
    parent_id: req.body.parent_id,
    display_order: req.body.display_order,
  });
  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res
      .status(404)
      .json({ success: false, message: "Category not found" });
  }
  await category.update({
    name: req.body.name ?? category.name,
    slug: req.body.slug || slugify(req.body.name || category.name),
    description: req.body.description ?? category.description,
    parent_id: req.body.parent_id ?? category.parent_id,
    display_order: req.body.display_order ?? category.display_order,
  });
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) {
    return res
      .status(404)
      .json({ success: false, message: "Category not found" });
  }
  await category.destroy();
  res.json({ success: true, message: "Category removed" });
});

const listTags = asyncHandler(async (req, res) => {
  const tags = await CourseTag.findAll({ order: [["name", "ASC"]] });
  res.json({ success: true, data: tags });
});

const createTag = asyncHandler(async (req, res) => {
  const tag = await CourseTag.create({
    name: req.body.name,
    slug: req.body.slug || slugify(req.body.name),
  });
  res.status(201).json({ success: true, data: tag });
});

const updateTag = asyncHandler(async (req, res) => {
  const tag = await CourseTag.findByPk(req.params.id);
  if (!tag) {
    return res.status(404).json({ success: false, message: "Tag not found" });
  }
  await tag.update({
    name: req.body.name ?? tag.name,
    slug: req.body.slug || slugify(req.body.name || tag.name),
  });
  res.json({ success: true, data: tag });
});

const deleteTag = asyncHandler(async (req, res) => {
  const tag = await CourseTag.findByPk(req.params.id);
  if (!tag) {
    return res.status(404).json({ success: false, message: "Tag not found" });
  }
  await tag.destroy();
  res.json({ success: true, message: "Tag removed" });
});

const reorderSections = asyncHandler(async (req, res) => {
  const courseId = req.params.id; // Correct param from route /:id/sections/reorder
  const { sections } = req.body; // Expect array of { section_id, display_order }

  if (!sections || !Array.isArray(sections)) {
    return res.status(400).json({ success: false, message: "Invalid data" });
  }

  const course = await Course.findByPk(courseId);
  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  // Transaction for safety
  await sequelize.transaction(async (t) => {
    for (const item of sections) {
      if (!item.section_id || typeof item.display_order !== "number") continue;

      await Section.update(
        { display_order: item.display_order },
        {
          where: {
            section_id: item.section_id,
            course_id: course.course_id, // Ensure section belongs to this course
          },
          transaction: t,
        }
      );
    }
  });

  res.json({ success: true, message: "Sections reordered" });
});

module.exports = {
  listCourses,
  createCourse,
  updateCourse,
  getCourse,
  changeCourseStatus,
  deleteCourse,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  addLessonResource,
  deleteLessonResource,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTags,
  createTag,
  updateTag,
  deleteTag,
  reorderSections,
};
