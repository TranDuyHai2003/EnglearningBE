const { applyReview, createInitialState } = require("../srs");

describe("applyReview", () => {
  const now = new Date("2025-01-01T00:00:00Z");

  it("promotes a new card with a 'good' grade to 1 day interval", () => {
    const state = createInitialState({ user_id: 1, card_id: "c1", deck_id: "d1", due_at: now });
    const next = applyReview(state, "good", now);
    expect(next.status).toBe("review");
    expect(next.repetitions).toBe(1);
    expect(next.interval_days).toBe(1);
    expect(new Date(next.due_at).getTime()).toBe(
      new Date("2025-01-02T00:00:00.000Z").getTime()
    );
  });

  it("expands interval on consecutive good reviews", () => {
    const first = applyReview(
      createInitialState({ user_id: 1, card_id: "c2", deck_id: "d1", due_at: now }),
      "good",
      now
    );
    const second = applyReview(first, "good", now);
    expect(second.interval_days).toBeGreaterThanOrEqual(3);
  });

  it("resets repetitions and schedules soon when grading again", () => {
    const learned = {
      status: "review",
      ease_factor: 2.3,
      interval_days: 7,
      repetitions: 3,
      lapses: 1,
      due_at: now,
    };
    const next = applyReview(learned, "again", now);
    expect(next.status).toBe("learning");
    expect(next.repetitions).toBe(0);
    expect(next.lapses).toBe(2);
    expect(new Date(next.due_at).getTime()).toBe(
      new Date("2025-01-01T00:30:00.000Z").getTime()
    );
  });

  it("boosts interval on easy", () => {
    const state = {
      status: "review",
      ease_factor: 2.5,
      interval_days: 3,
      repetitions: 2,
      lapses: 0,
      due_at: now,
    };
    const next = applyReview(state, "easy", now);
    expect(next.interval_days).toBeGreaterThan(3);
    expect(next.ease_factor).toBeGreaterThan(state.ease_factor);
  });
});
