const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const up = async () => {
  await queryInterface.createTable("dict_entry", {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    headword: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    pronunciation: {
      type: DataTypes.TEXT,
    },
    raw_header: {
      type: DataTypes.TEXT,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("dict_entry", ["headword"], {
    name: "idx_dict_entry_headword",
  });
  await queryInterface.sequelize.query(
    `CREATE INDEX IF NOT EXISTS idx_dict_entry_headword_pattern ON dict_entry (headword text_pattern_ops)`
  );

  await queryInterface.createTable("dict_pos", {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    entry_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "dict_entry",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    pos: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    pos_meta: {
      type: DataTypes.TEXT,
    },
  });
  await queryInterface.addIndex("dict_pos", ["entry_id"], {
    name: "idx_dict_pos_entry",
  });

  await queryInterface.createTable("dict_sense", {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    pos_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "dict_pos",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    sense_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sense_tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
  });
  await queryInterface.addIndex("dict_sense", ["pos_id"], {
    name: "idx_dict_sense_pos",
  });

  await queryInterface.createTable("dict_example", {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    sense_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "dict_sense",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    example_en: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    example_vi: {
      type: DataTypes.TEXT,
    },
  });
  await queryInterface.addIndex("dict_example", ["sense_id"], {
    name: "idx_dict_example_sense",
  });
};

const down = async () => {
  await queryInterface.dropTable("dict_example");
  await queryInterface.dropTable("dict_sense");
  await queryInterface.dropTable("dict_pos");
  await queryInterface.dropTable("dict_entry");
  await queryInterface.sequelize.query(
    `DROP INDEX IF EXISTS idx_dict_entry_headword_pattern`
  );
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
