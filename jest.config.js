module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src/modules"],
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: ["src/modules/**/*.js", "!src/modules/**/__tests__/**"],
  watchman: false,
};
