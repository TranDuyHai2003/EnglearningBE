const { z } = require("zod");

const lookupSchema = z.object({
  term: z
    .string()
    .optional()
    .transform((val) => val ?? "")
    .default(""),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

const entrySchema = z.object({
  entryId: z.coerce.number().int().positive(),
});

const validate = (schema, payload) => schema.parse(payload);

module.exports = {
  lookupSchema,
  entrySchema,
  validate,
};
