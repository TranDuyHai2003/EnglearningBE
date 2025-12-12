const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TrackLesson = sequelize.define(
  "TrackLesson",
  {
    track_lesson_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    track_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    prerequisite_lesson_id: {
      type: DataTypes.INTEGER,
    },
    gating_rule: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "track_lessons",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = TrackLesson;
