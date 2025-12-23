const { QueryTypes } = require("sequelize");
const { sequelize } = require("../../config/database");

const searchDictionaryEntries = async ({ normalizedTerm, limit }) => {
  const rows = await sequelize.query(
    `
    WITH exact AS (
      SELECT id, headword, pronunciation, 0::int AS priority
      FROM dict_entry
      WHERE headword_norm = :norm
      ORDER BY headword ASC
      LIMIT :limit
    ),
    prefix AS (
      SELECT id, headword, pronunciation, 1::int AS priority
      FROM dict_entry
      WHERE headword_norm LIKE :prefix
        AND headword_norm <> :norm
      ORDER BY headword ASC
      LIMIT :limit
    )
    SELECT DISTINCT ON (id) id, headword, pronunciation, priority
    FROM (
      SELECT * FROM exact
      UNION ALL
      SELECT * FROM prefix
    ) combined
    ORDER BY id, priority ASC
  `,
    {
      replacements: {
        norm: normalizedTerm,
        prefix: `${normalizedTerm}%`,
        limit,
      },
      type: QueryTypes.SELECT,
    }
  );

  return rows
    .sort((a, b) => {
      if (a.priority === b.priority) {
        return a.headword.localeCompare(b.headword);
      }
      return a.priority - b.priority;
    })
    .slice(0, limit)
    .map(({ priority, ...rest }) => rest);
};

const findEntryById = async (entryId) => {
  const rows = await sequelize.query(
    `SELECT id, headword, pronunciation, raw_header
     FROM dict_entry
     WHERE id = :entryId
     LIMIT 1`,
    { replacements: { entryId }, type: QueryTypes.SELECT }
  );
  return rows[0] || null;
};

const fetchEntryDetailRows = async ({ entryId, exampleLimit = 5 }) => {
  const rows = await sequelize.query(
    `
    SELECT
      p.id AS pos_id,
      p.pos AS pos_label,
      p.pos_meta AS pos_meta,
      s.id AS sense_id,
      s.sense_text AS sense_text,
      s.sense_tags AS sense_tags,
      ex.example_id,
      ex.example_en,
      ex.example_vi
    FROM dict_pos p
    LEFT JOIN dict_sense s
      ON s.pos_id = p.id
    LEFT JOIN LATERAL (
      SELECT e.id AS example_id, e.example_en, e.example_vi
      FROM dict_example e
      WHERE s.id IS NOT NULL AND e.sense_id = s.id
      ORDER BY e.id
      LIMIT :exampleLimit
    ) AS ex ON true
    WHERE p.entry_id = :entryId
    ORDER BY p.id ASC, s.id ASC, ex.example_id ASC
  `,
    {
      replacements: { entryId, exampleLimit },
      type: QueryTypes.SELECT,
    }
  );
  return rows;
};

const fetchSenseOwnership = async ({ entryId, senseIds }) => {
  if (!Array.isArray(senseIds) || !senseIds.length) {
    return [];
  }
  const rows = await sequelize.query(
    `SELECT s.id, p.entry_id
     FROM dict_sense s
     JOIN dict_pos p ON p.id = s.pos_id
     WHERE s.id IN (:senseIds)`,
    {
      replacements: { senseIds },
      type: QueryTypes.SELECT,
    }
  );
  const allBelongToEntry =
    rows.length === senseIds.length &&
    rows.every((row) => Number(row.entry_id) === Number(entryId));

  if (!allBelongToEntry) {
    return null;
  }
  return rows.map((row) => Number(row.id));
};

module.exports = {
  searchDictionaryEntries,
  findEntryById,
  fetchEntryDetailRows,
  fetchSenseOwnership,
};
