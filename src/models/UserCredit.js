const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UserCredit = sequelize.define(
  "UserCredit",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    balance: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    tableName: "user_credits",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = UserCredit;
