const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LessonProgress = sequelize.define(
  "LessonProgress",
  {
    progress_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    enrollment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("not_started", "in_progress", "completed"),
      defaultValue: "not_started",
    },
    video_progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    started_at: {
      type: DataTypes.DATE,
    },
    completed_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "lesson_progress",
    timestamps: false,
    underscored: true,
  }
);

module.exports = LessonProgress;
