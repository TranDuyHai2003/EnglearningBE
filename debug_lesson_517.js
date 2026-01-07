const { sequelize, Lesson, Section, Course } = require("./src/models");

async function checkLesson() {
  try {
    const lesson = await Lesson.findByPk(517, {
      include: [
        {
          model: Section,
          as: "section",
          include: [{ model: Course, as: "course" }],
        },
      ],
    });

    if (!lesson) {
      console.log("Lesson 517 not found!");
    } else {
      console.log("Lesson 517 found:");
      console.log("Title:", lesson.title);
      console.log("Type:", lesson.lesson_type);
      console.log("Document Key:", lesson.document_key);
      console.log("Document Bucket:", lesson.document_bucket);
      console.log("Video Key:", lesson.video_key);
      console.log("Course ID:", lesson.section?.course?.course_id);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await sequelize.close();
  }
}

checkLesson();
