import "server-only";

import { notFound } from "next/navigation";

import { readSession } from "@/lib/auth/session";

export async function requireAdmin() {
  const session = await readSession();
  if (!session || session.role !== "admin") notFound();
  return session;
}
