import "server-only";

import { headers } from "next/headers";

import { serverEnv } from "@/lib/env";
import { rateLimited } from "@/lib/store/engine";

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${serverEnv.SUPABASE_SERVICE_ROLE_KEY}:${ip}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

export function clientIp(): string {
  const forwarded = headers().get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers().get("x-real-ip") || "local";
}

export async function limitIp(route: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = `ip:${route}:${await hashIp(clientIp())}`;
  return rateLimited(key, limit, windowSeconds);
}

export function limitCart(cartId: string, limit = 60): Promise<boolean> {
  return rateLimited(`cart:${cartId}`, limit, 60);
}

export function limitEmail(email: string, route: string, limit: number, windowSeconds: number): Promise<boolean> {
  return rateLimited(`email:${route}:${email.toLowerCase()}`, limit, windowSeconds);
}
