import "server-only";

import { cookies } from "next/headers";

import { serverEnv } from "@/lib/env";
import { signValue, verifyValue } from "@/lib/auth/sign";
import type { SessionUser } from "@/lib/commerce/types";

const NAME = "aq_session";

export async function readSession(): Promise<SessionUser | null> {
  const raw = cookies().get(NAME)?.value;
  if (!raw) return null;
  const value = await verifyValue(raw, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<SessionUser>;
    if (!record.id || !record.email || (record.role !== "admin" && record.role !== "customer")) return null;
    return {
      id: record.id,
      email: record.email,
      role: record.role,
      fullName: record.fullName ?? "",
      phone: record.phone ?? "",
    };
  } catch {
    return null;
  }
}

export async function writeSession(user: SessionUser): Promise<void> {
  const signed = await signValue(JSON.stringify(user), serverEnv.SUPABASE_SERVICE_ROLE_KEY);
  cookies().set(NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSession(): void {
  cookies().set(NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
