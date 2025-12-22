const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FlashcardDeck = sequelize.define(
  "FlashcardDeck",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    owner_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    visibility: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["private", "unlisted", "public"]],
      },
    },
    language_pair: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lesson_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "flashcard_decks",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = FlashcardDeck;
