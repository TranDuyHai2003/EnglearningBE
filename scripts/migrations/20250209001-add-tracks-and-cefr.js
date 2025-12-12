const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const COURSE_LEVELS = [
  "general",
  "beginner",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "TOEIC",
  "IELTS",
  "advanced",
];

const TRACK_ENROLLMENT_STATUS = ["active", "completed", "dropped"];

async function columnExists(table, column) {
  const description = await queryInterface.describeTable(table);
  return Boolean(description[column]);
}

const up = async () => {
  await queryInterface.createTable("tracks", {
    track_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    cefr_path: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    prerequisites: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  if (!(await columnExists("courses", "level_cefr"))) {
    await queryInterface.addColumn("courses", "level_cefr", {
      type: DataTypes.ENUM(...COURSE_LEVELS),
      defaultValue: "general",
    });
  }

  if (!(await columnExists("courses", "skill_focus"))) {
    await queryInterface.addColumn("courses", "skill_focus", {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    });
  }

  if (!(await columnExists("courses", "track_id"))) {
    await queryInterface.addColumn("courses", "track_id", {
      type: DataTypes.INTEGER,
      references: {
        model: "tracks",
        key: "track_id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  }

  if (!(await columnExists("lessons", "cefr_level"))) {
    await queryInterface.addColumn("lessons", "cefr_level", {
      type: DataTypes.ENUM(...COURSE_LEVELS),
      allowNull: true,
    });
  }

  if (!(await columnExists("lessons", "skill_focus"))) {
    await queryInterface.addColumn("lessons", "skill_focus", {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    });
  }

  await queryInterface.createTable("track_lessons", {
    track_lesson_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    track_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "tracks",
        key: "track_id",
      },
      onDelete: "CASCADE",
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "lessons",
        key: "lesson_id",
      },
      onDelete: "CASCADE",
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    prerequisite_lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "lessons",
        key: "lesson_id",
      },
      onDelete: "SET NULL",
    },
    gating_rule: {
      type: DataTypes.STRING,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addConstraint("track_lessons", {
    type: "unique",
    name: "track_lessons_track_lesson_unique",
    fields: ["track_id", "lesson_id"],
  });

  await queryInterface.createTable("track_enrollments", {
    track_enrollment_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    track_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "tracks",
        key: "track_id",
      },
      onDelete: "CASCADE",
    },
    student_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM(...TRACK_ENROLLMENT_STATUS),
      defaultValue: "active",
    },
    current_position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    progress_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    unlocked_lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addConstraint("track_enrollments", {
    type: "unique",
    fields: ["track_id", "student_id"],
    name: "track_enrollments_unique_student",
  });
};

const down = async () => {
  await queryInterface.dropTable("track_enrollments");
  await queryInterface.dropTable("track_lessons");

  if (await columnExists("lessons", "skill_focus")) {
    await queryInterface.removeColumn("lessons", "skill_focus");
  }
  if (await columnExists("lessons", "cefr_level")) {
    await queryInterface.removeColumn("lessons", "cefr_level");
  }

  if (await columnExists("courses", "track_id")) {
    await queryInterface.removeColumn("courses", "track_id");
  }
  if (await columnExists("courses", "skill_focus")) {
    await queryInterface.removeColumn("courses", "skill_focus");
  }
  if (await columnExists("courses", "level_cefr")) {
    await queryInterface.removeColumn("courses", "level_cefr");
  }

  await queryInterface.dropTable("tracks");

  await queryInterface.sequelize.query(
    "DROP TYPE IF EXISTS \"enum_courses_level_cefr\";"
  );
  await queryInterface.sequelize.query(
    "DROP TYPE IF EXISTS \"enum_lessons_cefr_level\";"
  );
  await queryInterface.sequelize.query(
    "DROP TYPE IF EXISTS \"enum_track_enrollments_status\";"
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
