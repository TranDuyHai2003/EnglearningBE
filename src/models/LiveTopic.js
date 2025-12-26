const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const LiveTopic = sequelize.define(
  "LiveTopic",
  {
    topic_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    curriculum_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false, // e.g., "Introduction & Greetings"
    },
    description: {
      type: DataTypes.TEXT,
    },
    order_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    slide_url: {
      type: DataTypes.STRING, // URL to PDF/Slides for instructor
    },
  },
  {
    tableName: "live_topics",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = LiveTopic;
