const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Enrollment = sequelize.define(
  "Enrollment",
  {
    enrollment_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    completion_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("active", "completed", "dropped"),
      defaultValue: "active",
    },
    completed_at: {
      type: DataTypes.DATE,
    },
    certificate_issued: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "enrollments",
    timestamps: true,
    createdAt: "enrolled_at",
    updatedAt: false,
    underscored: true,
  }
);

module.exports = Enrollment;
