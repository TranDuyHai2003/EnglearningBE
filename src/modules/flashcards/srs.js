/**
 * Simplified SM-2 style spaced repetition implementation.
 *
 * We track ease_factor, interval_days, repetitions, lapses and due_at.
 *  - "Again" sends the card back to learning with a 10 minute retry window.
 *  - "Hard" schedules to a short interval (20% longer than the previous interval).
 *  - "Good" follows a 1d -> 3d -> ease_factor growth interval ladder.
 *  - "Easy" boosts ease and interval by 30%.
 * Ease factor is clamped to keep scheduling stable (1.3 - 3.0).
 */
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const BASE_EASE = 2.5;

const DEFAULT_STATE = {
  status: "new",
  ease_factor: BASE_EASE,
  interval_days: 0,
  repetitions: 0,
  lapses: 0,
  due_at: null,
  last_reviewed_at: null,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

const ensureState = (state = {}) => ({
  ...DEFAULT_STATE,
  ...state,
  ease_factor: state?.ease_factor ?? BASE_EASE,
  interval_days: state?.interval_days ?? 0,
  repetitions: state?.repetitions ?? 0,
  lapses: state?.lapses ?? 0,
  due_at: state?.due_at ? new Date(state.due_at) : new Date(),
  last_reviewed_at: state?.last_reviewed_at
    ? new Date(state.last_reviewed_at)
    : null,
});

const applyReview = (state, grade, now = new Date()) => {
  const current = ensureState(state);
  const next = { ...current };
  next.last_reviewed_at = now;

  switch (grade) {
    case "again": {
      next.status = "learning";
      next.repetitions = 0;
      next.interval_days = 0;
      next.lapses = current.lapses + 1;
      next.ease_factor = clamp(current.ease_factor - 0.2, MIN_EASE, MAX_EASE);
      next.due_at = addMinutes(now, current.repetitions === 0 ? 10 : 30);
      break;
    }
    case "hard": {
      next.status = current.repetitions > 0 ? "review" : "learning";
      next.ease_factor = clamp(current.ease_factor - 0.15, MIN_EASE, MAX_EASE);
      next.repetitions = Math.max(1, current.repetitions);
      const baseInterval = current.interval_days || 1;
      next.interval_days = Math.max(1, Math.round(baseInterval * 1.2));
      next.due_at = addDays(now, next.interval_days);
      break;
    }
    case "good": {
      next.status = "review";
      next.repetitions = current.repetitions + 1;
      next.ease_factor = clamp(current.ease_factor + 0.05, MIN_EASE, MAX_EASE);
      if (next.repetitions === 1) {
        next.interval_days = 1;
      } else if (next.repetitions === 2) {
        next.interval_days = 3;
      } else {
        next.interval_days = Math.max(
          1,
          Math.round((current.interval_days || 1) * next.ease_factor)
        );
      }
      next.due_at = addDays(now, next.interval_days);
      break;
    }
    case "easy": {
      next.status = "review";
      next.repetitions = current.repetitions + 1;
      next.ease_factor = clamp(current.ease_factor + 0.15, MIN_EASE, MAX_EASE);
      if (next.repetitions === 1) {
        next.interval_days = 3;
      } else if (next.repetitions === 2) {
        next.interval_days = 7;
      } else {
        next.interval_days = Math.max(
          1,
          Math.round((current.interval_days || 1) * next.ease_factor * 1.3)
        );
      }
      next.due_at = addDays(now, next.interval_days);
      break;
    }
    default:
      throw new Error(`Unsupported grade: ${grade}`);
  }

  return next;
};

const createInitialState = ({ user_id, card_id, deck_id, due_at }) => ({
  user_id,
  card_id,
  deck_id,
  status: "new",
  ease_factor: BASE_EASE,
  interval_days: 0,
  repetitions: 0,
  lapses: 0,
  due_at: due_at || new Date(),
  last_reviewed_at: null,
});

module.exports = {
  applyReview,
  createInitialState,
  ensureState,
  constants: { MIN_EASE, MAX_EASE, BASE_EASE },
};
