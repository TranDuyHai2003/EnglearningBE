const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuizAttempt = sequelize.define(
  "QuizAttempt",
  {
    attempt_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quiz_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    started_at: {
      type: DataTypes.DATE,
    },
    submitted_at: {
      type: DataTypes.DATE,
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
    },
    passed: {
      type: DataTypes.BOOLEAN,
    },
    time_taken: {
      type: DataTypes.INTEGER,
    },
  },
  {
    tableName: "quiz_attempts",
    timestamps: false,
    underscored: true,
  }
);

module.exports = QuizAttempt;
