const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Lesson = sequelize.define(
  "Lesson",
  {
    lesson_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    section_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    lesson_type: {
      type: DataTypes.ENUM("video", "document", "quiz", "assignment"),
      allowNull: false,
    },
    cefr_level: {
      type: DataTypes.ENUM(
        "general",
        "beginner",
        "A1",
        "A2",
        "B1",
        "B2",
        "C1",
        "C2",
        "TOEIC",
        "IELTS",
        "advanced"
      ),
    },
    skill_focus: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    video_url: {
      type: DataTypes.STRING,
    },
    video_bucket: {
      type: DataTypes.STRING,
    },
    video_key: {
      type: DataTypes.STRING,
    },
    video_mime_type: {
      type: DataTypes.STRING,
      defaultValue: "video/webm",
    },
    video_size_bytes: {
      type: DataTypes.BIGINT,
    },
    video_uploaded_at: {
      type: DataTypes.DATE,
    },
    video_duration: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    // Document fields
    document_url: {
      type: DataTypes.STRING,
    },
    document_bucket: {
      type: DataTypes.STRING,
    },
    document_key: {
      type: DataTypes.STRING,
    },
    document_mime_type: {
      type: DataTypes.STRING,
      defaultValue: "application/pdf",
    },
    document_size_bytes: {
      type: DataTypes.BIGINT,
    },
    document_uploaded_at: {
      type: DataTypes.DATE,
    },
    content: {
      type: DataTypes.TEXT,
    },
    allow_preview: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    approval_status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      defaultValue: "pending",
      allowNull: false,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "lessons",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = Lesson;
