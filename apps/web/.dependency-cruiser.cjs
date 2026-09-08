const path = require("node:path");

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: "../../.dependency-cruiser.cjs",
  options: {
    // Resolves the '@/*' path alias declared in this app's tsconfig.json.
    // Uses a webpack-shaped config (read for its 'resolve' field only - no
    // webpack package involved) instead of options.tsConfig, since that route
    // depends on TypeScript being importable within dependency-cruiser's own
    // supported version range and on tsconfig 'baseUrl' - both of which are
    // going away in TypeScript 7.
    webpackConfig: {
      fileName: path.join(__dirname, "webpack.dependency-cruiser.cjs"),
    },
    // 'api' is resolved directly to apps/api/src/app.ts (type-only import,
    // erased at build time) instead of through a package.json dependency.
    // Treat it like a package boundary: record the edge but don't cruise
    // into apps/api's own module graph from here (it's checked separately).
    doNotFollow: {
      path: ["node_modules", "^\\.\\./api/"],
    },
  },
};
