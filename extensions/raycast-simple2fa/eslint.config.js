const raycast = require("@raycast/eslint-config");

module.exports = [
  { ignores: ["build/**", "raycast-env.d.ts"] },
  ...raycast,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["eslint.config.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
];
