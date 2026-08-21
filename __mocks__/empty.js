// Used to stub out "server-only" for tests - see jest.config.ts's
// moduleNameMapper. jsdom provides a `window` global, which the real
// server-only package treats as "this is client code" and throws on.
module.exports = {};
