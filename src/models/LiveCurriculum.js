const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LiveCurriculum = sequelize.define(
  "LiveCurriculum",
  {
    curriculum_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., "Level 1 - Beginner"
    },
    description: {
      type: DataTypes.TEXT,
    },
    level_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "live_curriculums",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = LiveCurriculum;
