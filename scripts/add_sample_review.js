const { sequelize } = require("../src/config/database");
const { Review, Course, User, Enrollment } = require("../src/models");

async function addSampleReview() {
  try {
    let course = await Course.findByPk(45);
    if (!course) {
        console.log("Course 45 not found, falling back to first available course.");
        course = await Course.findOne();
    }
    const student = await User.findOne({ where: { role: "student" } });

    if (!course || !student) {
      console.log("No course or student found.");
      return;
    }

    console.log(`Adding review for Course: ${course.title}, Student: ${student.full_name}`);

    // Ensure enrollment exists so it's valid
    await Enrollment.findOrCreate({
      where: {
        student_id: student.user_id,
        course_id: course.course_id,
      },
      defaults: {
        status: 'active',
        completion_percentage: 50
      }
    });

    const review = await Review.create({
      course_id: course.course_id,
      student_id: student.user_id,
      rating: 5,
      comment: "Khóa học rất tuyệt vời! Tôi đã học được rất nhiều.",
      status: "approved",
    });

    console.log("Review created:", review.toJSON());
  } catch (error) {
    console.error("Error adding review:", error);
  } finally {
    await sequelize.close();
  }
}

addSampleReview();
