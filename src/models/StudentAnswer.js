const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const StudentAnswer = sequelize.define(
  "StudentAnswer",
  {
    answer_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    attempt_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    selected_option_id: {
      type: DataTypes.INTEGER,
    },
    answer_text: {
      type: DataTypes.TEXT,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
    },
    points_earned: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
  },
  {
    tableName: "student_answers",
    timestamps: false,
    underscored: true,
  }
);

module.exports = StudentAnswer;
