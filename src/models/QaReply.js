const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QaReply = sequelize.define(
  "QaReply",
  {
    reply_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    discussion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reply_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "qa_replies",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = QaReply;
