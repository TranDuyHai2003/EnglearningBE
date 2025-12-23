const { UniqueConstraintError } = require("sequelize");
const { sequelize } = require("../../config/database");
const {
  findEntryById: findDictionaryEntryById,
} = require("../dictionary/dictionary.repo");
const { ensureSenseOwnership } = require("../dictionary/dictionary.service");
const {
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
  getDeckStatsForUser,
  getDeckSummaryMetrics,
  getGlobalSummaryMetrics,
  fetchReviewQueue,
  getUserState,
  upsertUserState,
  createReview,
  findReviewByIdempotency,
  isAdmin,
  createCardsBulk,
  listLessonDecksRaw,
} = require("./flashcards.repo");
const { applyReview, createInitialState, ensureState } = require("./srs");
const Lesson = require("../../models/Lesson");
const Section = require("../../models/Section");
const Course = require("../../models/Course");

const normalizeCount = (value) => Number.parseInt(value ?? 0, 10) || 0;

const formatDeckStats = (deck) => ({
  ...deck,
  total_cards: normalizeCount(deck.total_cards),
  due_cards: normalizeCount(deck.due_cards),
  new_cards: normalizeCount(deck.new_cards),
});

const formatSimpleStats = (raw = {}) => ({
  total_cards: normalizeCount(raw.total_cards),
  due_cards: normalizeCount(raw.due_cards),
  new_cards: normalizeCount(raw.new_cards),
  learned_cards: normalizeCount(raw.learned_cards),
});

const canEditDeck = (deck, user) =>
  isAdmin(user.role) || deck.owner_user_id === user.id;

const canViewDeck = (deck, user) => {
  if (!deck) return false;
  if (isAdmin(user.role)) return true;
  if (deck.owner_user_id === user.id) return true;
  if (deck.visibility === "public") return true;
  if (
    deck.visibility === "unlisted" &&
    (deck.owner_user_id === user.id || deck.owner_user_id === null)
  ) {
    return true;
  }
  return false;
};

const assertDeckReadable = (deck, user) => {
  if (!deck) {
    const error = new Error("Deck not found");
    error.status = 404;
    throw error;
  }
  if (!canViewDeck(deck, user)) {
    const error = new Error("You do not have access to this deck");
    error.status = 403;
    throw error;
  }
};

const assertDeckWritable = (deck, user) => {
  assertDeckReadable(deck, user);
  if (!canEditDeck(deck, user)) {
    const error = new Error("Only the deck owner can modify this deck");
    error.status = 403;
    throw error;
  }
};

const encodeCursor = (record) => {
  if (!record) return null;
  return Buffer.from(`${record.created_at}::${record.id}`).toString("base64");
};

const decodeCursor = (cursor) => {
  if (!cursor) return null;
  const [created_at, id] = Buffer.from(cursor, "base64").toString("utf8").split("::");
  return { created_at, id };
};

const toPercent = (correct, total) => {
  const numerator = normalizeCount(correct);
  const denominator = normalizeCount(total);
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
};

const calculateStreak = (dates = []) => {
  if (!dates.length) return 0;
  const today = new Date();
  const current = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const formatted = new Set(
    dates.map((d) =>
      new Date(d.review_date).toISOString().slice(0, 10)
    )
  );

  let streak = 0;
  while (true) {
    const iso = current.toISOString().slice(0, 10);
    if (formatted.has(iso)) {
      streak += 1;
      current.setUTCDate(current.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

const hasDictionaryFields = (payload = {}) =>
  Object.prototype.hasOwnProperty.call(payload, "dict_entry_id") ||
  Object.prototype.hasOwnProperty.call(payload, "dict_sense_ids");

const sanitizeSenseIds = (senseIds = []) => {
  if (!Array.isArray(senseIds)) return [];
  const deduped = Array.from(
    new Set(
      senseIds
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
    )
  );
  return deduped.slice(0, 5);
};

const validateDictionaryReferences = async (payload = {}) => {
  if (!hasDictionaryFields(payload)) {
    return {};
  }

  const entryId = payload.dict_entry_id;
  if (!entryId) {
    return {
      dict_entry_id: null,
      dict_sense_ids: null,
      dict_source: null,
    };
  }

  const entry = await findDictionaryEntryById(entryId);
  if (!entry) {
    const error = new Error("Dictionary entry not found");
    error.status = 400;
    throw error;
  }

  const senseIds = sanitizeSenseIds(payload.dict_sense_ids);
  if (senseIds.length) {
    await ensureSenseOwnership({ entryId, senseIds });
  }

  return {
    dict_entry_id: entryId,
    dict_sense_ids: senseIds.length ? senseIds : null,
    dict_source: "local_dict",
  };
};

const listDecksService = async ({ user, scope, search }) => {
  const decks = await listDecks({
    userId: user.id,
    role: user.role,
    scope: scope || "all",
    search,
  });
  return decks.map(formatDeckStats);
};

const createDeckService = async ({ user, payload }) => {
  return createDeck({
    ...payload,
    owner_user_id: user.id,
  });
};

const getDeckService = async ({ user, deckId }) => {
  const deck = await getDeckById(deckId);
  assertDeckReadable(deck, user);
  const stats = await getDeckStatsForUser({ deckId, userId: user.id });
  return { deck, stats: formatSimpleStats(stats) };
};

const updateDeckService = async ({ user, deckId, payload }) => {
  const deck = await getDeckById(deckId);
  assertDeckWritable(deck, user);
  return deck.update(payload);
};

const deleteDeckService = async ({ user, deckId }) => {
  const deck = await getDeckById(deckId);
  assertDeckWritable(deck, user);
  await deleteDeck(deckId);
};

const listCardsService = async ({ user, deckId, limit, cursor }) => {
  const deck = await getDeckById(deckId);
  assertDeckReadable(deck, user);
  const decoded = decodeCursor(cursor);
  const rows = await listCards({
    deckId,
    userId: user.id,
    limit,
    cursor: decoded,
  });

  const hasNext = rows.length > limit;
  const trimmed = hasNext ? rows.slice(0, -1) : rows;
  const nextCursor = hasNext ? encodeCursor(trimmed[trimmed.length - 1]) : null;

  const cards = trimmed.map((row) => ({
    id: row.id,
    deck_id: row.deck_id,
    owner_user_id: row.owner_user_id,
    front_text: row.front_text,
    back_text: row.back_text,
    ipa_text: row.ipa_text,
    example_text: row.example_text,
    audio_url: row.audio_url,
    image_url: row.image_url,
    tags: row.tags || [],
    dict_entry_id: row.dict_entry_id,
    dict_sense_ids: row.dict_sense_ids || [],
    dict_source: row.dict_source,
    created_at: row.created_at,
    updated_at: row.updated_at,
    state: row.user_status
      ? {
          status: row.user_status,
          due_at: row.user_due_at,
          repetitions: normalizeCount(row.user_repetitions),
          interval_days: normalizeCount(row.user_interval_days),
        }
      : null,
  }));

  return { cards, nextCursor };
};

const createCardService = async ({ user, deckId, payload }) => {
  const deck = await getDeckById(deckId);
  assertDeckWritable(deck, user);
  const dictRefs = await validateDictionaryReferences(payload);
  return createCard({
    ...payload,
    ...dictRefs,
    deck_id: deckId,
    owner_user_id: user.id,
  });
};

const updateCardService = async ({ user, cardId, payload }) => {
  const card = await findCardById(cardId);
  if (!card) {
    const error = new Error("Card not found");
    error.status = 404;
    throw error;
  }
  const deck = await getDeckById(card.deck_id);
  assertDeckWritable(deck, user);
  const dictRefs = await validateDictionaryReferences(payload);
  return card.update({ ...payload, ...dictRefs });
};

const deleteCardService = async ({ user, cardId }) => {
  const card = await findCardById(cardId);
  if (!card) {
    const error = new Error("Card not found");
    error.status = 404;
    throw error;
  }
  const deck = await getDeckById(card.deck_id);
  assertDeckWritable(deck, user);
  await deleteCard(cardId);
};

const getReviewQueueService = async ({ user, deckId, limit }) => {
  const deck = await getDeckById(deckId);
  assertDeckReadable(deck, user);
  const dueCards = await fetchReviewQueue({ deckId, userId: user.id, limit });
  return dueCards.map((row) => ({
    card: {
      id: row.id,
      deck_id: row.deck_id,
      front_text: row.front_text,
      back_text: row.back_text,
      ipa_text: row.ipa_text,
      example_text: row.example_text,
      audio_url: row.audio_url,
      image_url: row.image_url,
      tags: row.tags || [],
      dict_entry_id: row.dict_entry_id,
      dict_sense_ids: row.dict_sense_ids || [],
      dict_source: row.dict_source,
    },
    state: {
      status: row.status,
      ease_factor: Number(row.ease_factor),
      interval_days: normalizeCount(row.interval_days),
      repetitions: normalizeCount(row.repetitions),
      lapses: normalizeCount(row.lapses),
      due_at: row.due_at,
      last_reviewed_at: row.last_reviewed_at,
    },
  }));
};

const submitReviewService = async ({ user, payload }) => {
  const { deckId, cardId, grade, idempotencyKey, durationMs } = payload;
  const deck = await getDeckById(deckId);
  assertDeckReadable(deck, user);
  const card = await findCardById(cardId);
  if (!card || card.deck_id !== deckId) {
    const error = new Error("Card does not belong to this deck");
    error.status = 400;
    throw error;
  }

  const transaction = await sequelize.transaction();
  const now = new Date();
  try {
    await createReview(
      {
        user_id: user.id,
        deck_id: deckId,
        card_id: cardId,
        grade,
        idempotency_key: idempotencyKey,
        duration_ms: durationMs,
        reviewed_at: now,
      },
      transaction
    );

    const existingState =
      (await getUserState(user.id, cardId, { transaction })) ||
      createInitialState({ user_id: user.id, card_id: cardId, deck_id: deckId, due_at: now });

    const nextState = applyReview(existingState, grade, now);

    await upsertUserState(
      {
        user_id: user.id,
        card_id: cardId,
        deck_id: deckId,
        status: nextState.status,
        ease_factor: nextState.ease_factor,
        interval_days: nextState.interval_days,
        repetitions: nextState.repetitions,
        lapses: nextState.lapses,
        due_at: nextState.due_at,
        last_reviewed_at: nextState.last_reviewed_at,
      },
      transaction
    );

    await transaction.commit();
    return { state: nextState, idempotent: false };
  } catch (error) {
    await transaction.rollback();
    if (error instanceof UniqueConstraintError) {
      const persistedState = await getUserState(user.id, cardId);
      const safeState = persistedState
        ? ensureState(persistedState)
        : createInitialState({
            user_id: user.id,
            card_id: cardId,
            deck_id: deckId,
            due_at: now,
          });
      return { state: safeState, idempotent: true };
    }
    throw error;
  }
};

const loadLessonContext = async (lessonId) => {
  const lesson = await Lesson.findOne({
    where: { lesson_id: lessonId },
    include: [
      {
        model: Section,
        as: "section",
        include: [{ model: Course, as: "course" }],
      },
    ],
  });
  return lesson;
};

const assertLessonEditable = async (lessonId, user) => {
  const lesson = await loadLessonContext(lessonId);
  if (!lesson) {
    const error = new Error("Lesson not found");
    error.status = 404;
    throw error;
  }
  const course = lesson.section?.course;
  if (!course) {
    const error = new Error("Lesson course context missing");
    error.status = 404;
    throw error;
  }
  if (!isAdmin(user.role) && course.instructor_id !== user.id) {
    const error = new Error("Bạn không có quyền chỉnh sửa bài học này");
    error.status = 403;
    throw error;
  }
  return { lesson, course };
};
const listLessonDecksService = async ({ user, lessonId }) => {
  await assertLessonEditable(lessonId, user);
  const decks = await listLessonDecksRaw({ lessonId });
  return decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    description: deck.description,
    language_pair: deck.language_pair,
    lesson_id: deck.lesson_id,
    total_cards: normalizeCount(deck.total_cards),
    visibility: deck.visibility,
    created_at: deck.created_at,
    updated_at: deck.updated_at,
  }));
};

const createLessonDeckService = async ({ user, lessonId, payload }) => {
  await assertLessonEditable(lessonId, user);
  const visibility = payload.visibility || "public";
  const deck = await createDeck({
    title: payload.title,
    description: payload.description,
    language_pair: payload.language_pair,
    visibility,
    owner_user_id: user.id,
    lesson_id: lessonId,
  });

  const cardRows = (payload.cards || [])
    .map((card) => ({
      front_text: card.front_text?.trim(),
      back_text: card.back_text?.trim(),
      ipa_text: card.ipa_text?.trim() || null,
      example_text: card.example_text?.trim() || null,
      audio_url: card.audio_url || null,
      image_url: card.image_url || null,
      tags: Array.isArray(card.tags)
        ? card.tags.filter((tag) => typeof tag === "string" && tag.trim())
        : [],
    }))
    .filter((card) => card.front_text && card.back_text)
    .map((card) => ({
      ...card,
      deck_id: deck.id,
      owner_user_id: user.id,
    }));

  if (cardRows.length) {
    await createCardsBulk(cardRows);
  }

  return deck;
};

const buildSummaryResponse = ({ stats, accuracy, reviewDates }) => ({
  total_cards: normalizeCount(stats?.total_cards),
  due_cards: normalizeCount(stats?.due_cards),
  new_cards: normalizeCount(stats?.new_cards),
  learned_cards: normalizeCount(stats?.learned_cards),
  accuracy_7d: toPercent(accuracy?.correct_7d, accuracy?.total_7d),
  accuracy_30d: toPercent(accuracy?.correct_30d, accuracy?.total_30d),
  streak_days: calculateStreak(reviewDates),
});

const getDeckSummaryService = async ({ user, deckId }) => {
  const deck = await getDeckById(deckId);
  assertDeckReadable(deck, user);
  const metrics = await getDeckSummaryMetrics({ deckId, userId: user.id });
  return buildSummaryResponse(metrics);
};

const getGlobalSummaryService = async ({ user }) => {
  const metrics = await getGlobalSummaryMetrics({ userId: user.id, role: user.role });
  return buildSummaryResponse(metrics);
};

module.exports = {
  listDecksService,
  createDeckService,
  getDeckService,
  updateDeckService,
  deleteDeckService,
  listCardsService,
  createCardService,
  updateCardService,
  deleteCardService,
  getReviewQueueService,
  submitReviewService,
  getDeckSummaryService,
  getGlobalSummaryService,
  listLessonDecksService,
  createLessonDeckService,
};
