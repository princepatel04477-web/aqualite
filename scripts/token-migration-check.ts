/**
 * AQUALITE token migration check (S01).
 *
 * Scans app/, components/, lib/ (and emails/ when it exists) and enforces
 * the two laws of the Ivory & Red migration:
 *
 *   1. RAW HEX LIVES ONLY IN styles/tokens.css — any other #rrggbb in
 *      source fails the run. Data hex on glowHex/haloHex lines (hero
 *      content values, preserved by S03) is reported as allowed.
 *   2. RETIRED DEEP WATER TOKEN NAMES SURVIVE ONLY THROUGH THE ALIAS LAYER
 *      in styles/tokens.css — every remaining usage is listed per file so
 *      each phase can see what is left to migrate.
 *
 * Usage:
 *   npm run tokens:check                         # report aliases, fail on raw hex
 *   npm run tokens:check -- --strict-storefront  # + fail on storefront aliases (S02 gate)
 *   npm run tokens:check -- --strict             # + fail on ANY alias (S04 gate)
 *
 * Aliases are read from styles/tokens.css itself (`--name: var(--other);`),
 * so the script can never drift from the token file.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "emails"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".json", ".html"]);
/* Words that may prefix a token name in a Tailwind class (bg-abyss, hover:text-mist…) */
const CLASS_PREFIXES =
  "(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|shadow|decoration|placeholder|selection|caret|accent)";
/* Data hex: per-slide glow/halo colours are content values, not theme colours */
const DATA_HEX = /glowHex|glow_hex|haloHex|halo_hex/;
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

type AliasMap = Record<string, string>;
type Finding = { file: string; line: number; text: string };

/** Parse the alias layer out of styles/tokens.css: `--old: var(--new);` */
function readAliases(): AliasMap {
  const source = readFileSync(path.join(ROOT, "styles", "tokens.css"), "utf8");
  const aliases: AliasMap = {};
  const pattern = /^\s*(--[a-z0-9-]+):\s*var\(--([a-z0-9-]+)\);/gm;
  for (const match of source.matchAll(pattern)) {
    const name = match[1];
    const target = match[2];
    if (name && target) aliases[name.slice(2)] = target;
  }
  return aliases;
}

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry))) {
      out.push(full);
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Non-global patterns — used with .test() per line (global regexes are
   stateful across .test() calls and would skip lines). */
function buildTokenPattern(aliases: AliasMap): RegExp {
  const names = Object.keys(aliases)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`(?<![\\w-])--(?:${names})(?![\\w-])`);
}

function buildClassPattern(aliases: AliasMap): RegExp {
  const names = Object.keys(aliases)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  return new RegExp(`(?<![\\w-])${CLASS_PREFIXES}-(?:${names})(?![\\w-])`);
}

function rel(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function main(): void {
  const flags = new Set(process.argv.slice(2));
  const strictStorefront = flags.has("--strict-storefront");
  const strict = flags.has("--strict");
  if (flags.has("--help") || flags.has("-h")) {
    process.stdout.write(
      "Usage: npm run tokens:check [-- --strict-storefront] [-- --strict]\n" +
        "  (default)           report alias usage, fail on raw hex\n" +
        "  --strict-storefront fail on storefront alias usage (admin allowed) — S02 gate\n" +
        "  --strict            fail on any alias usage — S04 gate\n",
    );
    return;
  }

  const aliases = readAliases();
  if (Object.keys(aliases).length === 0) {
    process.stderr.write("✗ No alias layer found in styles/tokens.css — did it get deleted early?\n");
    process.exit(1);
  }
  const tokenPattern = buildTokenPattern(aliases);
  const classPattern = buildClassPattern(aliases);

  const files: string[] = [];
  const missing: string[] = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (existsSync(full)) walk(full, files);
    else missing.push(`${dir}/`);
  }

  const aliasUsages: Finding[] = [];
  const hexFindings: Finding[] = [];
  const dataHex: Finding[] = [];
  const definitions: Finding[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    lines.forEach((text, index) => {
      const line = index + 1;
      const relFile = rel(file);
      if (tokenPattern.test(text) || classPattern.test(text)) {
        aliasUsages.push({ file: relFile, line, text: text.trim() });
      }
      if (/^\s*--[a-z0-9-]+:\s*\S/.test(text)) {
        definitions.push({ file: relFile, line, text: text.trim() });
      }
      for (const hit of text.matchAll(HEX)) {
        void hit;
        if (DATA_HEX.test(text)) dataHex.push({ file: relFile, line, text: text.trim() });
        else hexFindings.push({ file: relFile, line, text: text.trim() });
      }
    });
  }

  const byFile = new Map<string, number>();
  for (const finding of aliasUsages) byFile.set(finding.file, (byFile.get(finding.file) ?? 0) + 1);
  const storefrontUsages = aliasUsages.filter(
    (finding) => !finding.file.startsWith("app/admin/") && !finding.file.startsWith("components/admin/"),
  );

  const scanned = SCAN_DIRS.filter((dir) => !missing.includes(`${dir}/`)).join(", ");
  process.stdout.write("AQUALITE token migration check\n");
  process.stdout.write(`scanned ${files.length} files in ${scanned}\n`);
  if (missing.length) process.stdout.write(`skipped missing: ${missing.join(" ")}\n`);
  process.stdout.write("\n");

  process.stdout.write(
    `Alias usage — ${aliasUsages.length} references in ${byFile.size} files (expected until S02/S04):\n`,
  );
  for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    process.stdout.write(`  ${String(count).padStart(4)}  ${file}\n`);
  }
  if (aliasUsages.length === 0) {
    process.stdout.write("  (none — the alias layer can be removed from styles/tokens.css)\n");
  }
  process.stdout.write("\n");

  if (dataHex.length > 0) {
    process.stdout.write(`Data hex — ${dataHex.length} allowed glow/halo content values:\n`);
    for (const finding of dataHex) process.stdout.write(`  ${finding.file}:${finding.line}\n`);
    process.stdout.write("\n");
  }

  let failed = false;

  if (definitions.length > 0) {
    process.stdout.write(
      `✗ ${definitions.length} custom-property definition(s) outside styles/tokens.css (colours belong in the token file):\n`,
    );
    for (const finding of definitions.slice(0, 20)) {
      process.stdout.write(`  ${finding.file}:${finding.line}  ${finding.text.slice(0, 120)}\n`);
    }
    failed = true;
  }

  if (hexFindings.length > 0) {
    process.stdout.write(`✗ Raw hex outside styles/tokens.css — ${hexFindings.length} finding(s):\n`);
    for (const finding of hexFindings.slice(0, 50)) {
      process.stdout.write(`  ${finding.file}:${finding.line}  ${finding.text.slice(0, 120)}\n`);
    }
    if (hexFindings.length > 50) process.stdout.write(`  … and ${hexFindings.length - 50} more\n`);
    failed = true;
  }

  if (strict || strictStorefront) {
    const blocked = strict ? aliasUsages : storefrontUsages;
    if (blocked.length > 0) {
      const gate = strict ? "--strict (S04 gate)" : "--strict-storefront (S02 gate)";
      process.stdout.write(`✗ Alias usage blocked by ${gate} — ${blocked.length} reference(s):\n`);
      const shown = new Set<string>();
      for (const finding of blocked) {
        const key = `${finding.file}:${finding.line}`;
        if (shown.has(key)) continue;
        shown.add(key);
        process.stdout.write(`  ${key}  ${finding.text.slice(0, 120)}\n`);
        if (shown.size >= 50) break;
      }
      process.stdout.write("  Migrate these to the Ivory & Red tokens.\n");
      failed = true;
    }
  }

  if (failed) {
    process.stdout.write("\n✗ tokens:check FAILED\n");
    process.exit(1);
  }
  const note = aliasUsages.length ? " (alias usage above is informational)" : "";
  process.stdout.write(`✓ No raw theme hex outside styles/tokens.css${note}.\n`);
}

main();
