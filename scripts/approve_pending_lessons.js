const path = require("path");
const { sequelize } = require(path.join(__dirname, "../src/config/database"));

async function approvePendingLessons() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    const [results, metadata] = await sequelize.query(`
      UPDATE lessons
      SET approval_status = 'approved'
      WHERE approval_status = 'pending'
      AND section_id IN (
        SELECT s.section_id
        FROM sections s
        JOIN courses c ON s.course_id = c.course_id
        WHERE c.approval_status = 'approved'
      )
    `);

    console.log(`✅ Updated ${metadata.affectedRows || metadata || 0} lessons to approved status.`);
    console.log("Done! Students can now access courses.");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

approvePendingLessons();
