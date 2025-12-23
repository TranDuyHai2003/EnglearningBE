const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const addTagsIndex = async () => {
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_flashcards_tags_gin ON flashcards USING GIN (tags)`
  );
};

const dropTagsIndex = async () => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_flashcards_tags_gin`
  );
};

const up = async () => {
  await queryInterface.addColumn("flashcards", "dict_entry_id", {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: "dict_entry",
      key: "id",
    },
    onDelete: "SET NULL",
  });

  await queryInterface.addColumn("flashcards", "dict_sense_ids", {
    type: DataTypes.ARRAY(DataTypes.BIGINT),
    allowNull: true,
  });

  await queryInterface.addColumn("flashcards", "dict_source", {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "local_dict",
  });

  await queryInterface.addIndex("flashcards", ["dict_entry_id"], {
    name: "idx_flashcards_dict_entry",
  });

  await addTagsIndex();
};

const down = async () => {
  await queryInterface.removeIndex("flashcards", "idx_flashcards_dict_entry");
  await dropTagsIndex();
  await queryInterface.removeColumn("flashcards", "dict_entry_id");
  await queryInterface.removeColumn("flashcards", "dict_sense_ids");
  await queryInterface.removeColumn("flashcards", "dict_source");
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
