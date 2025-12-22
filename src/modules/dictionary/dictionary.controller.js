const asyncHandler = require("../../utils/asyncHandler");
const {
  lookupDictionaryService,
  getEntryDetailService,
} = require("./dictionary.service");
const {
  validate,
  lookupSchema,
  entrySchema,
} = require("./dictionary.validation");

const lookupDictionary = asyncHandler(async (req, res) => {
  const payload = validate(lookupSchema, {
    term: req.query.term || req.query.q || "",
    limit: req.query.limit,
  });
  const result = await lookupDictionaryService(payload);
  res.json({ success: true, data: result });
});

const getDictionaryEntry = asyncHandler(async (req, res) => {
  const { entryId } = validate(entrySchema, { entryId: req.params.entryId });
  const detail = await getEntryDetailService({ entryId, exampleLimit: 5 });
  res.json({ success: true, data: detail });
});

module.exports = {
  lookupDictionary,
  getDictionaryEntry,
};
