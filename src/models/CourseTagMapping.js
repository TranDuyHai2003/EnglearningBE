const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CourseTagMapping = sequelize.define(
  "CourseTagMapping",
  {
    course_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    tag_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
  },
  {
    tableName: "course_tag_mapping",
    timestamps: false,
    underscored: true,
  }
);

module.exports = CourseTagMapping;
