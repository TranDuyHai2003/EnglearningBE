const {
  searchDictionaryEntries,
  findEntryById,
  fetchEntryDetailRows,
  fetchSenseOwnership,
} = require("./dictionary.repo");
const {
  mapPosLabelToTag,
  normalizeTerm,
} = require("./dictionary.utils");

const lookupDictionaryService = async ({ term, limit }) => {
  const normalized = normalizeTerm(term || "");
  if (!normalized) {
    return { term: "", items: [] };
  }
  const items = await searchDictionaryEntries({
    normalizedTerm: normalized,
    limit,
  });
  return { term: normalized, items };
};

const buildEntryDetail = (entry, rows) => {
  const posMap = new Map();

  rows.forEach((row) => {
    if (!posMap.has(row.pos_id)) {
      posMap.set(row.pos_id, {
        id: row.pos_id,
        pos: row.pos_label,
        posTag: mapPosLabelToTag(row.pos_label),
        posMeta: row.pos_meta,
        senses: new Map(),
      });
    }
    const posBlock = posMap.get(row.pos_id);
    if (!row.sense_id) {
      return;
    }
    if (!posBlock.senses.has(row.sense_id)) {
      posBlock.senses.set(row.sense_id, {
        id: row.sense_id,
        senseText: row.sense_text,
        tags: Array.isArray(row.sense_tags) ? row.sense_tags : [],
        examples: [],
      });
    }
    const sense = posBlock.senses.get(row.sense_id);
    if (row.example_id && row.example_en) {
      sense.examples.push({
        id: row.example_id,
        en: row.example_en,
        vi: row.example_vi || null,
      });
    }
  });

  return {
    id: entry.id,
    headword: entry.headword,
    pronunciation: entry.pronunciation,
    raw_header: entry.raw_header,
    pos: Array.from(posMap.values()).map((pos) => ({
      id: pos.id,
      pos: pos.pos,
      posTag: pos.posTag,
      posMeta: pos.posMeta,
      senses: Array.from(pos.senses.values()),
    })),
  };
};

const getEntryDetailService = async ({ entryId, exampleLimit = 5 }) => {
  const entry = await findEntryById(entryId);
  if (!entry) {
    const error = new Error("Dictionary entry not found");
    error.status = 404;
    throw error;
  }
  const rows = await fetchEntryDetailRows({ entryId, exampleLimit });
  return buildEntryDetail(entry, rows);
};

const ensureSenseOwnership = async ({ entryId, senseIds }) => {
  if (!senseIds || !senseIds.length) {
    return [];
  }
  const ownedIds = await fetchSenseOwnership({ entryId, senseIds });
  if (!ownedIds) {
    const error = new Error("Dictionary senses do not belong to the provided entry");
    error.status = 400;
    throw error;
  }
  return ownedIds;
};

module.exports = {
  lookupDictionaryService,
  getEntryDetailService,
  ensureSenseOwnership,
};
