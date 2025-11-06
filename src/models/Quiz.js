const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Quiz = sequelize.define(
  "Quiz",
  {
    quiz_id: {
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
    description: {
      type: DataTypes.TEXT,
    },
    time_limit: {
      type: DataTypes.INTEGER,
    },
    passing_score: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 70.0,
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },
    shuffle_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    show_correct_answers: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "quizzes",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

module.exports = Quiz;
