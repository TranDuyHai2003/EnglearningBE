const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FlashcardReview = sequelize.define(
  "FlashcardReview",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    card_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["again", "hard", "good", "easy"]],
      },
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    duration_ms: {
      type: DataTypes.INTEGER,
    },
    idempotency_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    tableName: "flashcard_reviews",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  }
);

module.exports = FlashcardReview;
