const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CourseTag = sequelize.define(
  "CourseTag",
  {
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "course_tags",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CourseTag;
