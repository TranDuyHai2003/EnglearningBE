const { parseRange, RangeNotSatisfiableError } = require("../videos.stream");

describe("parseRange", () => {
  it("parses open-ended range", () => {
    expect(parseRange("bytes=0-")).toEqual({ start: 0, end: undefined });
  });

  it("parses bounded range", () => {
    expect(parseRange("bytes=100-200")).toEqual({ start: 100, end: 200 });
  });

  it("throws on invalid syntax", () => {
    expect(() => parseRange("bytes=abc-def")).toThrow(RangeNotSatisfiableError);
  });

  it("throws when end < start", () => {
    expect(() => parseRange("bytes=200-100")).toThrow(RangeNotSatisfiableError);
  });

  it("throws when header missing prefix", () => {
    expect(() => parseRange("0-100")).toThrow(RangeNotSatisfiableError);
  });
});
