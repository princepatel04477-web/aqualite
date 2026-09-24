import "server-only";

import { cookies } from "next/headers";

import { signValue, verifyValue } from "@/lib/auth/sign";
import { serverEnv } from "@/lib/env";

const NAME = "aq_cart";

export async function readCartId(): Promise<string | null> {
  const raw = cookies().get(NAME)?.value;
  if (!raw) return null;
  return verifyValue(raw, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
}

export async function writeCartId(id: string): Promise<void> {
  const signed = await signValue(id, serverEnv.SUPABASE_SERVICE_ROLE_KEY);
  cookies().set(NAME, signed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearCartCookie(): void {
  cookies().set(NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}
