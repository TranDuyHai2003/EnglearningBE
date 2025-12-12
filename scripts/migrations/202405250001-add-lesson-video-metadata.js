const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const TABLE = "lessons";
const columns = {
  video_bucket: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  video_key: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  video_uploaded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
};

const queryInterface = sequelize.getQueryInterface();

const columnExists = async (columnName) => {
  const description = await queryInterface.describeTable(TABLE);
  return Boolean(description[columnName]);
};

const up = async () => {
  for (const [columnName, definition] of Object.entries(columns)) {
    const exists = await columnExists(columnName);
    if (!exists) {
      await queryInterface.addColumn(TABLE, columnName, definition);
      console.log(`Added column ${columnName} to ${TABLE}`);
    } else {
      console.log(`Column ${columnName} already exists, skipping`);
    }
  }
};

const down = async () => {
  for (const columnName of Object.keys(columns)) {
    const exists = await columnExists(columnName);
    if (exists) {
      await queryInterface.removeColumn(TABLE, columnName);
      console.log(`Removed column ${columnName} from ${TABLE}`);
    } else {
      console.log(`Column ${columnName} does not exist, skipping`);
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
