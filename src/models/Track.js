const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Track = sequelize.define(
  "Track",
  {
    track_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    cefr_path: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    prerequisites: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    tableName: "tracks",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = Track;
