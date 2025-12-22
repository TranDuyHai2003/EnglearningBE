const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Flashcard = sequelize.define(
  "Flashcard",
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    owner_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    front_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    back_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ipa_text: {
      type: DataTypes.TEXT,
    },
    example_text: {
      type: DataTypes.TEXT,
    },
    audio_url: {
      type: DataTypes.TEXT,
    },
    image_url: {
      type: DataTypes.TEXT,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    dict_entry_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    dict_sense_ids: {
      type: DataTypes.ARRAY(DataTypes.BIGINT),
      allowNull: true,
    },
    dict_source: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "local_dict",
    },
  },
  {
    tableName: "flashcards",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  }
);

module.exports = Flashcard;
