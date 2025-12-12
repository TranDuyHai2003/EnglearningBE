const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LiveSession = sequelize.define(
  "LiveSession",
  {
    session_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    course_id: {
      type: DataTypes.INTEGER,
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    session_type: {
      type: DataTypes.ENUM("group", "one_on_one", "webinar"),
      defaultValue: "group",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
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
      type: DataTypes.ENUM("scheduled", "completed", "cancelled"),
      defaultValue: "scheduled",
    },
    calendar_event_id: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "live_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = LiveSession;
