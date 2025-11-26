const { sequelize } = require("../src/config/database");

async function migrate() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Add rejection_reason to courses
    await queryInterface.addColumn("courses", "rejection_reason", {
      type: "TEXT",
      allowNull: true,
    });
    console.log("Added rejection_reason to courses table");

    // Add rejection_reason to lessons
    await queryInterface.addColumn("lessons", "rejection_reason", {
      type: "TEXT",
      allowNull: true,
    });
    console.log("Added rejection_reason to lessons table");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sequelize.close();
  }
}

migrate();
