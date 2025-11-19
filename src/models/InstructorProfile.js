const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const InstructorProfile = sequelize.define(
  "InstructorProfile",
  {
    profile_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    bio: {
      type: DataTypes.TEXT,
    },
    education: {
      type: DataTypes.TEXT,
    },
    experience: {
      type: DataTypes.TEXT,
    },
    certificates: {
      type: DataTypes.TEXT,
    },
    certificate_files: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    cv_url: {
      type: DataTypes.STRING,
    },
    cv_file_name: {
      type: DataTypes.STRING,
    },
    cv_uploaded_at: {
      type: DataTypes.DATE,
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
    },
    approved_by: {
      type: DataTypes.INTEGER,
    },
    approved_at: {
      type: DataTypes.DATE,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "instructor_profiles",
    timestamps: false,
    underscored: true,
  }
);

module.exports = InstructorProfile;
