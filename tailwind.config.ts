import type { Config } from "tailwindcss";

const color = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx}",
  ],
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      colors: {
        /* IVORY & RED v2 — channel tokens (all values owned by styles/tokens.css) */
        ivory: color("ivory"),
        paper: color("paper"),
        linen: color("linen"),
        porcelain: color("porcelain"),
        hairline: color("hairline"),
        rule: color("rule"),
        ink: color("ink"),
        "ink-2": color("ink-2"),
        muted: color("muted"),
        red: color("red"),
        "red-deep": color("red-deep"),
        "red-ink": color("red-ink"),
        "red-tint": color("red-tint"),
        "on-red": color("on-red"),
        success: color("success"),
        "success-tint": color("success-tint"),
        warning: color("warning"),
        "warning-tint": color("warning-tint"),
        danger: color("danger"),
        "danger-tint": color("danger-tint"),
        info: color("info"),
        "info-tint": color("info-tint"),
        /* TEMPORARY legacy Deep Water names — resolve through the alias layer
           in styles/tokens.css. Delete each entry as S02/S04 removes the last
           class using it (npm run tokens:check lists what is left). */
        abyss: color("abyss"),
        trench: color("trench"),
        shelf: color("shelf"),
        foam: color("foam"),
        mist: color("mist"),
        aqua: color("aqua"),
        "aqua-deep": color("aqua-deep"),
        sand: color("sand"),
        "ink-on-porcelain": color("ink-on-porcelain"),
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: ["var(--t-hero)", { lineHeight: "0.92", letterSpacing: "-0.035em" }],
        display: ["var(--t-display)", { lineHeight: "0.9", letterSpacing: "-0.04em" }],
        h1: ["var(--t-h1)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        h2: ["var(--t-h2)", { lineHeight: "1", letterSpacing: "-0.02em" }],
        h3: ["var(--t-h3)", { lineHeight: "1.1" }],
        lead: ["var(--t-lead)", { lineHeight: "1.5" }],
        body: ["var(--t-body)", { lineHeight: "1.6" }],
        small: ["var(--t-small)", { lineHeight: "1.5" }],
        eyebrow: ["var(--t-eyebrow)", { lineHeight: "1.4", letterSpacing: "0.16em" }],
        price: ["var(--t-price)", { lineHeight: "1.4" }],
        size: ["var(--t-size)", { lineHeight: "1.2" }],
        button: ["var(--t-button)", { lineHeight: "1", letterSpacing: "0.12em" }],
        logo: ["var(--t-logo)", { lineHeight: "1", letterSpacing: "-0.03em" }],
        mark: ["var(--t-mark)", { lineHeight: "0.8", letterSpacing: "-0.04em" }],
      },
      maxWidth: {
        page: "var(--page-max)",
        measure: "62ch",
      },
      spacing: {
        section: "var(--space-section)",
        page: "var(--page-pad)",
        gutter: "var(--gutter)",
      },
      borderRadius: {
        panel: "var(--radius-panel)",
        pill: "var(--radius-pill)",
        hub: "var(--radius-hub)",
        control: "var(--radius-control)",
      },
      boxShadow: {
        1: "var(--shadow-1)",
        2: "var(--shadow-2)",
        3: "var(--shadow-3)",
      },
      borderColor: {
        DEFAULT: "rgb(var(--rule) / <alpha-value>)",
      },
      zIndex: {
        base: "0",
        sticky: "20",
        header: "40",
        drawer: "60",
        overlay: "70",
        modal: "80",
        toast: "90",
        preloader: "100",
      },
      transitionTimingFunction: {
        tide: "var(--ease-tide)",
        surface: "var(--ease-surface)",
        drop: "var(--ease-drop)",
      },
      transitionDuration: {
        instant: "var(--dur-instant)",
        quick: "var(--dur-quick)",
        base: "var(--dur-base)",
        slow: "var(--dur-slow)",
        cinematic: "var(--dur-cinematic)",
      },
    },
  },
  plugins: [],
};

export default config;
