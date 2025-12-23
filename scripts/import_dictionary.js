#!/usr/bin/env node

require("dotenv").config();
const fs = require("fs");
const readline = require("readline");
const { Client } = require("pg");
const {
  normalizeWhitespace,
  normalizeTerm,
} = require("../src/modules/dictionary/dictionary.utils");

const DEFAULT_FILE = "english-vietnamese.txt";
const PROGRESS_INTERVAL = 1000;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { truncate: false };

  for (const arg of args) {
    if (arg === "--truncate") {
      options.truncate = true;
    } else if (arg.startsWith("--file=")) {
      options.file = arg.split("=")[1];
    }
  }

  options.file = options.file || process.env.DICT_FILE || DEFAULT_FILE;
  return options;
};

const getClientConfig = () => {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  const host = process.env.PGHOST || process.env.DB_HOST || "localhost";
  const port =
    process.env.PGPORT || process.env.DB_PORT
      ? parseInt(process.env.PGPORT || process.env.DB_PORT, 10)
      : undefined;
  const user = process.env.PGUSER || process.env.DB_USER;
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.PGDATABASE || process.env.DB_NAME;
  return { host, port, user, password, database };
};

const splitExample = (text) => {
  const idx = text.indexOf("+");
  if (idx === -1) {
    return { en: text.trim(), vi: null };
  }
  return {
    en: text.slice(0, idx).trim(),
    vi: text.slice(idx + 1).trim() || null,
  };
};

const extractTags = (senseText) => {
  const tags = [];
  let text = senseText.trim();
  while (text.startsWith("(") && text.includes(")")) {
    const endIdx = text.indexOf(")");
    const tag = text.slice(1, endIdx).trim();
    if (tag) tags.push(tag);
    text = text.slice(endIdx + 1).trim();
  }
  return { text, tags };
};

const parseHeader = (line) => {
  const raw = line;
  let content = line.replace(/^@/, "").trim();
  let pronunciation = null;
  const firstSlash = content.indexOf("/");
  if (firstSlash !== -1) {
    const secondSlash = content.indexOf("/", firstSlash + 1);
    if (secondSlash !== -1) {
      pronunciation = content.slice(firstSlash + 1, secondSlash).trim();
      content = content.slice(0, firstSlash).trim();
    }
  }
  return {
    headword: normalizeWhitespace(content),
    pronunciation: pronunciation || null,
    raw_header: raw,
  };
};

const ensureCurrentPOS = (entry) => {
  if (!entry.currentPos) {
    const defaultPos = {
      pos: "unknown",
      meta: null,
      senses: [],
    };
    entry.posBlocks.push(defaultPos);
    entry.currentPos = defaultPos;
  }
};

const ensureCurrentSense = (entry) => {
  ensureCurrentPOS(entry);
  const pos = entry.currentPos;
  if (!pos.currentSense) {
    const placeholder = {
      text: "(unspecified)",
      tags: [],
      examples: [],
    };
    pos.senses.push(placeholder);
    pos.currentSense = placeholder;
  }
};

const createNewEntry = (headerLine) => {
  return {
    ...parseHeader(headerLine),
    posBlocks: [],
    currentPos: null,
    warnings: [],
  };
};

const finalizeEntry = async (entry, client, counters) => {
  if (!entry) return;
  if (!entry.headword) {
    counters.warnings += 1;
    return;
  }

  const entryRes = await client.query(
    `INSERT INTO dict_entry (headword, headword_norm, pronunciation, raw_header, created_at)
     VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
    [
      entry.headword,
      normalizeTerm(entry.headword),
      entry.pronunciation,
      entry.raw_header,
    ]
  );
  const entryId = entryRes.rows[0].id;
  counters.entries += 1;

  for (const posBlock of entry.posBlocks) {
    const posRes = await client.query(
      `INSERT INTO dict_pos (entry_id, pos, pos_meta)
       VALUES ($1, $2, $3) RETURNING id`,
      [entryId, posBlock.pos, posBlock.meta]
    );
    const posId = posRes.rows[0].id;
    counters.pos += 1;

    for (const sense of posBlock.senses) {
      const senseRes = await client.query(
        `INSERT INTO dict_sense (pos_id, sense_text, sense_tags)
         VALUES ($1, $2, $3) RETURNING id`,
        [posId, sense.text, sense.tags]
      );
      const senseId = senseRes.rows[0].id;
      counters.senses += 1;

      for (const example of sense.examples) {
        await client.query(
          `INSERT INTO dict_example (sense_id, example_en, example_vi)
           VALUES ($1, $2, $3)`,
          [senseId, example.en, example.vi]
        );
        counters.examples += 1;
      }
    }
  }

  if (counters.entries % PROGRESS_INTERVAL === 0) {
    console.log(`Imported ${counters.entries} entries...`);
  }
};

const truncateTables = async (client) => {
  await client.query(
    `TRUNCATE TABLE dict_example, dict_sense, dict_pos, dict_entry RESTART IDENTITY CASCADE`
  );
};

const assertEmptyTables = async (client) => {
  const res = await client.query(
    `SELECT SUM(count) AS total
     FROM (
       SELECT COUNT(*) AS count FROM dict_entry
       UNION ALL
       SELECT COUNT(*) FROM dict_pos
       UNION ALL
       SELECT COUNT(*) FROM dict_sense
       UNION ALL
       SELECT COUNT(*) FROM dict_example
     ) AS t`
  );
  const total = parseInt(res.rows[0].total, 10) || 0;
  if (total > 0) {
    throw new Error(
      "Dictionary tables are not empty. Run with --truncate to replace data."
    );
  }
};

const run = async () => {
  const options = parseArgs();
  const filePath = options.file;

  if (!fs.existsSync(filePath)) {
    console.error(`Dictionary file not found: ${filePath}`);
    process.exit(1);
  }

  const client = new Client(getClientConfig());
  await client.connect();

  try {
    if (options.truncate) {
      console.log("Truncating dictionary tables...");
      await truncateTables(client);
    } else {
      await assertEmptyTables(client);
    }

    await client.query("BEGIN");

    const counters = {
      entries: 0,
      pos: 0,
      senses: 0,
      examples: 0,
      warnings: 0,
    };

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });

    let currentEntry = null;

    const flushEntry = async () => {
      if (currentEntry) {
        await finalizeEntry(currentEntry, client, counters);
        currentEntry = null;
      }
    };

    let lineNumber = 0;
    for await (let line of rl) {
      lineNumber += 1;
      line = line.replace(/\r$/, "");
      if (lineNumber === 1) {
        line = line.replace(/^\uFEFF/, "");
      }
      if (!line) continue;
      const trimmed = line.trim();
      if (!trimmed) continue;

      const firstChar = trimmed[0];
      if (firstChar === "@") {
        await flushEntry();
        currentEntry = createNewEntry(trimmed);
        continue;
      }

      if (!currentEntry) {
        counters.warnings += 1;
        console.warn(`Warning: content before header at line ${lineNumber}`);
        continue;
      }

      switch (firstChar) {
        case "*": {
          const content = trimmed.slice(1).trim();
          const [posPart, ...metaParts] = content.split(",");
          const pos = normalizeWhitespace(posPart || "unknown");
          const meta = metaParts.length
            ? normalizeWhitespace(metaParts.join(","))
            : null;
          const posBlock = {
            pos: pos || "unknown",
            meta: meta || null,
            senses: [],
            currentSense: null,
          };
          currentEntry.posBlocks.push(posBlock);
          currentEntry.currentPos = posBlock;
          break;
        }
        case "-": {
          ensureCurrentPOS(currentEntry);
          const rawSense = normalizeWhitespace(trimmed.slice(1));
          const { text, tags } = extractTags(rawSense);
          const sense = {
            text: text || rawSense,
            tags,
            examples: [],
          };
          currentEntry.currentPos.senses.push(sense);
          currentEntry.currentPos.currentSense = sense;
          break;
        }
        case "=": {
          ensureCurrentSense(currentEntry);
          const exampleContent = trimmed.slice(1).trim();
          const { en, vi } = splitExample(exampleContent);
          if (!en) {
            counters.warnings += 1;
            console.warn(`Warning: empty example at line ${lineNumber}`);
            break;
          }
          currentEntry.currentPos.currentSense.examples.push({ en, vi });
          break;
        }
        default: {
          ensureCurrentSense(currentEntry);
          const appended = `${currentEntry.currentPos.currentSense.text} ${trimmed}`;
          currentEntry.currentPos.currentSense.text = normalizeWhitespace(
            appended
          );
          break;
        }
      }
    }

    await flushEntry();
    await client.query("COMMIT");

    console.log("\nImport completed:");
    console.log(`Entries: ${counters.entries}`);
    console.log(`POS blocks: ${counters.pos}`);
    console.log(`Senses: ${counters.senses}`);
    console.log(`Examples: ${counters.examples}`);
    console.log(`Warnings: ${counters.warnings}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
