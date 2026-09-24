import "server-only";

import { z } from "zod";

const serverSchema = z.object({
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  SITE_URL: z.string().url(),
  CRON_SECRET: z.string().min(8).optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function readServer(): ServerEnv {
  const parsed = serverSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    SITE_URL: process.env.SITE_URL,
    CRON_SECRET: process.env.CRON_SECRET || undefined,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => {
      const key = issue.path.join(".") || "unknown";
      return `${key} (${issue.message})`;
    });
    const message = [
      "Aqualite cannot start. Missing or invalid environment variables:",
      ...missing.map((line) => `  - ${line}`),
      "Copy .env.example to .env.local and fill every value.",
    ].join("\n");
    throw new Error(message);
  }
  return parsed.data;
}

export const serverEnv = readServer();

export function isLocalDataMode(): boolean {
  const url = serverEnv.SUPABASE_URL;
  const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  return (
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    key.includes("placeholder")
  );
}

export function isDemoPayments(): boolean {
  return (
    serverEnv.RAZORPAY_KEY_ID.includes("placeholder") ||
    serverEnv.RAZORPAY_KEY_SECRET.includes("placeholder")
  );
}

export function isDemoEmail(): boolean {
  return serverEnv.RESEND_API_KEY.includes("placeholder");
}
