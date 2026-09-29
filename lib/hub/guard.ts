import "server-only";

import { notFound } from "next/navigation";

import { readSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/commerce/types";

/** Seller Hub is single-brand: only the admin role enters /seller. */
export async function requireSeller(): Promise<SessionUser> {
  const session = await readSession();
  if (!session || session.role !== "admin") notFound();
  return session;
}
