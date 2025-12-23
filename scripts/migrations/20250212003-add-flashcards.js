const { DataTypes } = require("sequelize");
const { sequelize } = require("../../src/config/database");

const queryInterface = sequelize.getQueryInterface();

const VISIBILITY = ["private", "unlisted", "public"];
const CARD_STATUS = ["new", "learning", "review", "suspended"];
const REVIEW_GRADES = ["again", "hard", "good", "easy"];

const up = async () => {
  await queryInterface.sequelize.query(
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
  );

  await queryInterface.createTable("flashcard_decks", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    owner_user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "SET NULL",
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    visibility: {
      type: DataTypes.ENUM(...VISIBILITY),
      allowNull: false,
      defaultValue: "private",
    },
    language_pair: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("flashcard_decks", ["owner_user_id"], {
    name: "idx_flashcard_decks_owner",
  });
  await queryInterface.addIndex("flashcard_decks", ["visibility"], {
    name: "idx_flashcard_decks_visibility",
  });

  await queryInterface.createTable("flashcards", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "flashcard_decks",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    owner_user_id: {
      type: DataTypes.INTEGER,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "SET NULL",
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
      defaultValue: sequelize.literal("'{}'::text[]"),
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex("flashcards", ["deck_id"], {
    name: "idx_flashcards_deck",
  });
  await queryInterface.addIndex("flashcards", ["owner_user_id"], {
    name: "idx_flashcards_owner",
  });

  await queryInterface.createTable("flashcard_user_state", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
    card_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "flashcards",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "flashcard_decks",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM(...CARD_STATUS),
      allowNull: false,
      defaultValue: "new",
    },
    ease_factor: {
      type: DataTypes.DOUBLE,
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
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addConstraint("flashcard_user_state", {
    fields: ["user_id", "card_id"],
    type: "primary key",
    name: "flashcard_user_state_pkey",
  });

  await queryInterface.addIndex(
    "flashcard_user_state",
    ["user_id", "due_at"],
    { name: "idx_flashcard_user_state_user_due" }
  );
  await queryInterface.addIndex(
    "flashcard_user_state",
    ["user_id", "deck_id", "due_at"],
    { name: "idx_flashcard_user_state_user_deck_due" }
  );

  await queryInterface.createTable("flashcard_reviews", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      onDelete: "CASCADE",
    },
    deck_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "flashcard_decks",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    card_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "flashcards",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    grade: {
      type: DataTypes.ENUM(...REVIEW_GRADES),
      allowNull: false,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    duration_ms: {
      type: DataTypes.INTEGER,
    },
    idempotency_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addConstraint("flashcard_reviews", {
    fields: ["user_id", "idempotency_key"],
    type: "unique",
    name: "flashcard_reviews_user_idempotency_key",
  });

  await queryInterface.addIndex(
    "flashcard_reviews",
    ["user_id", "reviewed_at"],
    { name: "idx_flashcard_reviews_user_time" }
  );
  await queryInterface.addIndex(
    "flashcard_reviews",
    ["user_id", "deck_id", "reviewed_at"],
    { name: "idx_flashcard_reviews_user_deck_time" }
  );
};

const down = async () => {
  await queryInterface.dropTable("flashcard_reviews");
  await queryInterface.dropTable("flashcard_user_state");
  await queryInterface.dropTable("flashcards");
  await queryInterface.dropTable("flashcard_decks");

  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_flashcard_decks_visibility";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_flashcard_user_state_status";'
  );
  await queryInterface.sequelize.query(
    'DROP TYPE IF EXISTS "enum_flashcard_reviews_grade";'
  );
};

const run = async () => {
  const direction = process.argv[2];
  if (!["up", "down"].includes(direction)) {
    console.error("Usage: node <migration-file> <up|down>");
    process.exit(1);
  }

  try {
    if (direction === "up") {
      await up();
    } else {
      await down();
    }
    console.log(`Migration ${direction} completed successfully.`);
  } catch (error) {
    console.error(`Migration ${direction} failed:`, error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

if (require.main === module) {
  run();
}

module.exports = { up, down };
