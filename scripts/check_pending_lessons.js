const { Lesson, Section, Course, User } = require("../src/models");
const { sequelize } = require("../src/config/database");

async function checkPendingLessons() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    const lessons = await Lesson.findAll({
      where: { approval_status: "pending" },
      include: [
        {
          model: Section,
          as: "section",
          include: [
            {
              model: Course,
              as: "course",
              include: [
                {
                  model: User,
                  as: "instructor",
                },
              ],
            },
          ],
        },
      ],
    });

    console.log(`Found ${lessons.length} pending lessons.`);
    lessons.forEach((l) => {
      console.log(`- Lesson ID: ${l.lesson_id}, Title: ${l.title}`);
      console.log(`  Section: ${l.section?.title} (ID: ${l.section_id})`);
      console.log(`  Course: ${l.section?.course?.title} (ID: ${l.section?.course_id})`);
      console.log(`  Instructor: ${l.section?.course?.instructor?.full_name}`);
    });

  } catch (error) {
    console.error("Error checking pending lessons:", error);
  } finally {
    await sequelize.close();
  }
}

checkPendingLessons();
