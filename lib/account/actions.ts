"use server";

import { z } from "zod";

import { readCartId, writeCartId } from "@/lib/cart/cookie";
import { clearSession, readSession, writeSession } from "@/lib/auth/session";
import { errorCopy } from "@/content/errors";
import { createCart, mergeCart, sendOtp, updateProfile, verifyOtp, saveAddress, deleteAddress, transitionOrder, getOrderByNumber, createReturn } from "@/lib/store/engine";
import { err, ok, type Result } from "@/lib/result";
import { limitEmail, limitIp } from "@/lib/rate-limit";
import { redirect } from "next/navigation";

export async function sendOtpAction(input: unknown): Promise<Result<{ demoCode: string }>> {
  const parsed = z.object({ email: z.string().email() }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", "Enter a valid email.");
  if (await limitIp("otp", 8, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await limitEmail(parsed.data.email, "otp", 3, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  return sendOtp(parsed.data.email);
}

export async function verifyOtpAction(input: unknown): Promise<Result<{ next: string }>> {
  const parsed = z.object({ email: z.string().email(), code: z.string().length(6), next: z.string().optional() }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const next = safeNext(parsed.data.next);
  const verified = await verifyOtp(parsed.data.email, parsed.data.code);
  if (!verified.ok) return verified;
  await writeSession(verified.data);
  const guest = await readCartId();
  if (guest) {
    const merged = await mergeCart(guest, verified.data.id);
    await writeCartId(merged);
  }
  return ok({ next });
}

export async function signOutAction(): Promise<void> {
  clearSession();
  const fresh = await createCart();
  await writeCartId(fresh);
  redirect("/");
}

export async function profileAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const session = await readSession();
  if (!session) return err("UNAUTHORIZED", errorCopy.UNAUTHORIZED);
  const parsed = z.object({ fullName: z.string().max(80), phone: z.string().max(15) }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const updated = await updateProfile(session.id, parsed.data);
  if (!updated.ok) return updated;
  await writeSession({ ...session, fullName: parsed.data.fullName, phone: parsed.data.phone });
  return ok({ saved: true });
}

export async function addressAction(input: unknown): Promise<Result<{ saved: boolean }>> {
  const session = await readSession();
  if (!session) return err("UNAUTHORIZED", errorCopy.UNAUTHORIZED);
  const parsed = z.object({
    name: z.string().min(2),
    phone: z.string().regex(/^[6-9]\d{9}$/),
    line1: z.string().min(4),
    line2: z.string().default(""),
    landmark: z.string().default(""),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().regex(/^[1-9]\d{5}$/),
  }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const saved = await saveAddress(session.id, { ...parsed.data, isDefault: true });
  if (!saved.ok) return saved;
  return ok({ saved: true });
}

export async function deleteAddressAction(id: string): Promise<void> {
  const session = await readSession();
  if (!session) return;
  await deleteAddress(session.id, id);
}

export async function cancelOrderAction(number: string): Promise<Result<{ cancelled: boolean }>> {
  const session = await readSession();
  if (!session) return err("UNAUTHORIZED", errorCopy.UNAUTHORIZED);
  const order = await getOrderByNumber(number);
  if (!order || order.userId !== session.id) return err("NOT_FOUND", errorCopy.NOT_FOUND);
  const moved = await transitionOrder(order.id, "cancelled", "Cancelled by customer", `customer:${session.id}`);
  if (!moved.ok) return moved;
  return ok({ cancelled: true });
}

export async function returnAction(input: unknown): Promise<Result<{ id: string }>> {
  const session = await readSession();
  if (!session) return err("UNAUTHORIZED", errorCopy.UNAUTHORIZED);
  const parsed = z.object({
    number: z.string(),
    orderItemId: z.string(),
    reason: z.string().min(2),
    resolution: z.string().min(2),
    note: z.string().default(""),
  }).safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  const order = await getOrderByNumber(parsed.data.number);
  if (!order || order.userId !== session.id) return err("NOT_FOUND", errorCopy.NOT_FOUND);
  const created = await createReturn({
    orderId: order.id,
    orderItemId: parsed.data.orderItemId,
    reason: parsed.data.reason,
    resolution: parsed.data.resolution,
    note: parsed.data.note,
  });
  if (!created.ok) return created;
  return ok({ id: created.data.id });
}

function safeNext(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account";
  return value;
}
