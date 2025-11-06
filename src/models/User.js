const { DataTypes } = require("sequelize");
const bcryptjs = require("bcryptjs");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
    },
    avatar_url: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.ENUM(
        "student",
        "instructor",
        "support_admin",
        "system_admin"
      ),
      defaultValue: "student",
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "pending", "locked"),
      defaultValue: "active",
    },
    last_login: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

const hashPassword = async (user) => {
  if (user.changed("password_hash")) {
    user.password_hash = await bcryptjs.hash(user.password_hash, 10);
  }
};

User.beforeCreate(hashPassword);
User.beforeUpdate(hashPassword);

module.exports = User;
