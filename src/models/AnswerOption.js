const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AnswerOption = sequelize.define(
  "AnswerOption",
  {
    option_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    option_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    is_correct: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "answer_options",
    timestamps: false,
    underscored: true,
  }
);

module.exports = AnswerOption;
