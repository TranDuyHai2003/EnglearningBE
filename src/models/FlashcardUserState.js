const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FlashcardUserState = sequelize.define(
  "FlashcardUserState",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    card_id: {
      type: DataTypes.UUID,
      primaryKey: true,
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "new",
      validate: {
        isIn: [["new", "learning", "review", "suspended"]],
      },
    },
    ease_factor: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 2.5,
    },
    interval_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    repetitions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lapses: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    due_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_reviewed_at: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "flashcard_user_state",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = FlashcardUserState;
