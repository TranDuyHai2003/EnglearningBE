const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const TABLE = "lessons";

const columns = {
  video_mime_type: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "video/webm",
  },
  video_size_bytes: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
};

const columnExists = async (column) => {
  const definition = await queryInterface.describeTable(TABLE);
  return Boolean(definition[column]);
};

const up = async () => {
  for (const [name, definition] of Object.entries(columns)) {
    const exists = await columnExists(name);
    if (!exists) {
      await queryInterface.addColumn(TABLE, name, definition);
      console.log(`Added column ${name} to lessons`);
    }
  }
};

const down = async () => {
  for (const name of Object.keys(columns)) {
    const exists = await columnExists(name);
    if (exists) {
      await queryInterface.removeColumn(TABLE, name);
      console.log(`Removed column ${name} from lessons`);
    }
  }
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
