const asyncHandler = require("../../utils/asyncHandler");
const {
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
} = require("./flashcards.service");
const {
  validate,
  createDeckSchema,
  updateDeckSchema,
  createCardSchema,
  updateCardSchema,
  reviewSchema,
  paginationSchema,
  queueSchema,
  lessonParamSchema,
  createLessonDeckSchema,
} = require("./flashcards.validation");

const listDecks = asyncHandler(async (req, res) => {
  const decks = await listDecksService({
    user: req.user,
    scope: req.query.scope,
    search: req.query.q,
  });
  res.json({ success: true, data: decks });
});

const createDeck = asyncHandler(async (req, res) => {
  const payload = validate(createDeckSchema, {
    title: req.body.title,
    description: req.body.description,
    visibility: req.body.visibility,
    language_pair: req.body.language_pair || req.body.languagePair,
  });
  const deck = await createDeckService({ user: req.user, payload });
  res.status(201).json({ success: true, data: deck });
});

const getDeck = asyncHandler(async (req, res) => {
  const result = await getDeckService({ user: req.user, deckId: req.params.deckId });
  res.json({ success: true, data: result });
});

const updateDeck = asyncHandler(async (req, res) => {
  const payload = validate(updateDeckSchema, {
    title: req.body.title,
    description: req.body.description,
    visibility: req.body.visibility,
    language_pair: req.body.language_pair || req.body.languagePair,
  });
  const deck = await updateDeckService({ user: req.user, deckId: req.params.deckId, payload });
  res.json({ success: true, data: deck });
});

const deleteDeck = asyncHandler(async (req, res) => {
  await deleteDeckService({ user: req.user, deckId: req.params.deckId });
  res.json({ success: true, message: "Deck deleted" });
});

const listCards = asyncHandler(async (req, res) => {
  const pagination = validate(paginationSchema, {
    limit: req.query.limit,
    cursor: req.query.cursor,
  });
  const result = await listCardsService({
    user: req.user,
    deckId: req.params.deckId,
    limit: pagination.limit,
    cursor: pagination.cursor,
  });
  res.json({ success: true, data: result.cards, nextCursor: result.nextCursor });
});

const createCard = asyncHandler(async (req, res) => {
  const payload = validate(createCardSchema, req.body);
  const card = await createCardService({
    user: req.user,
    deckId: req.params.deckId,
    payload,
  });
  res.status(201).json({ success: true, data: card });
});

const updateCard = asyncHandler(async (req, res) => {
  const payload = validate(updateCardSchema, req.body);
  const card = await updateCardService({
    user: req.user,
    cardId: req.params.cardId,
    payload,
  });
  res.json({ success: true, data: card });
});

const deleteCard = asyncHandler(async (req, res) => {
  await deleteCardService({ user: req.user, cardId: req.params.cardId });
  res.json({ success: true, message: "Card deleted" });
});

const getReviewQueue = asyncHandler(async (req, res) => {
  const { deckId } = req.params;
  const { limit } = validate(queueSchema, {
    deckId,
    limit: req.query.limit,
  });
  const queue = await getReviewQueueService({
    user: req.user,
    deckId,
    limit,
  });
  res.json({ success: true, data: queue });
});

const submitReview = asyncHandler(async (req, res) => {
  const body = {
    deckId: req.body.deckId || req.body.deck_id,
    cardId: req.body.cardId || req.body.card_id,
    grade: req.body.grade,
    idempotencyKey: req.body.idempotencyKey || req.body.idempotency_key,
    durationMs: req.body.durationMs || req.body.duration_ms,
  };
  const payload = validate(reviewSchema, body);
  const result = await submitReviewService({ user: req.user, payload });
  res.json({ success: true, data: result.state, idempotent: result.idempotent });
});

const getDeckSummary = asyncHandler(async (req, res) => {
  const summary = await getDeckSummaryService({
    user: req.user,
    deckId: req.params.deckId,
  });
  res.json({ success: true, data: summary });
});

const getGlobalSummary = asyncHandler(async (req, res) => {
  const summary = await getGlobalSummaryService({ user: req.user });
  res.json({ success: true, data: summary });
});

const listLessonDecks = asyncHandler(async (req, res) => {
  const { lessonId } = validate(lessonParamSchema, { lessonId: req.params.lessonId });
  const decks = await listLessonDecksService({
    user: req.user,
    lessonId,
  });
  res.json({ success: true, data: decks });
});

const createLessonDeck = asyncHandler(async (req, res) => {
  const { lessonId } = validate(lessonParamSchema, { lessonId: req.params.lessonId });
  const payload = validate(createLessonDeckSchema, req.body);
  const deck = await createLessonDeckService({
    user: req.user,
    lessonId,
    payload,
  });
  res.status(201).json({ success: true, data: deck });
});

module.exports = {
  listDecks,
  createDeck,
  getDeck,
  updateDeck,
  deleteDeck,
  listCards,
  createCard,
  updateCard,
  deleteCard,
  getReviewQueue,
  submitReview,
  getDeckSummary,
  getGlobalSummary,
  listLessonDecks,
  createLessonDeck,
};
