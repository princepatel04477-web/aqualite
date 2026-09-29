import { gzipSync } from "zlib";
import { readFileSync } from "fs";
import path from "path";
import { beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/api/track/route";
import { buildEvent, hashIpDaily, isBot, trackBatchSchema } from "@/lib/analytics/track";
import { catalogProducts, listEvents, recordEvents, resetDemo } from "@/lib/store/engine";

const NOW = new Date().toISOString();

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/track", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/125 Safari/537.36",
      "x-forwarded-for": "203.0.113.9",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function event(over: Record<string, unknown> = {}) {
  return {
    id: `evt_${Math.random().toString(36).slice(2)}`,
    type: "page_view",
    path: "/collections/slides",
    sid: "sess_1",
    at: NOW,
    ...over,
  };
}

describe("beacon payload discipline", () => {
  it("stays under 1 KB gzipped", () => {
    const source = readFileSync(path.resolve(__dirname, "../../lib/analytics/beacon.ts"), "utf8");
    expect(gzipSync(Buffer.from(source)).length).toBeLessThan(1024);
  });

  it("zod schema accepts a single event and small batches, rejects junk", () => {
    expect(trackBatchSchema.safeParse(event()).success).toBe(true);
    expect(trackBatchSchema.safeParse([event(), event({ type: "purchase", orderId: "o1", valuePaise: 100 })]).success).toBe(true);
    expect(trackBatchSchema.safeParse({}).success).toBe(false);
    expect(trackBatchSchema.safeParse(event({ type: "launch_missiles" })).success).toBe(false);
    expect(trackBatchSchema.safeParse(new Array(30).fill(0).map(() => event())).success).toBe(false);
  });

  it("buildEvent keeps the ip out of the row and hashes it per day", () => {
    const built = buildEvent(
      { id: "evt_one11", type: "page_view", path: "/x", sid: "sess_1" },
      { userAgent: "Mozilla/5.0 (iPhone)", ip: "198.51.100.4" },
    );
    expect(built.ipHash).toHaveLength(20);
    expect(built.ipHash).not.toContain("198.51.100.4");
    expect(built.device).toBe("mobile");
    expect(built.month).toBe(NOW.slice(0, 7));
    expect(hashIpDaily("198.51.100.4")).toBe(hashIpDaily("198.51.100.4"));
    expect(hashIpDaily("198.51.100.4")).not.toBe(hashIpDaily("198.51.100.5"));
  });

  it("filters known bots", () => {
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/125 Safari/537.36")).toBe(false);
  });
});

describe("ingest route", () => {
  beforeEach(async () => {
    await resetDemo();
  });

  it("accepts events and resolves the PDP product server-side", async () => {
    const products = await catalogProducts();
    const product = products[0];
    if (!product) throw new Error("catalog seed missing");
    const response = await POST(request(event({ path: `/product/${product.slug}` })));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; accepted: number };
    expect(body.ok).toBe(true);
    expect(body.accepted).toBe(1);

    const stored = await listEvents("2000-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z");
    expect(stored).toHaveLength(1);
    expect(stored[0]?.ipHash).toHaveLength(20);
    expect(stored[0]?.type).toBe("page_view");
    expect(stored[0]?.productId).toBe(product.id);
  });

  it("bots are ignored without an error", async () => {
    const response = await POST(
      request(event(), { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ignored?: boolean };
    expect(body.ignored).toBe(true);
  });

  it("rejects invalid payloads with 400", async () => {
    const response = await POST(request({ bogus: true }));
    expect(response.status).toBe(400);
  });

  it("dedupes repeated event ids", async () => {
    const shared = event();
    await POST(request(shared));
    const response = await POST(request(shared));
    const body = (await response.json()) as { accepted: number; duplicates: number };
    expect(body.duplicates).toBe(1);
    expect(body.accepted).toBe(0);
  });

  it("a 100-request/s burst is absorbed without errors", async () => {
    const burst = Array.from({ length: 100 }, () => POST(request(event())));
    const responses = await Promise.all(burst);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const stored = await listEvents("2000-01-01T00:00:00.000Z", "2100-01-01T00:00:00.000Z");
    expect(stored).toHaveLength(100);
  });

  it("recordEvents caps the ring and reports duplicates", async () => {
    const make = (id: string) => ({
      id,
      type: "page_view" as const,
      at: NOW,
      sessionId: "s",
      path: "/",
      productId: null,
      referrerHost: null,
      device: "desktop" as const,
      ipHash: "h",
      orderId: null,
      valuePaise: 0,
      month: NOW.slice(0, 7),
    });
    const first = await recordEvents([make("a"), make("a"), make("b")]);
    expect(first).toEqual({ accepted: 2, duplicates: 1 });
  });
});
