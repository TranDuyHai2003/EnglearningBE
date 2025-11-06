const User = require("./User");
const InstructorProfile = require("./InstructorProfile");
const Category = require("./Category");
const Course = require("./Course");
const CourseTag = require("./CourseTag");
const CourseTagMapping = require("./CourseTagMapping");
const Section = require("./Section");
const Lesson = require("./Lesson");
const LessonResource = require("./LessonResource");
const Quiz = require("./Quiz");
const Question = require("./Question");
const AnswerOption = require("./AnswerOption");
const Enrollment = require("./Enrollment");
const LessonProgress = require("./LessonProgress");
const QuizAttempt = require("./QuizAttempt");
const StudentAnswer = require("./StudentAnswer");
const Review = require("./Review");
const QaDiscussion = require("./QaDiscussion");
const QaReply = require("./QaReply");
const Message = require("./Message");
const Notification = require("./Notification");
const SupportTicket = require("./SupportTicket");
const SupportReply = require("./SupportReply");
const SystemSetting = require("./SystemSetting");
const Transaction = require("./Transaction");
const TransactionDetail = require("./TransactionDetail");

// Associations
User.hasOne(InstructorProfile, { foreignKey: "user_id", as: "instructorProfile" });
InstructorProfile.belongsTo(User, { foreignKey: "user_id", as: "user" });

Category.hasMany(Category, { foreignKey: "parent_id", as: "children" });
Category.belongsTo(Category, { foreignKey: "parent_id", as: "parent" });

User.hasMany(Course, { foreignKey: "instructor_id", as: "courses" });
Course.belongsTo(User, { foreignKey: "instructor_id", as: "instructor" });
Course.belongsTo(Category, { foreignKey: "category_id", as: "category" });

Course.belongsToMany(CourseTag, {
  through: CourseTagMapping,
  foreignKey: "course_id",
  otherKey: "tag_id",
  as: "tags",
});
CourseTag.belongsToMany(Course, {
  through: CourseTagMapping,
  foreignKey: "tag_id",
  otherKey: "course_id",
  as: "courses",
});

Course.hasMany(Section, { foreignKey: "course_id", as: "sections" });
Section.belongsTo(Course, { foreignKey: "course_id", as: "course" });

Section.hasMany(Lesson, { foreignKey: "section_id", as: "lessons" });
Lesson.belongsTo(Section, { foreignKey: "section_id", as: "section" });

Lesson.hasMany(LessonResource, { foreignKey: "lesson_id", as: "resources" });
LessonResource.belongsTo(Lesson, { foreignKey: "lesson_id", as: "lesson" });

Lesson.hasOne(Quiz, { foreignKey: "lesson_id", as: "quiz" });
Quiz.belongsTo(Lesson, { foreignKey: "lesson_id", as: "lesson" });

Quiz.hasMany(Question, { foreignKey: "quiz_id", as: "questions" });
Question.belongsTo(Quiz, { foreignKey: "quiz_id", as: "quiz" });

Question.hasMany(AnswerOption, { foreignKey: "question_id", as: "options" });
AnswerOption.belongsTo(Question, { foreignKey: "question_id", as: "question" });

User.hasMany(Enrollment, { foreignKey: "student_id", as: "enrollments" });
Enrollment.belongsTo(User, { foreignKey: "student_id", as: "student" });
Enrollment.belongsTo(Course, { foreignKey: "course_id", as: "course" });
Course.hasMany(Enrollment, { foreignKey: "course_id", as: "enrollments" });

Enrollment.hasMany(LessonProgress, {
  foreignKey: "enrollment_id",
  as: "lessonProgress",
});
LessonProgress.belongsTo(Enrollment, {
  foreignKey: "enrollment_id",
  as: "enrollment",
});
LessonProgress.belongsTo(Lesson, { foreignKey: "lesson_id", as: "lesson" });
Lesson.hasMany(LessonProgress, {
  foreignKey: "lesson_id",
  as: "progressRecords",
});

Quiz.hasMany(QuizAttempt, { foreignKey: "quiz_id", as: "attempts" });
QuizAttempt.belongsTo(Quiz, { foreignKey: "quiz_id", as: "quiz" });
QuizAttempt.belongsTo(User, { foreignKey: "student_id", as: "student" });
User.hasMany(QuizAttempt, { foreignKey: "student_id", as: "quizAttempts" });

QuizAttempt.hasMany(StudentAnswer, {
  foreignKey: "attempt_id",
  as: "answers",
});
StudentAnswer.belongsTo(QuizAttempt, {
  foreignKey: "attempt_id",
  as: "attempt",
});
StudentAnswer.belongsTo(Question, { foreignKey: "question_id", as: "question" });
StudentAnswer.belongsTo(AnswerOption, {
  foreignKey: "selected_option_id",
  as: "selectedOption",
});

Course.hasMany(Review, { foreignKey: "course_id", as: "reviews" });
Review.belongsTo(Course, { foreignKey: "course_id", as: "course" });
Review.belongsTo(User, { foreignKey: "student_id", as: "student" });

Lesson.hasMany(QaDiscussion, { foreignKey: "lesson_id", as: "discussions" });
QaDiscussion.belongsTo(Lesson, { foreignKey: "lesson_id", as: "lesson" });
QaDiscussion.belongsTo(User, { foreignKey: "student_id", as: "student" });

QaDiscussion.hasMany(QaReply, { foreignKey: "discussion_id", as: "replies" });
QaReply.belongsTo(QaDiscussion, {
  foreignKey: "discussion_id",
  as: "discussion",
});
QaReply.belongsTo(User, { foreignKey: "user_id", as: "user" });

Message.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
Message.belongsTo(User, { foreignKey: "receiver_id", as: "receiver" });
Message.belongsTo(Course, { foreignKey: "course_id", as: "course" });

Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });

SupportTicket.belongsTo(User, { foreignKey: "user_id", as: "user" });
SupportTicket.belongsTo(User, {
  foreignKey: "assigned_to",
  as: "assignee",
});
SupportTicket.hasMany(SupportReply, { foreignKey: "ticket_id", as: "replies" });
SupportReply.belongsTo(SupportTicket, {
  foreignKey: "ticket_id",
  as: "ticket",
});
SupportReply.belongsTo(User, { foreignKey: "user_id", as: "user" });

Transaction.belongsTo(User, { foreignKey: "student_id", as: "student" });
User.hasMany(Transaction, { foreignKey: "student_id", as: "transactions" });
Transaction.hasMany(TransactionDetail, {
  foreignKey: "transaction_id",
  as: "details",
});
TransactionDetail.belongsTo(Transaction, {
  foreignKey: "transaction_id",
  as: "transaction",
});
TransactionDetail.belongsTo(Course, { foreignKey: "course_id", as: "course" });

module.exports = {
  User,
  InstructorProfile,
  Category,
  Course,
  CourseTag,
  CourseTagMapping,
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
};
