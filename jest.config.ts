import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // Mirrors the "@/*" -> "./src/*" path alias in tsconfig.json - Jest's
    // module resolution doesn't read tsconfig paths on its own.
    "^@/(.*)$": "<rootDir>/src/$1",
    // "server-only" throws when it detects a `window` global, which jsdom
    // provides - stub it out so server-side modules can be imported in
    // tests without pulling in a live database.
    "^server-only$": "<rootDir>/__mocks__/empty.js",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/tests/e2e/",
  ],
  // Beyond just excluding test files, keep .next/ out of Jest's module
  // map entirely - a production build's .next/standalone/package.json
  // (Phase 6's output: "standalone") has the same "name" as the repo's
  // own package.json, which jest-haste-map otherwise reports as a
  // naming collision.
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/page.tsx",
    "!src/app/**/layout.tsx",
    "!src/components/ui/**",
  ],
};

// createJestConfig is exported this way so next/jest can load the async
// Next.js config (next.config.ts) first.
export default createJestConfig(config);
