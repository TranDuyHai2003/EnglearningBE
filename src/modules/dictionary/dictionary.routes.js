const express = require("express");
const { optionalAuth } = require("../../middleware/auth");
const {
  lookupDictionary,
  getDictionaryEntry,
} = require("./dictionary.controller");

const router = express.Router();

router.use(optionalAuth);

router.get("/lookup", lookupDictionary);
router.get("/entry/:entryId", getDictionaryEntry);

module.exports = router;
