const { sequelize } = require("./src/config/database");
const { Course, Section } = require("./src/models");

async function fixSections() {
  try {
    console.log("Starting fix...");
    const courses = await Course.findAll({
      where: { approval_status: "approved" },
    });

    console.log(`Found ${courses.length} approved courses.`);

    for (const course of courses) {
      const [updated] = await Section.update(
        { approval_status: "approved" },
        { where: { course_id: course.course_id, approval_status: "pending" } }
      );
      if (updated > 0) {
        console.log(`Updated ${updated} sections for course ${course.title}`);
      }
    }

    console.log("Fix complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

fixSections();
