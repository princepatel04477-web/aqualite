import "server-only";

import fs from "node:fs";
import path from "node:path";

// Unit tests point this at their own directory (vitest.config.ts) so they can
// never touch the dev server's store.
const DATA_PATH = process.env.AQUALITE_DATA_PATH
  ? path.join(process.env.AQUALITE_DATA_PATH, "store.json")
  : path.join(process.cwd(), ".data", "store.json");
const STATE_ROW_ID = 1;
const D1_TIMEOUT_MS = 5000;

type StoreDatabase = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
    run(): Promise<unknown>;
  };
};

function withTimeout<T>(promise: Promise<T>, ms = D1_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Store D1 query timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function ensureTable(db: StoreDatabase): Promise<void> {
  await withTimeout(
    db
      .prepare(
        "CREATE TABLE IF NOT EXISTS store_state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL)",
      )
      .run(),
  );
}

export function localStoreMtime(): number {
  try {
    return fs.statSync(DATA_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

export async function readStoreJson(): Promise<string | null> {
  const db = await getStoreDatabase();
  if (db) {
    try {
      const row = await withTimeout(
        db
          .prepare("SELECT json FROM store_state WHERE id = ?")
          .bind(STATE_ROW_ID)
          .first<{ json: string }>(),
      );
      return row?.json ?? null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("no such table")) {
        await ensureTable(db);
        return null;
      }
      throw error;
    }
  }
  try {
    return fs.readFileSync(DATA_PATH, "utf8");
  } catch {
    return null;
  }
}

export async function writeStoreJson(json: string): Promise<void> {
  const db = await getStoreDatabase();
  if (db) {
    const upsert = () =>
      withTimeout(
        db
          .prepare(
            "INSERT INTO store_state (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json",
          )
          .bind(STATE_ROW_ID, json)
          .run(),
      );
    try {
      await upsert();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("no such table")) {
        await ensureTable(db);
        await upsert();
        return;
      }
      throw error;
    }
    return;
  }
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, json);
}

export async function deleteStoreJson(): Promise<void> {
  const db = await getStoreDatabase();
  if (db) {
    try {
      await withTimeout(db.prepare("DELETE FROM store_state WHERE id = ?").bind(STATE_ROW_ID).run());
    } catch {
      // Ignore if table does not exist yet
    }
    return;
  }
  await fs.promises.rm(DATA_PATH, { force: true });
}

export async function usesRemoteStore(): Promise<boolean> {
  return (await getStoreDatabase()) !== null;
}

function isWorkerRuntime(): boolean {
  if (process.env.OPEN_NEXT_CF_DEV === "1") return true;
  if (typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers") return true;
  if (typeof process !== "undefined" && process.versions && "workerd" in process.versions) return true;
  return false;
}

async function getStoreDatabase(): Promise<StoreDatabase | null> {
  if (!isWorkerRuntime()) return null;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const db = (env as { DB?: StoreDatabase }).DB;
    return db ?? null;
  } catch {
    return null;
  }
}
