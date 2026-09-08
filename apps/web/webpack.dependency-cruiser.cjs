const path = require("node:path");

module.exports = {
  resolve: {
    alias: {
      "@": __dirname,
      api: path.join(__dirname, "../api/src/app.ts"),
    },
  },
};
