const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SystemSetting = sequelize.define(
  "SystemSetting",
  {
    setting_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    setting_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    setting_value: {
      type: DataTypes.TEXT,
    },
    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "system_settings",
    timestamps: true,
    createdAt: false,
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = SystemSetting;
