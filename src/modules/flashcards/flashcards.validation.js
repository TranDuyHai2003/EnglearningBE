const { z } = require("zod");

const uuidSchema = z.string().uuid();

const createDeckSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  language_pair: z.string().min(2).max(20),
});

const updateDeckSchema = createDeckSchema.partial();

const createCardSchema = z
  .object({
    front_text: z.string().min(1),
    back_text: z.string().min(1),
    ipa_text: z.string().optional().nullable(),
    example_text: z.string().optional().nullable(),
    audio_url: z
    .string()
    .url()
    .or(z.literal(""))
    .optional()
    .nullable(),
    image_url: z
      .string()
      .url()
      .or(z.literal(""))
      .optional()
      .nullable(),
    tags: z.array(z.string()).max(20).optional().default([]),
    dict_entry_id: z
      .preprocess((value) => {
        if (value === null || value === undefined || value === "") return null;
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
      }, z.number().int().positive().nullable())
      .optional(),
    dict_sense_ids: z
      .array(
        z.preprocess((value) => {
          const num = Number(value);
          return Number.isNaN(num) ? value : num;
        }, z.number().int().positive())
      )
      .max(5)
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dict_sense_ids?.length && !data.dict_entry_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dict_entry_id"],
        message: "Dictionary entry is required when sense IDs are provided",
      });
    }
  });

const updateCardSchema = createCardSchema.partial();

const reviewSchema = z.object({
  deckId: uuidSchema,
  cardId: uuidSchema,
  grade: z.enum(["again", "hard", "good", "easy"]),
  idempotencyKey: z.string().min(8).max(128),
  durationMs: z.number().int().nonnegative().max(120000).optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(500).default(20),
  cursor: z.string().optional(),
});

const queueSchema = z.object({
  deckId: uuidSchema,
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const deckSummarySchema = z.object({
  deckId: uuidSchema,
});

const lessonParamSchema = z.object({
  lessonId: z.coerce.number().int().positive(),
});

const cardInputSchema = z.object({
  front_text: z.string().min(1),
  back_text: z.string().min(1),
  ipa_text: z.string().optional().nullable(),
  example_text: z.string().optional().nullable(),
  audio_url: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .nullable(),
  image_url: z
    .string()
    .url()
    .optional()
    .or(z.literal(""))
    .nullable(),
  tags: z.array(z.string()).max(10).optional().default([]),
});

const createLessonDeckSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  language_pair: z.string().min(2).max(20),
  visibility: z.enum(["private", "unlisted", "public"]).optional(),
  cards: z.array(cardInputSchema).max(50).optional(),
});

const validate = (schema, payload) => schema.parse(payload);

module.exports = {
  validate,
  createDeckSchema,
  updateDeckSchema,
  createCardSchema,
  updateCardSchema,
  reviewSchema,
  paginationSchema,
  queueSchema,
  deckSummarySchema,
  lessonParamSchema,
  createLessonDeckSchema,
};
