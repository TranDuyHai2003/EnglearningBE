const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ContentReport = sequelize.define(
  "ContentReport",
  {
    report_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reporter_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    content_type: {
      type: DataTypes.ENUM("discussion", "reply", "review"),
      allowNull: false,
    },
    content_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "reviewed", "resolved"),
      defaultValue: "pending",
    },
    admin_note: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "content_reports",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = ContentReport;
