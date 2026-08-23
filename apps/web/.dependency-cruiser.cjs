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
  },
};
