const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const up = async () => {
  await queryInterface.addColumn("flashcard_decks", "lesson_id", {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "lessons",
      key: "lesson_id",
    },
    onDelete: "SET NULL",
  });

  await queryInterface.addIndex("flashcard_decks", ["lesson_id"], {
    name: "idx_flashcard_decks_lesson",
  });
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
