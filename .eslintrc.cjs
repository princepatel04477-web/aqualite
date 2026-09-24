/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  extends: ["next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "react-hooks/exhaustive-deps": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "framer-motion",
            message: "Import from motion/react.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx}"],
      excludedFiles: ["lib/motion/gsap.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "framer-motion",
                message: "Import from motion/react.",
              },
              {
                name: "gsap",
                message: "Import gsap from @/lib/motion/gsap.",
              },
              {
                name: "gsap/ScrollTrigger",
                message: "Import ScrollTrigger from @/lib/motion/gsap.",
              },
              {
                name: "gsap/SplitText",
                message: "Import SplitText from @/lib/motion/gsap.",
              },
            ],
            patterns: [
              {
                group: ["gsap/*"],
                message: "Import GSAP only from @/lib/motion/gsap.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["components/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            paths: [
              {
                name: "framer-motion",
                message: "Import from motion/react.",
              },
              {
                name: "gsap",
                message: "Import GSAP only from @/lib/motion/gsap.",
              },
              {
                name: "@/lib/supabase/admin",
                message: "Service-role client is server-only and must not be imported from components.",
              },
            ],
            patterns: [
              {
                group: ["gsap/*"],
                message: "Import GSAP only from @/lib/motion/gsap.",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["lib/logger.ts"],
      rules: {
        "no-console": "off",
      },
    },
    {
      files: ["scripts/**/*.{js,mjs,ts}", "tests/**/*.{ts,tsx}", "playwright.config.ts"],
      rules: {
        "no-console": "off",
        "@typescript-eslint/no-floating-promises": "off",
      },
    },
  ],
};
