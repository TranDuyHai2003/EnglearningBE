const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const up = async () => {
  try {
    const tableDesc = await queryInterface.describeTable("flashcard_decks");
    if (!tableDesc.lesson_id) {
      await queryInterface.addColumn("flashcard_decks", "lesson_id", {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "lessons",
          key: "lesson_id",
        },
        onDelete: "SET NULL",
      });
      console.log("Column lesson_id added to flashcard_decks");
    } else {
      console.log("Column lesson_id already exists in flashcard_decks, skipping");
    }
  } catch (error) {
     console.error("Error checking/adding column lesson_id:", error);
     throw error;
  }

  try {
    await queryInterface.addIndex("flashcard_decks", ["lesson_id"], {
      name: "idx_flashcard_decks_lesson",
    });
    console.log("Index idx_flashcard_decks_lesson added");
  } catch (error) {
    console.log("Index idx_flashcard_decks_lesson likely already exists or failed:", error.message);
  }
};

const down = async () => {
  await queryInterface.removeIndex("flashcard_decks", "idx_flashcard_decks_lesson");
  await queryInterface.removeColumn("flashcard_decks", "lesson_id");
};

const run = async () => {
  const direction = process.argv[2];
  if (!["up", "down"].includes(direction)) {
    console.error("Usage: node <migration-file> <up|down>");
    process.exit(1);
  }

  try {
    if (direction === "up") {
      await up();
    } else {
      await down();
    }
    console.log(`Migration ${direction} completed successfully.`);
  } catch (error) {
    console.error(`Migration ${direction} failed:`, error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  run();
}

module.exports = { up, down };
