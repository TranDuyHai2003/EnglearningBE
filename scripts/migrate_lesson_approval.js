const { sequelize } = require("../src/config/database");
const { DataTypes } = require("sequelize");

async function migrate() {
  const queryInterface = sequelize.getQueryInterface();
  try {
    console.log("Adding approval_status column to lessons table...");
    
    // Check if column exists
    const tableInfo = await queryInterface.describeTable("lessons");
    if (tableInfo.approval_status) {
        console.log("Column approval_status already exists.");
        return;
    }

    await queryInterface.addColumn("lessons", "approval_status", {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
      allowNull: false,
    });

    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sequelize.close();
  }
}

migrate();
