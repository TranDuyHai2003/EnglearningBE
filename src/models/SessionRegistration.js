const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SessionRegistration = sequelize.define(
  "SessionRegistration",
  {
    registration_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    session_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    attendance_status: {
      type: DataTypes.ENUM("registered", "attended", "absent"),
      defaultValue: "registered",
    },
    joined_at: {
      type: DataTypes.DATE,
    },
    left_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "session_registrations",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = SessionRegistration;
