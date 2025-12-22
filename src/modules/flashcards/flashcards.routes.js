const express = require("express");
const { authMiddleware } = require("../../middleware/auth");
const {
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
} = require("./flashcards.controller");
const { allowRoles } = require("../../middleware/roles");

const router = express.Router();

router.use(authMiddleware);

router.get("/decks", listDecks);
router.post("/decks", createDeck);
router.get("/decks/:deckId", getDeck);
router.patch("/decks/:deckId", updateDeck);
router.delete("/decks/:deckId", deleteDeck);

router.get("/decks/:deckId/cards", listCards);
router.post("/decks/:deckId/cards", createCard);
router.patch("/cards/:cardId", updateCard);
router.delete("/cards/:cardId", deleteCard);

router.get("/decks/:deckId/review/queue", getReviewQueue);
router.post("/review", submitReview);

router.get("/summary", getGlobalSummary);
router.get("/decks/:deckId/summary", getDeckSummary);
router.get(
  "/lessons/:lessonId/decks",
  allowRoles("instructor", "system_admin"),
  listLessonDecks
);
router.post(
  "/lessons/:lessonId/decks",
  allowRoles("instructor", "system_admin"),
  createLessonDeck
);

module.exports = router;
