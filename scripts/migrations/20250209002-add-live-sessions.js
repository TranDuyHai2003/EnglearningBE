const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const SESSION_TYPES = ["group", "one_on_one", "webinar"];
const SESSION_STATUS = ["scheduled", "completed", "cancelled"];

const up = async () => {
  await queryInterface.createTable("live_sessions", {
    session_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "courses",
        key: "course_id",
      },
      onDelete: "SET NULL",
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
    session_type: {
      type: DataTypes.ENUM(...SESSION_TYPES),
      defaultValue: "group",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: { type: DataTypes.TEXT },
    scheduled_start: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    scheduled_end: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    meeting_provider: {
      type: DataTypes.STRING,
      defaultValue: "webrtc",
    },
    meeting_link: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM(...SESSION_STATUS),
      defaultValue: "scheduled",
    },
    calendar_event_id: {
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

  await queryInterface.createTable("session_registrations", {
    registration_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    session_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "live_sessions",
        key: "session_id",
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
    attendance_status: {
      type: DataTypes.ENUM("registered", "attended", "absent"),
      defaultValue: "registered",
    },
    joined_at: {
      type: DataTypes.DATE,
    },
    left_at: {
      type: DataTypes.DATE,
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

  await queryInterface.addConstraint("session_registrations", {
    type: "unique",
    fields: ["session_id", "student_id"],
    name: "session_registrations_unique_student",
  });
};

const down = async () => {
  await queryInterface.dropTable("session_registrations");
  await queryInterface.dropTable("live_sessions");
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_live_sessions_session_type";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_live_sessions_status";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_session_registrations_attendance_status";'
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
