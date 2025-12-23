const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");
const FlashcardDeck = require("../../models/FlashcardDeck");
const Flashcard = require("../../models/Flashcard");
const FlashcardUserState = require("../../models/FlashcardUserState");
const FlashcardReview = require("../../models/FlashcardReview");

const ADMIN_ROLES = new Set(["system_admin", "support_admin"]);

const isAdmin = (role) => ADMIN_ROLES.has(role);

const buildDeckAccessWhere = ({ alias = "d", role, userId }) => {
  if (isAdmin(role)) {
    return "1=1";
  }
  return `(${alias}.owner_user_id = :userId OR ${alias}.visibility = 'public' OR (${alias}.visibility = 'unlisted' AND (${alias}.owner_user_id = :userId OR ${alias}.owner_user_id IS NULL)))`;
};

const listDecks = async ({ userId, role, scope = "all", search }) => {
  const filters = [];
  const replacements = { userId };

  if (scope === "mine") {
    filters.push("d.owner_user_id = :userId");
  } else if (scope === "system") {
    filters.push("d.owner_user_id IS NULL");
    if (!isAdmin(role)) {
      filters.push("d.visibility != 'private'");
    }
  } else {
    filters.push(buildDeckAccessWhere({ role, userId }));
  }

  if (search) {
    replacements.search = `%${search}%`;
    filters.push("(d.title ILIKE :search OR d.description ILIKE :search)");
  }

  if (!filters.length) {
    filters.push("1=1");
  }

  const whereClause = filters.map((f) => `(${f})`).join(" AND ");

  const decks = await sequelize.query(
    `WITH base AS (
      SELECT d.*
      FROM flashcard_decks d
      WHERE ${whereClause}
    ),
    card_counts AS (
      SELECT deck_id, COUNT(*) AS total_cards
      FROM flashcards
      GROUP BY deck_id
    ),
    due_counts AS (
      SELECT f.deck_id,
             COUNT(*) FILTER (
               WHERE (COALESCE(s.status, 'new') <> 'suspended')
                 AND COALESCE(s.due_at, now()) <= now()
             ) AS due_cards
      FROM flashcards f
      LEFT JOIN flashcard_user_state s
        ON s.card_id = f.id AND s.user_id = :userId
      GROUP BY f.deck_id
    ),
    new_counts AS (
      SELECT f.deck_id,
             COUNT(*) FILTER (
               WHERE COALESCE(s.status, 'new') = 'new'
             ) AS new_cards
      FROM flashcards f
      LEFT JOIN flashcard_user_state s
        ON s.card_id = f.id AND s.user_id = :userId
      GROUP BY f.deck_id
    )
    SELECT base.*, 
           COALESCE(card_counts.total_cards, 0) AS total_cards,
           COALESCE(due_counts.due_cards, 0) AS due_cards,
           COALESCE(new_counts.new_cards, 0) AS new_cards
    FROM base
    LEFT JOIN card_counts ON card_counts.deck_id = base.id
    LEFT JOIN due_counts ON due_counts.deck_id = base.id
    LEFT JOIN new_counts ON new_counts.deck_id = base.id
    ORDER BY base.created_at DESC` ,
    {
      replacements,
      type: QueryTypes.SELECT,
    }
  );

  return decks;
};

const getDeckById = (deckId) => FlashcardDeck.findByPk(deckId);

const createDeck = (payload) => FlashcardDeck.create(payload);

const updateDeck = async (deckId, payload) => {
  const deck = await FlashcardDeck.findByPk(deckId);
  if (!deck) return null;
  return deck.update(payload);
};

const deleteDeck = (deckId) => FlashcardDeck.destroy({ where: { id: deckId } });

const findCardById = (cardId) => Flashcard.findByPk(cardId);

const listCards = async ({ deckId, userId, limit, cursor }) => {
  const replacements = { deckId, userId, limit: limit + 1 };
  const cursorConditions = [];
  if (cursor) {
    replacements.cursorDate = cursor.created_at;
    replacements.cursorId = cursor.id;
    cursorConditions.push(
      "(f.created_at < :cursorDate OR (f.created_at = :cursorDate AND f.id < :cursorId))"
    );
  }

  const whereParts = ["f.deck_id = :deckId"];
  if (cursorConditions.length) {
    whereParts.push(cursorConditions.join(" AND "));
  }

  const rows = await sequelize.query(
    `SELECT f.*, 
            s.status AS user_status,
            s.due_at AS user_due_at,
            s.repetitions AS user_repetitions,
            s.interval_days AS user_interval_days
     FROM flashcards f
     LEFT JOIN flashcard_user_state s
       ON s.card_id = f.id AND s.user_id = :userId
     WHERE ${whereParts.join(" AND ")}
     ORDER BY f.created_at DESC, f.id DESC
     LIMIT :limit`,
    { replacements, type: QueryTypes.SELECT }
  );

  return rows;
};

const createCard = (payload) => Flashcard.create(payload);

const updateCard = async (cardId, payload) => {
  const card = await Flashcard.findByPk(cardId);
  if (!card) return null;
  return card.update(payload);
};

const deleteCard = (cardId) => Flashcard.destroy({ where: { id: cardId } });

const createCardsBulk = (cards) => Flashcard.bulkCreate(cards, { returning: true });

const listLessonDecksRaw = async ({ lessonId }) => {
  const rows = await sequelize.query(
    `SELECT d.*,
            COUNT(f.id) AS total_cards
     FROM flashcard_decks d
     LEFT JOIN flashcards f ON f.deck_id = d.id
     WHERE d.lesson_id = :lessonId
     GROUP BY d.id
     ORDER BY d.created_at DESC`,
    {
      replacements: { lessonId },
      type: QueryTypes.SELECT,
    }
  );
  return rows;
};

const getDeckStatsForUser = async ({ deckId, userId }) => {
  const [stats] = await sequelize.query(
    `SELECT COUNT(*) AS total_cards,
            COUNT(*) FILTER (
              WHERE (COALESCE(s.status, 'new') <> 'suspended')
                AND COALESCE(s.due_at, now()) <= now()
            ) AS due_cards,
            COUNT(*) FILTER (WHERE COALESCE(s.status, 'new') = 'new') AS new_cards,
            COUNT(*) FILTER (WHERE COALESCE(s.repetitions, 0) >= 2) AS learned_cards
     FROM flashcards f
     LEFT JOIN flashcard_user_state s
       ON s.card_id = f.id AND s.user_id = :userId
     WHERE f.deck_id = :deckId`,
    { replacements: { deckId, userId }, type: QueryTypes.SELECT }
  );

  return stats;
};

const getDeckSummaryMetrics = async ({ deckId, userId }) => {
  const stats = await getDeckStatsForUser({ deckId, userId });

  const [accuracyRow] = await sequelize.query(
    `SELECT
        COUNT(*) FILTER (WHERE reviewed_at >= now() - interval '7 days') AS total_7d,
        COUNT(*) FILTER (
          WHERE reviewed_at >= now() - interval '7 days'
            AND grade IN ('good','easy')
        ) AS correct_7d,
        COUNT(*) FILTER (WHERE reviewed_at >= now() - interval '30 days') AS total_30d,
        COUNT(*) FILTER (
          WHERE reviewed_at >= now() - interval '30 days'
            AND grade IN ('good','easy')
        ) AS correct_30d
      FROM flashcard_reviews
      WHERE user_id = :userId AND deck_id = :deckId`,
    { replacements: { userId, deckId }, type: QueryTypes.SELECT }
  );

  const reviewDates = await sequelize.query(
    `SELECT DISTINCT DATE(reviewed_at) AS review_date
     FROM flashcard_reviews
     WHERE user_id = :userId AND deck_id = :deckId
       AND reviewed_at >= now() - interval '60 days'
     ORDER BY review_date DESC`,
    { replacements: { userId, deckId }, type: QueryTypes.SELECT }
  );

  return { stats, accuracy: accuracyRow || {}, reviewDates };
};

const getGlobalSummaryMetrics = async ({ userId, role }) => {
  const accessWhere = buildDeckAccessWhere({ alias: "d", role, userId });

  const [stats] = await sequelize.query(
    `SELECT COUNT(*) AS total_cards,
            COUNT(*) FILTER (
              WHERE (COALESCE(s.status, 'new') <> 'suspended')
                AND COALESCE(s.due_at, now()) <= now()
            ) AS due_cards,
            COUNT(*) FILTER (WHERE COALESCE(s.status, 'new') = 'new') AS new_cards,
            COUNT(*) FILTER (WHERE COALESCE(s.repetitions, 0) >= 2) AS learned_cards
     FROM flashcards f
     JOIN flashcard_decks d ON d.id = f.deck_id
     LEFT JOIN flashcard_user_state s
       ON s.card_id = f.id AND s.user_id = :userId
     WHERE ${accessWhere}`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );

  const [accuracyRow] = await sequelize.query(
    `SELECT
        COUNT(*) FILTER (WHERE reviewed_at >= now() - interval '7 days') AS total_7d,
        COUNT(*) FILTER (
          WHERE reviewed_at >= now() - interval '7 days'
            AND grade IN ('good','easy')
        ) AS correct_7d,
        COUNT(*) FILTER (WHERE reviewed_at >= now() - interval '30 days') AS total_30d,
        COUNT(*) FILTER (
          WHERE reviewed_at >= now() - interval '30 days'
            AND grade IN ('good','easy')
        ) AS correct_30d
      FROM flashcard_reviews
      WHERE user_id = :userId`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );

  const reviewDates = await sequelize.query(
    `SELECT DISTINCT DATE(reviewed_at) AS review_date
     FROM flashcard_reviews
     WHERE user_id = :userId
       AND reviewed_at >= now() - interval '60 days'
     ORDER BY review_date DESC`,
    { replacements: { userId }, type: QueryTypes.SELECT }
  );

  return { stats, accuracy: accuracyRow || {}, reviewDates };
};

const fetchReviewQueue = async ({ deckId, userId, limit }) => {
  const rows = await sequelize.query(
    `SELECT f.*, 
            COALESCE(s.status, 'new') AS status,
            COALESCE(s.ease_factor, 2.5) AS ease_factor,
            COALESCE(s.interval_days, 0) AS interval_days,
            COALESCE(s.repetitions, 0) AS repetitions,
            COALESCE(s.lapses, 0) AS lapses,
            COALESCE(s.due_at, now()) AS due_at,
            s.last_reviewed_at
     FROM flashcards f
     LEFT JOIN flashcard_user_state s
       ON s.card_id = f.id AND s.user_id = :userId
     WHERE f.deck_id = :deckId
       AND COALESCE(s.status, 'new') <> 'suspended'
       AND COALESCE(s.due_at, now()) <= now()
     ORDER BY COALESCE(s.due_at, now()) ASC
     LIMIT :limit`,
    { replacements: { deckId, userId, limit }, type: QueryTypes.SELECT }
  );
  return rows;
};

const getUserState = (userId, cardId, options = {}) =>
  FlashcardUserState.findOne({
    where: { user_id: userId, card_id: cardId },
    ...options,
  });

const upsertUserState = (payload, transaction) =>
  FlashcardUserState.upsert(payload, { transaction });

const createReview = (payload, transaction) =>
  FlashcardReview.create(payload, { transaction });

const findReviewByIdempotency = (userId, key) =>
  FlashcardReview.findOne({ where: { user_id: userId, idempotency_key: key } });

module.exports = {
  isAdmin,
  buildDeckAccessWhere,
  listDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
  findCardById,
  listCards,
  createCard,
  updateCard,
  deleteCard,
  createCardsBulk,
  listLessonDecksRaw,
  getDeckStatsForUser,
  getDeckSummaryMetrics,
  getGlobalSummaryMetrics,
  fetchReviewQueue,
  getUserState,
  upsertUserState,
  createReview,
  findReviewByIdempotency,
};
