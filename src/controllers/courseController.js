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
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");
const { slugify } = require("../utils/slugify");

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

  if (req.user.role === "instructor") {
    where.instructor_id = req.user.id;
  }
  if (req.user.role === "student") {
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
    ],
    limit,
    offset,
    order: [["created_at", "DESC"]],
  });

  res.json({
    success: true,
    data: result.rows,
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
    return res.status(404).json({ success: false, message: "Course not found" });
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
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role === "student" &&
    (course.status !== "published" || course.approval_status !== "approved")
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.json({ success: true, data: course });
});

const changeCourseStatus = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  const { status, approval_status, rejection_reason } = req.body;

  if (status && !["draft", "pending", "published", "rejected", "archived"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (approval_status && !["pending", "approved", "rejected"].includes(approval_status)) {
    return res.status(400).json({ success: false, message: "Invalid approval status" });
  }

  if (
    req.user.role === "instructor" &&
    req.user.id !== course.instructor_id
  ) {
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
    published_at:
      status === "published" ? new Date() : course.published_at,
  });

  res.json({ success: true, data: course });
});

const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.id);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await course.destroy();
  res.json({ success: true, message: "Course removed" });
});

const createSection = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.params.courseId);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const section = await Section.create({
    course_id: course.course_id,
    title: req.body.title,
    description: req.body.description,
    display_order: req.body.display_order,
  });

  res.status(201).json({ success: true, data: section });
});

const updateSection = asyncHandler(async (req, res) => {
  const section = await Section.findByPk(req.params.sectionId);
  if (!section) {
    return res.status(404).json({ success: false, message: "Section not found" });
  }

  const course = await Course.findByPk(section.course_id);
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
    return res.status(404).json({ success: false, message: "Section not found" });
  }
  const course = await Course.findByPk(section.course_id);
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
    return res.status(404).json({ success: false, message: "Section not found" });
  }
  const course = await Course.findByPk(section.course_id);
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const lesson = await Lesson.create({
    section_id: section.section_id,
    title: req.body.title,
    description: req.body.description,
    lesson_type: req.body.lesson_type,
    video_url: req.body.video_url,
    video_duration: req.body.video_duration,
    content: req.body.content,
    allow_preview: req.body.allow_preview,
    display_order: req.body.display_order,
  });

  res.status(201).json({ success: true, data: lesson });
});

const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
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
    video_url: req.body.video_url ?? lesson.video_url,
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
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await lesson.destroy();
  res.json({ success: true, message: "Lesson removed" });
});

const addLessonResource = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.params.lessonId);
  if (!lesson) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
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
    return res.status(404).json({ success: false, message: "Resource not found" });
  }
  const lesson = await Lesson.findByPk(resource.lesson_id);
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
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
    return res.status(404).json({ success: false, message: "Category not found" });
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
    return res.status(404).json({ success: false, message: "Category not found" });
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
};
