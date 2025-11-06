const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const {
  Course,
  Enrollment,
  Lesson,
  LessonProgress,
  Quiz,
  Question,
  AnswerOption,
  QuizAttempt,
  StudentAnswer,
  Section,
  LessonResource,
} = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { getPagination } = require("../utils/pagination");

const enrollCourse = asyncHandler(async (req, res) => {
  const course = await Course.findByPk(req.body.course_id);
  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }
  if (course.status !== "published" || course.approval_status !== "approved") {
    return res
      .status(400)
      .json({ success: false, message: "Course not available for enrollment" });
  }

  const existing = await Enrollment.findOne({
    where: { course_id: course.course_id, student_id: req.user.id },
  });
  if (existing) {
    return res.status(200).json({ success: true, data: existing });
  }

  const enrollment = await Enrollment.create({
    course_id: course.course_id,
    student_id: req.user.id,
  });

  await course.increment("total_students");

  res.status(201).json({ success: true, data: enrollment });
});

const listEnrollments = asyncHandler(async (req, res) => {
  const { limit, offset, page } = getPagination(req.query);
  const where = {};

  if (req.user.role === "student") {
    where.student_id = req.user.id;
  } else if (req.user.role === "instructor") {
    const instructorCourses = await Course.findAll({
      where: { instructor_id: req.user.id },
      attributes: ["course_id"],
    });
    where.course_id = {
      [Op.in]: instructorCourses.map((c) => c.course_id),
    };
  } else if (req.query.student_id) {
    where.student_id = req.query.student_id;
  }
  if (req.query.course_id) {
    where.course_id = req.query.course_id;
  }
  if (req.query.status) {
    where.status = req.query.status;
  }

  const result = await Enrollment.findAndCountAll({
    where,
    include: [{ model: Course, as: "course" }],
    limit,
    offset,
    order: [["enrolled_at", "DESC"]],
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

const getEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findByPk(req.params.id, {
    include: [
      {
        model: Course,
        as: "course",
        include: [
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
        ],
      },
      {
        model: LessonProgress,
        as: "lessonProgress",
      },
    ],
  });
  if (!enrollment) {
    return res
      .status(404)
      .json({ success: false, message: "Enrollment not found" });
  }

  const canView =
    req.user.role === "system_admin" ||
    req.user.role === "support_admin" ||
    req.user.id === enrollment.student_id ||
    req.user.id === enrollment.course.instructor_id;
  if (!canView) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  res.json({ success: true, data: enrollment });
});

const recordLessonProgress = asyncHandler(async (req, res) => {
  const { lesson_id, status, video_progress } = req.body;
  const lesson = await Lesson.findByPk(lesson_id, {
    include: [{ model: Section, as: "section" }],
  });
  if (!lesson) {
    return res.status(404).json({ success: false, message: "Lesson not found" });
  }

  const enrollment = await Enrollment.findOne({
    where: { student_id: req.user.id, course_id: lesson.section.course_id },
  });
  if (!enrollment) {
    return res
      .status(404)
      .json({ success: false, message: "Enrollment not found" });
  }

  const progress = await LessonProgress.findOrCreate({
    where: {
      enrollment_id: enrollment.enrollment_id,
      lesson_id: lesson.lesson_id,
    },
    defaults: {
      status: status || "in_progress",
      video_progress: video_progress ?? 0,
      started_at: new Date(),
    },
  });

  const progressRecord = progress[0];
  await progressRecord.update({
    status: status ?? progressRecord.status,
    video_progress: video_progress ?? progressRecord.video_progress,
    completed_at:
      status === "completed" ? new Date() : progressRecord.completed_at,
  });

  const totalLessons = await Lesson.count({
    include: [{ model: Section, as: "section", where: { course_id: enrollment.course_id } }],
  });
  const completedLessons = await LessonProgress.count({
    where: {
      enrollment_id: enrollment.enrollment_id,
      status: "completed",
    },
  });

  const completionPercentage = totalLessons
    ? Number(((completedLessons / totalLessons) * 100).toFixed(2))
    : 0;

  await enrollment.update({
    completion_percentage: completionPercentage,
    status: completionPercentage === 100 ? "completed" : enrollment.status,
    completed_at:
      completionPercentage === 100 ? new Date() : enrollment.completed_at,
  });

  res.json({
    success: true,
    data: {
      progress: progressRecord,
      enrollment,
    },
  });
});

const getCourseProgress = asyncHandler(async (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  const enrollment = await Enrollment.findOne({
    where: {
      course_id: courseId,
      student_id: req.user.id,
    },
    include: [{ model: LessonProgress, as: "lessonProgress" }],
  });
  if (!enrollment) {
    return res
      .status(404)
      .json({ success: false, message: "Enrollment not found" });
  }

  res.json({ success: true, data: enrollment });
});

const getQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.quizId, {
    include: [
      {
        model: Question,
        as: "questions",
        include: [{ model: AnswerOption, as: "options" }],
      },
    ],
  });
  if (!quiz) {
    return res.status(404).json({ success: false, message: "Quiz not found" });
  }

  res.json({ success: true, data: quiz });
});

const upsertQuiz = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findByPk(req.body.lesson_id);
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

  const payload = {
    lesson_id: lesson.lesson_id,
    title: req.body.title,
    description: req.body.description,
    time_limit: req.body.time_limit,
    passing_score: req.body.passing_score,
    max_attempts: req.body.max_attempts,
    shuffle_questions: req.body.shuffle_questions,
    show_correct_answers: req.body.show_correct_answers,
  };

  const [quiz] = await Quiz.upsert(payload, {
    returning: true,
  });

  res.status(201).json({ success: true, data: quiz });
});

const upsertQuestion = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.quizId);
  if (!quiz) {
    return res.status(404).json({ success: false, message: "Quiz not found" });
  }
  const lesson = await Lesson.findByPk(quiz.lesson_id);
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  const questionPayload = {
    quiz_id: quiz.quiz_id,
    question_text: req.body.question_text,
    question_type: req.body.question_type,
    points: req.body.points,
    display_order: req.body.display_order,
    explanation: req.body.explanation,
  };

  const question = await sequelize.transaction(async (t) => {
    let q;
    if (req.params.questionId) {
      q = await Question.findByPk(req.params.questionId);
      if (!q) {
        throw Object.assign(new Error("Question not found"), { status: 404 });
      }
      await q.update(questionPayload, { transaction: t });
      await AnswerOption.destroy({
        where: { question_id: q.question_id },
        transaction: t,
      });
    } else {
      q = await Question.create(questionPayload, { transaction: t });
    }

    if (Array.isArray(req.body.options)) {
      const optionPayload = req.body.options.map((option) => ({
        question_id: q.question_id,
        option_text: option.option_text,
        is_correct: option.is_correct,
        display_order: option.display_order,
      }));
      if (optionPayload.length) {
        await AnswerOption.bulkCreate(optionPayload, { transaction: t });
      }
    }

    return q;
  });

  res.status(req.params.questionId ? 200 : 201).json({
    success: true,
    data: question,
  });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findByPk(req.params.questionId);
  if (!question) {
    return res.status(404).json({ success: false, message: "Question not found" });
  }
  const quiz = await Quiz.findByPk(question.quiz_id);
  const lesson = await Lesson.findByPk(quiz.lesson_id);
  const section = await Section.findByPk(lesson.section_id);
  const course = await Course.findByPk(section.course_id);
  if (
    req.user.role !== "system_admin" &&
    req.user.id !== course.instructor_id
  ) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  await question.destroy();
  res.json({ success: true, message: "Question removed" });
});

const startQuizAttempt = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findByPk(req.params.quizId);
  if (!quiz) {
    return res.status(404).json({ success: false, message: "Quiz not found" });
  }

  const attempts = await QuizAttempt.count({
    where: { quiz_id: quiz.quiz_id, student_id: req.user.id },
  });
  if (quiz.max_attempts && attempts >= quiz.max_attempts) {
    return res.status(400).json({ success: false, message: "Attempt limit reached" });
  }

  const attempt = await QuizAttempt.create({
    quiz_id: quiz.quiz_id,
    student_id: req.user.id,
    started_at: new Date(),
  });

  res.status(201).json({ success: true, data: attempt });
});

const submitQuizAttempt = asyncHandler(async (req, res) => {
  const attempt = await QuizAttempt.findByPk(req.params.attemptId);
  if (!attempt) {
    return res.status(404).json({ success: false, message: "Attempt not found" });
  }
  if (attempt.student_id !== req.user.id) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }
  if (attempt.submitted_at) {
    return res.status(400).json({ success: false, message: "Attempt already submitted" });
  }

  const quiz = await Quiz.findByPk(attempt.quiz_id, {
    include: [
      {
        model: Question,
        as: "questions",
        include: [{ model: AnswerOption, as: "options" }],
      },
    ],
  });

  const answers = req.body.answers || [];
  const questionMap = new Map(
    quiz.questions.map((q) => [q.question_id, q])
  );

  const toCreate = [];
  let earned = 0;
  let totalPoints = 0;

  quiz.questions.forEach((question) => {
    totalPoints += Number(question.points || 0);
  });

  answers.forEach((answer) => {
    const question = questionMap.get(answer.question_id);
    if (!question) return;
    const payload = {
      attempt_id: attempt.attempt_id,
      question_id: question.question_id,
      selected_option_id: answer.selected_option_id,
      answer_text: answer.answer_text,
    };

    let isCorrect = false;
    if (question.question_type === "fill_blank") {
      const correctOption = question.options.find((o) => o.is_correct);
      if (correctOption) {
        isCorrect =
          (answer.answer_text || "").trim().toLowerCase() ===
          correctOption.option_text.trim().toLowerCase();
      }
    } else {
      const selected = question.options.find(
        (o) => o.option_id === answer.selected_option_id
      );
      isCorrect = selected?.is_correct ?? false;
    }
    payload.is_correct = isCorrect;
    payload.points_earned = isCorrect ? Number(question.points || 0) : 0;
    earned += payload.points_earned;
    toCreate.push(payload);
  });

  const percentScore = totalPoints ? (earned / totalPoints) * 100 : 0;

  await sequelize.transaction(async (t) => {
    if (toCreate.length) {
      await StudentAnswer.bulkCreate(toCreate, { transaction: t });
    }
    await attempt.update(
      {
        submitted_at: new Date(),
        score: Number(percentScore.toFixed(2)),
        passed:
          quiz.passing_score != null
            ? percentScore >= Number(quiz.passing_score)
            : true,
        time_taken: req.body.time_taken,
      },
      { transaction: t }
    );
  });

  res.json({ success: true, data: attempt });
});

const listQuizAttempts = asyncHandler(async (req, res) => {
  const quizId = parseInt(req.params.quizId, 10);
  const where = { quiz_id: quizId };
  if (req.user.role === "student") {
    where.student_id = req.user.id;
  }

  const attempts = await QuizAttempt.findAll({
    where,
    include: [
      {
        model: StudentAnswer,
        as: "answers",
      },
    ],
    order: [["started_at", "DESC"]],
  });

  res.json({ success: true, data: attempts });
});

module.exports = {
  enrollCourse,
  listEnrollments,
  getEnrollment,
  recordLessonProgress,
  getCourseProgress,
  getQuiz,
  upsertQuiz,
  upsertQuestion,
  deleteQuestion,
  startQuizAttempt,
  submitQuizAttempt,
  listQuizAttempts,
};
