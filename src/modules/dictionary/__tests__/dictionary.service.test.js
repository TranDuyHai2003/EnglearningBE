jest.mock("../dictionary.repo", () => ({
  searchDictionaryEntries: jest.fn(),
  findEntryById: jest.fn(),
  fetchEntryDetailRows: jest.fn(),
  fetchSenseOwnership: jest.fn(),
}));

const {
  lookupDictionaryService,
  getEntryDetailService,
} = require("../dictionary.service");
const {
  searchDictionaryEntries,
  findEntryById,
  fetchEntryDetailRows,
} = require("../dictionary.repo");

describe("dictionary service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("lookupDictionaryService skips repo when term empty", async () => {
    const result = await lookupDictionaryService({ term: "   ", limit: 10 });
    expect(result.items).toEqual([]);
    expect(searchDictionaryEntries).not.toHaveBeenCalled();
  });

  test("lookupDictionaryService normalizes term", async () => {
    searchDictionaryEntries.mockResolvedValue([
      { id: 1, headword: "apple", pronunciation: "ˈæp.əl" },
    ]);
    const result = await lookupDictionaryService({ term: " Apple ", limit: 5 });
    expect(searchDictionaryEntries).toHaveBeenCalledWith({
      normalizedTerm: "apple",
      limit: 5,
    });
    expect(result.items).toHaveLength(1);
  });

  test("getEntryDetailService throws 404 when missing", async () => {
    findEntryById.mockResolvedValue(null);
    await expect(
      getEntryDetailService({ entryId: 999, exampleLimit: 5 })
    ).rejects.toMatchObject({ status: 404 });
  });

  test("getEntryDetailService builds nested structure", async () => {
    findEntryById.mockResolvedValue({
      id: 1,
      headword: "apple",
      pronunciation: "ˈæp.əl",
      raw_header: "@apple",
    });
    fetchEntryDetailRows.mockResolvedValue([
      {
        pos_id: 10,
        pos_label: "danh từ",
        pos_meta: null,
        sense_id: 100,
        sense_text: "quả táo",
        sense_tags: ["thường"],
        example_id: 500,
        example_en: "eat an apple",
        example_vi: "ăn táo",
      },
    ]);

    const result = await getEntryDetailService({ entryId: 1, exampleLimit: 3 });
    expect(result.pos[0].posTag).toBe("noun");
    expect(result.pos[0].senses[0].examples).toHaveLength(1);
  });
});
