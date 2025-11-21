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
    cv_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Link dẫn đến CV (PDF/Drive)",
    },
    intro_video_url: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Link video giới thiệu hoặc dạy thử (YouTube/Drive)",
    },
    interview_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Ngày hẹn phỏng vấn",
    },
    interview_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Ghi chú của Admin về buổi phỏng vấn (Only Admin see)",
    },
    meeting_link: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Link Google Meet/Zoom hoặc Địa chỉ phòng họp",
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "interviewing", "approved", "rejected"),
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
