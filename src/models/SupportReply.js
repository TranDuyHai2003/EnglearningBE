const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SupportReply = sequelize.define(
  "SupportReply",
  {
    reply_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ticket_id: {
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
    tableName: "support_replies",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

module.exports = SupportReply;
