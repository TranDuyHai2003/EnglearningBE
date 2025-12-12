const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TrackEnrollment = sequelize.define(
  "TrackEnrollment",
  {
    track_enrollment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    track_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "dropped"),
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
  },
  {
    tableName: "track_enrollments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = TrackEnrollment;
