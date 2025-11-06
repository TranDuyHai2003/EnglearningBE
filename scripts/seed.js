/* eslint-disable no-console */
require("dotenv").config();

const { faker } = require("@faker-js/faker");
const { sequelize } = require("../src/config/database");
const models = require("../src/models");
const { slugify } = require("../src/utils/slugify");

const {
  User,
  InstructorProfile,
  Category,
  Course,
  CourseTag,
  Section,
  Lesson,
  LessonResource,
  Quiz,
  Question,
  AnswerOption,
  Enrollment,
  LessonProgress,
  QuizAttempt,
  StudentAnswer,
  Review,
  QaDiscussion,
  QaReply,
  Message,
  Notification,
  SupportTicket,
  SupportReply,
  SystemSetting,
  Transaction,
  TransactionDetail,
} = models;

faker.seed(2024);

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Password123!";
const args = process.argv.slice(2);
const isFresh = args.includes("--fresh");
const isQuiet = args.includes("--quiet");

const log = (...info) => {
  if (!isQuiet) {
    console.log(...info);
  }
};

const randomItem = (array) => faker.helpers.arrayElement(array);
const randomSubset = (array, min = 1, max = array.length) => {
  if (!array.length) return [];
  const safeMin = Math.max(0, Math.min(min, array.length));
  const safeMax = Math.max(safeMin, Math.min(max, array.length));
  const count = safeMin === safeMax ? safeMin : faker.number.int({ min: safeMin, max: safeMax });
  return faker.helpers.shuffle(array).slice(0, count);
};

const generateEmail = (fullName, domain = "englearning.test") => {
  const safeName = slugify(fullName).replace(/-/g, ".");
  return `${safeName}.${faker.string.alphanumeric({ length: 4 }).toLowerCase()}@${domain}`;
};

const createOrUpdateUser = async (defaults) => {
  const [user, created] = await User.findOrCreate({
    where: { email: defaults.email },
    defaults,
  });

  if (!created) {
    await user.update({
      full_name: defaults.full_name,
      role: defaults.role,
      status: defaults.status,
      phone: defaults.phone,
      avatar_url: defaults.avatar_url,
      password_hash: defaults.password_hash,
    });
  }

  return user;
};

const createAdminUsers = async () => {
  log("Seeding admin accounts...");
  const systemAdmin = await createOrUpdateUser({
    email: "sysadmin@englearning.test",
    password_hash: DEFAULT_PASSWORD,
    full_name: "System Admin",
    role: "system_admin",
    status: "active",
    phone: faker.phone.number("+849########"),
    avatar_url: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
    last_login: faker.date.recent({ days: 5 }),
  });

  const supportAdmin = await createOrUpdateUser({
    email: "support@englearning.test",
    password_hash: DEFAULT_PASSWORD,
    full_name: "Support Admin",
    role: "support_admin",
    status: "active",
    phone: faker.phone.number("+848########"),
    avatar_url: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
    last_login: faker.date.recent({ days: 7 }),
  });

  return { systemAdmin, supportAdmin };
};

const createInstructors = async (count = 8) => {
  log(`Seeding ${count} instructors...`);
  const instructors = [];
  for (let i = 0; i < count; i += 1) {
    const fullName = faker.person.fullName();
    const instructor = await User.create({
      email: generateEmail(fullName),
      password_hash: DEFAULT_PASSWORD,
      full_name: fullName,
      phone: faker.phone.number("+849########"),
      avatar_url: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
      role: "instructor",
      status: "active",
      last_login: faker.date.recent({ days: 15 }),
    });
    instructors.push(instructor);
  }
  return instructors;
};

const createStudents = async (count = 35) => {
  log(`Seeding ${count} students...`);
  const students = [];
  for (let i = 0; i < count; i += 1) {
    const fullName = faker.person.fullName();
    const student = await User.create({
      email: generateEmail(fullName),
      password_hash: DEFAULT_PASSWORD,
      full_name: fullName,
      phone: faker.phone.number("+849########"),
      avatar_url: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
      role: "student",
      status: faker.helpers.weightedArrayElement([
        { value: "active", weight: 8 },
        { value: "inactive", weight: 1 },
        { value: "pending", weight: 1 },
      ]),
      last_login: faker.date.recent({ days: 20 }),
    });
    students.push(student);
  }
  return students;
};

const createInstructorProfiles = async (instructors, supportAdmin) => {
  log("Creating instructor profiles...");
  for (const instructor of instructors) {
    const status = faker.helpers.weightedArrayElement([
      { value: "approved", weight: 7 },
      { value: "pending", weight: 2 },
      { value: "rejected", weight: 1 },
    ]);

    const [profile] = await InstructorProfile.findOrCreate({
      where: { user_id: instructor.user_id },
      defaults: {
        bio: faker.person.bio(),
        education: faker.lorem.paragraph(),
        experience: faker.lorem.paragraph(),
        certificates: faker.lorem.sentence(),
        approval_status: status,
        approved_by: status === "approved" ? supportAdmin.user_id : null,
        approved_at: status === "approved" ? faker.date.recent({ days: 45 }) : null,
        rejection_reason: status === "rejected" ? "Need more teaching experience" : null,
      },
    });

    if (profile.approval_status !== status) {
      await profile.update({
        approval_status: status,
        approved_by: status === "approved" ? supportAdmin.user_id : null,
        approved_at: status === "approved" ? faker.date.recent({ days: 30 }) : null,
        rejection_reason: status === "rejected" ? "Missing verification documents" : null,
      });
    }
  }
};

const seedCategories = async () => {
  log("Creating categories...");
  const seeds = [
    { name: "Pronunciation Mastery", description: "Improve your pronunciation and accent." },
    { name: "Everyday Speaking", description: "Speaking practice for everyday conversations." },
    { name: "Grammar Essentials", description: "Grammar rules and applications." },
    { name: "IELTS Preparation", description: "Prepare for IELTS tests with practical lessons." },
    { name: "Business English", description: "Professional English for workplace success." },
    { name: "Travel English", description: "Essential English for travellers." },
  ];

  const categories = [];
  let displayOrder = 1;
  for (const seed of seeds) {
    const [category] = await Category.findOrCreate({
      where: { slug: slugify(seed.name) },
      defaults: {
        name: seed.name,
        description: seed.description,
        display_order: displayOrder,
      },
    });
    categories.push(category);
    displayOrder += 1;
  }
  return categories;
};

const seedTags = async () => {
  log("Creating course tags...");
  const tagNames = [
    "Listening",
    "Speaking",
    "Writing",
    "Reading",
    "Exam Tips",
    "Vocabulary",
    "Confidence",
    "Pronunciation",
    "Beginner",
    "Advanced",
    "Kids",
    "Adults",
  ];

  const tags = [];
  for (const name of tagNames) {
    const [tag] = await CourseTag.findOrCreate({
      where: { slug: slugify(name) },
      defaults: { name, slug: slugify(name) },
    });
    tags.push(tag);
  }
  return tags;
};

const createCourseContent = async (course, tags) => {
  const lessonsForCourse = [];
  const quizzesForCourse = [];

  await course.setTags(
    randomSubset(tags, 2, 4).map((tag) => tag.tag_id)
  );

  const sectionCount = faker.number.int({ min: 2, max: 4 });
  for (let i = 1; i <= sectionCount; i += 1) {
    const section = await Section.create({
      course_id: course.course_id,
      title: `${faker.word.adjective()} Section ${i}`,
      description: faker.lorem.sentences(2),
      display_order: i,
    });

    const lessonCount = faker.number.int({ min: 3, max: 5 });
    for (let j = 1; j <= lessonCount; j += 1) {
      const lessonType = randomItem(["video", "document", "assignment", "quiz"]);
      const lesson = await Lesson.create({
        section_id: section.section_id,
        title: `Lesson ${i}.${j}: ${faker.company.catchPhrase()}`,
        description: faker.lorem.sentences(2),
        lesson_type: lessonType,
        video_url:
          lessonType === "video"
            ? `https://videos.englearning.test/${slugify(course.title)}-${i}-${j}.mp4`
            : null,
        video_duration: lessonType === "video" ? faker.number.int({ min: 180, max: 900 }) : 0,
        content:
          lessonType !== "video"
            ? faker.lorem.paragraphs(2)
            : null,
        allow_preview: faker.datatype.boolean(),
        display_order: j,
      });

      lessonsForCourse.push(lesson);

      if (faker.datatype.boolean()) {
        const resourceCount = faker.number.int({ min: 1, max: 2 });
        for (let k = 0; k < resourceCount; k += 1) {
          await LessonResource.create({
            lesson_id: lesson.lesson_id,
            title: `${faker.word.adjective()} Resource ${k + 1}`,
            file_url: `https://cdn.englearning.test/resources/${lesson.lesson_id}-${k + 1}.pdf`,
            file_type: "application/pdf",
            file_size: faker.number.int({ min: 50_000, max: 500_000 }),
          });
        }
      }

      if (lessonType === "quiz" || faker.datatype.boolean({ probability: 0.2 })) {
        const quiz = await Quiz.create({
          lesson_id: lesson.lesson_id,
          title: `${lesson.title} Quiz`,
          description: faker.lorem.sentences(2),
          time_limit: faker.number.int({ min: 5, max: 20 }),
          passing_score: faker.number.int({ min: 60, max: 80 }),
          max_attempts: faker.number.int({ min: 1, max: 5 }),
          shuffle_questions: faker.datatype.boolean(),
          show_correct_answers: faker.datatype.boolean(),
        });

        const questions = [];
        const questionCount = faker.number.int({ min: 3, max: 5 });
        for (let q = 0; q < questionCount; q += 1) {
          const question = await Question.create({
            quiz_id: quiz.quiz_id,
            question_text: faker.lorem.sentence(),
            question_type: "multiple_choice",
            points: 1,
            display_order: q + 1,
            explanation: faker.lorem.sentence(),
          });

          const correctIndex = faker.number.int({ min: 0, max: 3 });
          const options = [];
          for (let o = 0; o < 4; o += 1) {
            const option = await AnswerOption.create({
              question_id: question.question_id,
              option_text: faker.lorem.words(4),
              is_correct: o === correctIndex,
              display_order: o + 1,
            });
            options.push(option);
          }

          questions.push({ question, options });
        }

        quizzesForCourse.push({ quiz, questions });
      }
    }
  }

  return { lessons: lessonsForCourse, quizzes: quizzesForCourse };
};

const createCourses = async (instructors, categories, tags, reviewerId) => {
  log("Creating courses with content...");
  const courses = [];
  const contentByCourse = new Map();

  for (const instructor of instructors) {
    const courseCount = faker.number.int({ min: 2, max: 4 });
    for (let i = 0; i < courseCount; i += 1) {
      const title = `${faker.company.catchPhrase()} Program`;
      const status = faker.helpers.weightedArrayElement([
        { value: "published", weight: 6 },
        { value: "pending", weight: 2 },
        { value: "draft", weight: 1 },
        { value: "rejected", weight: 1 },
      ]);
      const approval =
        status === "published"
          ? "approved"
          : faker.helpers.arrayElement(["pending", "approved", "rejected"]);
      const price = faker.number.float({ min: 9, max: 129, multipleOf: 0.5 });
      const discount =
        faker.datatype.boolean()
          ? Math.max(price - faker.number.float({ min: 3, max: price - 1, multipleOf: 0.5 }), 0)
          : null;

      const course = await Course.create({
        instructor_id: instructor.user_id,
        category_id: randomItem(categories).category_id,
        title,
        slug: `${slugify(title)}-${faker.string.alphanumeric({ length: 6 }).toLowerCase()}`,
        description: faker.lorem.paragraphs(3),
        thumbnail_url: faker.image.urlPicsumPhotos({ width: 640, height: 360 }),
        level: randomItem(["beginner", "intermediate", "advanced"]),
        language: randomItem(["English", "Vietnamese"]),
        price,
        discount_price: discount,
        duration_hours: faker.number.int({ min: 6, max: 60 }),
        status,
        approval_status: approval,
        reviewed_by: approval === "approved" ? reviewerId : null,
        reviewed_at: approval === "approved" ? faker.date.recent({ days: 60 }) : null,
        rejection_reason: approval === "rejected" ? "Content quality below standards" : null,
        total_students: 0,
        average_rating: 0,
        published_at: status === "published" ? faker.date.recent({ days: 90 }) : null,
      });

      const content = await createCourseContent(course, tags);
      contentByCourse.set(course.course_id, content);
      courses.push(course);
    }
  }

  return { courses, contentByCourse };
};

const createEnrollments = async (students, courses) => {
  log("Creating enrollments...");
  const enrollments = [];
  const enrollmentsByStudent = new Map();

  for (const student of students) {
    const courseSubset = randomSubset(courses, 3, Math.min(6, courses.length));
    for (const course of courseSubset) {
      const completion = faker.number.int({ min: 10, max: 100 });
      const status =
        completion === 100
          ? "completed"
          : faker.helpers.arrayElement(["active", "active", "dropped"]);

      const [enrollment] = await Enrollment.findOrCreate({
        where: { student_id: student.user_id, course_id: course.course_id },
        defaults: {
          completion_percentage: completion,
          status,
          completed_at: completion === 100 ? faker.date.recent({ days: 40 }) : null,
          certificate_issued: completion === 100 && faker.datatype.boolean(),
        },
      });

      enrollments.push(enrollment);
      const bucket = enrollmentsByStudent.get(student.user_id) || [];
      bucket.push(enrollment);
      enrollmentsByStudent.set(student.user_id, bucket);
    }
  }

  return { enrollments, enrollmentsByStudent };
};

const createLessonProgress = async (enrollments, contentByCourse) => {
  log("Recording lesson progress...");
  for (const enrollment of enrollments) {
    const content = contentByCourse.get(enrollment.course_id);
    if (!content) continue;
    const subset = randomSubset(content.lessons, 1, Math.min(8, content.lessons.length));
    for (const lesson of subset) {
      const status = faker.helpers.weightedArrayElement([
        { value: "completed", weight: 6 },
        { value: "in_progress", weight: 3 },
        { value: "not_started", weight: 1 },
      ]);

      await LessonProgress.findOrCreate({
        where: {
          enrollment_id: enrollment.enrollment_id,
          lesson_id: lesson.lesson_id,
        },
        defaults: {
          status,
          video_progress: status === "completed" ? 100 : faker.number.int({ min: 10, max: 90 }),
          started_at: faker.date.recent({ days: 30 }),
          completed_at: status === "completed" ? faker.date.recent({ days: 20 }) : null,
        },
      });
    }
  }
};

const createTransactions = async (enrollmentsByStudent, courses) => {
  log("Creating transactions...");
  const transactions = [];
  const paymentMethods = ["bank_card", "e_wallet", "bank_transfer"];
  const paymentGateways = ["VNPAY", "Stripe", "MoMo", "PayPal"];

  for (const [studentId, studentEnrollments] of enrollmentsByStudent.entries()) {
    if (!studentEnrollments.length) continue;
    const transactionCount = faker.number.int({ min: 1, max: 2 });

    for (let t = 0; t < transactionCount; t += 1) {
      const chosenEnrollments = randomSubset(
        studentEnrollments,
        1,
        Math.min(3, studentEnrollments.length)
      );

      const courseRecords = chosenEnrollments
        .map((enrollment) => courses.find((course) => course.course_id === enrollment.course_id))
        .filter(Boolean);

      if (!courseRecords.length) continue;

      let totalAmount = 0;
      let finalAmount = 0;

      const detailsPayload = courseRecords.map((course) => {
        const price = Number(course.price || 0);
        const finalPrice = Number(course.discount_price || course.price || 0);
        const discount = Math.max(price - finalPrice, 0);
        totalAmount += price;
        finalAmount += finalPrice;

        return {
          course_id: course.course_id,
          price,
          discount,
          final_price: finalPrice,
        };
      });

      const paymentStatus = faker.helpers.weightedArrayElement([
        { value: "completed", weight: 7 },
        { value: "pending", weight: 2 },
        { value: "failed", weight: 1 },
      ]);

      const transaction = await Transaction.create({
        student_id: studentId,
        transaction_code: faker.string.uuid(),
        total_amount: totalAmount,
        discount_amount: Number((totalAmount - finalAmount).toFixed(2)),
        final_amount: finalAmount,
        payment_method: randomItem(paymentMethods),
        payment_gateway: randomItem(paymentGateways),
        status: paymentStatus,
        payment_at: paymentStatus === "completed" ? faker.date.recent({ days: 25 }) : null,
        refunded_at:
          paymentStatus === "completed" && faker.datatype.boolean({ probability: 0.15 })
            ? faker.date.recent({ days: 5 })
            : null,
      });

      const detailRows = detailsPayload.map((detail) => ({
        ...detail,
        transaction_id: transaction.transaction_id,
      }));

      await TransactionDetail.bulkCreate(detailRows);
      transactions.push(transaction);
    }
  }

  return transactions;
};

const createReviews = async (enrollments) => {
  log("Creating course reviews...");
  const reviews = [];
  for (const enrollment of enrollments) {
    if (enrollment.completion_percentage < 40 || !faker.datatype.boolean()) continue;

    const [review, created] = await Review.findOrCreate({
      where: {
        course_id: enrollment.course_id,
        student_id: enrollment.student_id,
      },
      defaults: {
        rating: faker.number.int({ min: 3, max: 5 }),
        comment: faker.lorem.sentences(2),
        status: faker.helpers.arrayElement(["approved", "pending"]),
      },
    });

    if (created) {
      reviews.push(review);
    }
  }

  const grouped = reviews.reduce((acc, review) => {
    const bucket = acc.get(review.course_id) || [];
    bucket.push(review.rating);
    acc.set(review.course_id, bucket);
    return acc;
  }, new Map());

  for (const [courseId, ratings] of grouped.entries()) {
    const average =
      ratings.reduce((sum, value) => sum + value, 0) / Math.max(ratings.length, 1);
    await Course.update(
      { average_rating: Number(average.toFixed(2)) },
      { where: { course_id: courseId } }
    );
  }
};

const createDiscussionsAndMessages = async (
  enrollments,
  contentByCourse,
  instructors,
  students,
  courses
) => {
  log("Creating discussions, replies, notifications, and messages...");
  const lessonMap = new Map();
  const instructorByCourse = new Map();
  for (const course of courses) {
    instructorByCourse.set(course.course_id, course.instructor_id);
  }

  for (const [courseId, content] of contentByCourse.entries()) {
    for (const lesson of content.lessons) {
      lessonMap.set(lesson.lesson_id, courseId);
    }
  }

  for (const enrollment of enrollments) {
    const content = contentByCourse.get(enrollment.course_id);
    if (!content) continue;
    const lessonsForCourse = randomSubset(
      content.lessons,
      1,
      Math.min(3, content.lessons.length)
    );

    for (const lesson of lessonsForCourse) {
      const discussion = await QaDiscussion.create({
        lesson_id: lesson.lesson_id,
        student_id: enrollment.student_id,
        question: faker.lorem.sentences(2),
      });

      if (faker.datatype.boolean()) {
        const courseId = lessonMap.get(lesson.lesson_id);
        const instructorId = instructorByCourse.get(courseId);
        const replyUserId = faker.datatype.boolean() && instructorId
          ? instructorId
          : randomItem(instructors).user_id;
        await QaReply.create({
          discussion_id: discussion.discussion_id,
          user_id: replyUserId,
          reply_text: faker.lorem.sentences(2),
        });
      }
    }
  }

  for (const student of students) {
    await Notification.create({
      user_id: student.user_id,
      type: randomItem(["course", "payment", "message", "system"]),
      title: faker.lorem.sentence(),
      content: faker.lorem.sentences(2),
      is_read: faker.datatype.boolean(),
    });
  }

  for (let i = 0; i < 20; i += 1) {
    const sender = randomItem(students);
    const receiver = randomItem(instructors);
    const courseId = randomItem(Array.from(contentByCourse.keys()));
    await Message.create({
      sender_id: sender.user_id,
      receiver_id: receiver.user_id,
      message_text: faker.lorem.sentences(2),
      course_id: courseId,
      is_read: faker.datatype.boolean(),
    });
  }
};

const createSupportTickets = async (students, supportAdmin) => {
  log("Creating support tickets...");
  for (let i = 0; i < 12; i += 1) {
    const student = randomItem(students);
    const status = faker.helpers.arrayElement(["open", "in_progress", "resolved", "closed"]);
    const ticket = await SupportTicket.create({
      user_id: student.user_id,
      category: randomItem(["technical", "payment", "content", "other"]),
      subject: faker.lorem.sentence(),
      description: faker.lorem.paragraphs(2),
      priority: randomItem(["low", "medium", "high", "urgent"]),
      status,
      assigned_to: status === "open" ? null : supportAdmin.user_id,
      resolved_at: ["resolved", "closed"].includes(status)
        ? faker.date.recent({ days: 10 })
        : null,
    });

    const replyCount = faker.number.int({ min: 0, max: 3 });
    for (let r = 0; r < replyCount; r += 1) {
      await SupportReply.create({
        ticket_id: ticket.ticket_id,
        user_id: faker.datatype.boolean() ? student.user_id : supportAdmin.user_id,
        reply_text: faker.lorem.sentences(2),
      });
    }
  }
};

const createSystemSettings = async () => {
  log("Creating system settings...");
  const settings = [
    {
      setting_key: "platform.name",
      setting_value: "EngLearning Platform",
      description: "Display name for the platform",
    },
    {
      setting_key: "platform.supportEmail",
      setting_value: "support@englearning.test",
      description: "Default support email address",
    },
    {
      setting_key: "payments.currency",
      setting_value: "VND",
      description: "Default payment currency",
    },
    {
      setting_key: "courses.maxPreviewLessons",
      setting_value: "2",
      description: "Maximum number of preview lessons per course",
    },
  ];

  for (const setting of settings) {
    await SystemSetting.upsert(setting);
  }
};

const createQuizAttempts = async (enrollments, contentByCourse) => {
  log("Creating quiz attempts...");
  for (const enrollment of enrollments) {
    const content = contentByCourse.get(enrollment.course_id);
    if (!content) continue;

    const quizEntries = content.quizzes;
    if (!quizEntries.length) continue;

    const attemptCount = faker.number.int({ min: 0, max: 2 });
    for (let i = 0; i < attemptCount; i += 1) {
      const quizEntry = randomItem(quizEntries);
      const attempt = await QuizAttempt.create({
        student_id: enrollment.student_id,
        quiz_id: quizEntry.quiz.quiz_id,
        started_at: faker.date.recent({ days: 15 }),
      });

      let totalPoints = 0;
      let earnedPoints = 0;
      for (const questionEntry of quizEntry.questions) {
        totalPoints += Number(questionEntry.question.points || 1);
        const isCorrect = faker.datatype.boolean({ probability: 0.6 });
        const chosenOption = isCorrect
          ? questionEntry.options.find((option) => option.is_correct)
          : randomItem(questionEntry.options);

        await StudentAnswer.create({
          attempt_id: attempt.attempt_id,
          question_id: questionEntry.question.question_id,
          selected_option_id: chosenOption.option_id,
          answer_text: null,
          is_correct: chosenOption.is_correct,
          points_earned: chosenOption.is_correct ? Number(questionEntry.question.points || 1) : 0,
        });

        if (chosenOption.is_correct) {
          earnedPoints += Number(questionEntry.question.points || 1);
        }
      }

      const percentage = totalPoints ? (earnedPoints / totalPoints) * 100 : 0;
      await attempt.update({
        submitted_at: faker.date.recent({ days: 10 }),
        score: Number(percentage.toFixed(2)),
        passed: percentage >= quizEntry.quiz.passing_score,
        time_taken: faker.number.int({ min: 60, max: 600 }),
      });
    }
  }
};

const updateCourseTotals = async (courses) => {
  log("Updating course statistics...");
  for (const course of courses) {
    const studentCount = await Enrollment.count({ where: { course_id: course.course_id } });
    await course.update({ total_students: studentCount });
  }
};

const main = async () => {
  try {
    log("Connecting to database...");
    await sequelize.authenticate();
    log("Database connection OK");

    if (isFresh) {
      log("Resetting schema (force sync)...");
      await sequelize.sync({ force: true });
    } else {
      await sequelize.sync();
    }

    const { systemAdmin, supportAdmin } = await createAdminUsers();
    const categories = await seedCategories();
    const tags = await seedTags();
    const instructors = await createInstructors();
    const students = await createStudents();
    await createInstructorProfiles(instructors, supportAdmin);

    const { courses, contentByCourse } = await createCourses(
      instructors,
      categories,
      tags,
      systemAdmin.user_id
    );

    const { enrollments, enrollmentsByStudent } = await createEnrollments(students, courses);
    await createLessonProgress(enrollments, contentByCourse);
    await createTransactions(enrollmentsByStudent, courses);
    await createReviews(enrollments);
    await createQuizAttempts(enrollments, contentByCourse);
    await createDiscussionsAndMessages(enrollments, contentByCourse, instructors, students, courses);
    await createSupportTickets(students, supportAdmin);
    await createSystemSettings();
    await updateCourseTotals(courses);

    log("Seeding completed successfully.");
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error);
    await sequelize.close();
    process.exit(1);
  }
};

main();
