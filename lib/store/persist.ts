import "server-only";

import fs from "node:fs";
import path from "node:path";

// Unit tests point this at their own directory (vitest.config.ts) so they can
// never touch the dev server's store.
const DATA_PATH = process.env.AQUALITE_DATA_PATH
  ? path.join(process.env.AQUALITE_DATA_PATH, "store.json")
  : path.join(process.cwd(), ".data", "store.json");
const STATE_ROW_ID = 1;

type StoreDatabase = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
};

export async function readStoreJson(): Promise<string | null> {
  const db = await getStoreDatabase();
  if (db) {
    const row = await db
      .prepare("SELECT json FROM store_state WHERE id = ?")
      .bind(STATE_ROW_ID)
      .first<{ json: string }>();
    return row?.json ?? null;
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
    await db
      .prepare(
        "INSERT INTO store_state (id, json) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json",
      )
      .bind(STATE_ROW_ID, json)
      .run();
    return;
  }
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, json);
}

export async function deleteStoreJson(): Promise<void> {
  const db = await getStoreDatabase();
  if (db) {
    await db.prepare("DELETE FROM store_state WHERE id = ?").bind(STATE_ROW_ID).run();
    return;
  }
  await fs.promises.rm(DATA_PATH, { force: true });
}

export async function usesRemoteStore(): Promise<boolean> {
  return (await getStoreDatabase()) !== null;
}

let _dbCache: StoreDatabase | null | undefined = undefined;

async function getStoreDatabase(): Promise<StoreDatabase | null> {
  if (_dbCache !== undefined) return _dbCache;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext();
    const db = (env as { DB?: StoreDatabase }).DB;
    _dbCache = db ?? null;
  } catch {
    _dbCache = null;
  }
  return _dbCache;
}
