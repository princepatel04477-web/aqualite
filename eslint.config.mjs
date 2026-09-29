import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** AQUALITE — ESLint flat config (Next 16 / ESLint 9).
 *  Ports the old .eslintrc.cjs law on top of eslint-config-next:
 *  no-console, no-explicit-any, type-aware no-floating-promises,
 *  exhaustive-deps as error, unused-vars ignores ^_, and the motion
 *  import restrictions. `npm run lint` runs `eslint .`. */

const framerMessage = "Import from motion/react.";
const gsapMessage = "Import GSAP only from @/lib/motion/gsap.";
const gsapPattern = [{ group: ["gsap/*"], message: gsapMessage }];

const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "out/**", "build/**", "dist/**", "coverage/**", ".wrangler/**", "next-env.d.ts", "cloudflare-env.d.ts"],
  },
  {
    linterOptions: {
      /* disable directives are intentional documentation in this repo */
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    /* project-wide law */
    rules: {
      "no-console": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "framer-motion", message: framerMessage }],
        },
      ],
    },
  },
  {
    /* type-aware rules need the project (parser from eslint-config-next/typescript) */
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        sourceType: "module",
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["lib/motion/gsap.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "framer-motion", message: framerMessage },
            { name: "gsap", message: gsapMessage },
            { name: "gsap/ScrollTrigger", message: "Import ScrollTrigger from @/lib/motion/gsap." },
            { name: "gsap/SplitText", message: "Import SplitText from @/lib/motion/gsap." },
          ],
          patterns: gsapPattern,
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
            { name: "framer-motion", message: framerMessage },
            { name: "gsap", message: gsapMessage },
            {
              name: "@/lib/supabase/admin",
              message: "Service-role client is server-only and must not be imported from components.",
            },
          ],
          patterns: gsapPattern,
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
];

export default config;
