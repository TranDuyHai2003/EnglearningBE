const { DataTypes } = require("sequelize");
const bcryptjs = require("bcryptjs");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: "student",
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: "active",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
  }
);

User.beforeCreate(async (user) => {
  if (user.password_hash) {
    user.password_hash = await bcryptjs.hash(user.password_hash, 10);
  }
});

module.exports = User;
