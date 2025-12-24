const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const addPatternIndex = async () => {
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_dict_entry_headword_norm_pattern
     ON dict_entry (headword_norm text_pattern_ops)`
  );
};

const dropPatternIndex = async () => {
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_dict_entry_headword_norm_pattern`
  );
};

const up = async () => {
  const tableDescription = await queryInterface.describeTable("dict_entry");

  if (!tableDescription.headword_norm) {
    await queryInterface.addColumn("dict_entry", "headword_norm", {
      type: DataTypes.TEXT,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `UPDATE dict_entry
       SET headword_norm = lower(regexp_replace(headword, '\\s+', ' ', 'g'))`
    );

    await queryInterface.changeColumn("dict_entry", "headword_norm", {
      type: DataTypes.TEXT,
      allowNull: false,
    });
    console.log("Column headword_norm added to dict_entry");
  } else {
    console.log("Column headword_norm already exists in dict_entry");
  }

  try {
    await queryInterface.addIndex("dict_entry", ["headword_norm"], {
      name: "idx_dict_entry_headword_norm",
    });
    console.log("Index idx_dict_entry_headword_norm added");
  } catch (error) {
    if (error.parent && error.parent.code === "42P07") {
      console.log("Index idx_dict_entry_headword_norm already exists");
    } else {
      throw error;
    }
  }

  await addPatternIndex();
};

const down = async () => {
  await queryInterface.removeIndex("dict_entry", "idx_dict_entry_headword_norm");
  await dropPatternIndex();
  await queryInterface.removeColumn("dict_entry", "headword_norm");
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
