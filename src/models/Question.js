const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Question = sequelize.define(
  "Question",
  {
    question_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quiz_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM(
        "multiple_choice",
        "true_false",
        "fill_blank"
      ),
      allowNull: false,
    },
    points: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.0,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    explanation: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "questions",
    timestamps: false,
    underscored: true,
  }
);

module.exports = Question;
