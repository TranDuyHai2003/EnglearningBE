const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SupportTicket = sequelize.define(
  "SupportTicket",
  {
    ticket_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM("technical", "payment", "content", "other"),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
    },
    status: {
      type: DataTypes.ENUM("open", "in_progress", "resolved", "closed"),
      defaultValue: "open",
    },
    assigned_to: {
      type: DataTypes.INTEGER,
    },
    resolved_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "support_tickets",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    underscored: true,
  }
);

module.exports = SupportTicket;
