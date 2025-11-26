const { sequelize } = require("../src/config/database");
const { Lesson, Quiz, Course, Section } = require("../src/models");

async function debug() {
  try {
    console.log("Checking models...");
    console.log("Lesson model defined:", !!Lesson);
    console.log("Quiz model defined:", !!Quiz);

    if (Lesson) {
      console.log("Lesson associations:", Object.keys(Lesson.associations));
      if (Lesson.associations.quiz) {
        console.log("Lesson.associations.quiz exists.");
        console.log("Association target:", Lesson.associations.quiz.target.name);
      } else {
        console.error("ERROR: Lesson.associations.quiz is MISSING!");
      }
    }

    if (Quiz) {
      console.log("Quiz associations:", Object.keys(Quiz.associations));
    }

    console.log("Attempting simple query...");
    try {
      const lesson = await Lesson.findOne({
        include: [
          { model: Quiz, as: "quiz" }
        ]
      });
      console.log("Query successful!");
    } catch (err) {
      console.error("Query failed:", err.message);
    }

  } catch (error) {
    console.error("Debug script error:", error);
  } finally {
    await sequelize.close();
  }
}

debug();
