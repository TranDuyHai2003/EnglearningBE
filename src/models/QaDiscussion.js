const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QaDiscussion = sequelize.define(
  "QaDiscussion",
  {
    discussion_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "qa_discussions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = QaDiscussion;
