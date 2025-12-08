const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Certificate = sequelize.define(
  "Certificate",
  {
    certificate_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    student_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    enrollment_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    certificate_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    issued_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiry_date: {
      type: DataTypes.DATE,
    },
    verify_url: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: "certificates",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = Certificate;
