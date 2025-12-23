const normalizeWhitespace = (value = "") => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
};

const normalizeTerm = (value = "") => {
  const trimmed = normalizeWhitespace(value);
  return trimmed.toLowerCase();
};

const stripDiacritics = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const POS_MAP = {
  "danh tu": "noun",
  "dong tu": "verb",
  "tinh tu": "adj",
  "pho tu": "adv",
  "mao tu": "article",
  "gioi tu": "prep",
  "dai tu": "pronoun",
  "lien tu": "conj",
  "tham tu": "interj",
};

const mapPosLabelToTag = (label) => {
  if (!label) return "pos:unknown";
  const canonical = stripDiacritics(label.toLowerCase())
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
  return POS_MAP[canonical] || `pos:${canonical || "unknown"}`;
};

module.exports = {
  normalizeWhitespace,
  normalizeTerm,
  mapPosLabelToTag,
};
