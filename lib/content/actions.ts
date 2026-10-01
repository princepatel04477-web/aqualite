"use server";

import { z } from "zod";

import { errorCopy } from "@/content/errors";
import { recordOutbox, subscribeNewsletter, addContact } from "@/lib/store/engine";
import { err, ok, type Result } from "@/lib/result";
import { limitEmail, limitIp } from "@/lib/rate-limit";

const emailSchema = z.string().email();

export async function subscribeAction(formData: FormData): Promise<Result<{ created: boolean }>> {
  if (String(formData.get("company") ?? "").length > 0) return ok({ created: false });
  const parsed = emailSchema.safeParse(String(formData.get("email") ?? ""));
  if (!parsed.success) return err("VALIDATION", "That email doesn't look right.");
  if (await limitIp("newsletter", 8, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  if (await limitEmail(parsed.data, "newsletter", 3, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  const result = await subscribeNewsletter(parsed.data, "footer");
  if (result.ok && result.data.created) {
    await recordOutbox(parsed.data, "Welcome to Aqualite", "Monsoon drops, first. You're on the list.");
  }
  return result;
}

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  topic: z.string().min(2).max(60),
  message: z.string().min(8).max(2000),
  company: z.string().max(0).optional(),
});

export async function contactAction(input: unknown): Promise<Result<{ sent: boolean }>> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return err("VALIDATION", errorCopy.VALIDATION);
  if (parsed.data.company) return ok({ sent: true });
  if (await limitIp("contact", 3, 600)) return err("RATE_LIMITED", errorCopy.RATE_LIMITED);
  await addContact({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone ?? "",
    topic: parsed.data.topic,
    message: parsed.data.message,
  });
  await recordOutbox(parsed.data.email, "We received your note", "Aqualite has your message. We'll reply within one working day.");
  await recordOutbox("hello@aqualite.in", `Contact: ${parsed.data.topic}`, parsed.data.message);
  return ok({ sent: true });
}
