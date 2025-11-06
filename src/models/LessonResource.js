const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LessonResource = sequelize.define(
  "LessonResource",
  {
    resource_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING,
    },
    file_size: {
      type: DataTypes.BIGINT,
    },
  },
  {
    tableName: "lesson_resources",
    timestamps: true,
    createdAt: "uploaded_at",
    updatedAt: false,
    underscored: true,
  }
);

module.exports = LessonResource;
