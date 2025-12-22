const {
  normalizeWhitespace,
  normalizeTerm,
  mapPosLabelToTag,
} = require("../dictionary.utils");

describe("dictionary utils", () => {
  test("normalizeWhitespace collapses spaces", () => {
    expect(normalizeWhitespace("  xin   chào  ")).toBe("xin chào");
  });

  test("normalizeTerm lowercases and trims", () => {
    expect(normalizeTerm("  Apple  Pie ")).toBe("apple pie");
  });

  test.each([
    ["danh từ", "noun"],
    ["động từ", "verb"],
    ["TÍNH TỪ", "adj"],
    ["giới từ", "prep"],
    ["từ không rõ", "pos:tu khong ro"],
    ["", "pos:unknown"],
  ])("mapPosLabelToTag(%s)", (input, expected) => {
    expect(mapPosLabelToTag(input)).toBe(expected);
  });
});
