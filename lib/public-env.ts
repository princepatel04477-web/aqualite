import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_MOTION_PLUS: z.enum(["0", "1"]).default("0"),
  NEXT_PUBLIC_GOOGLE_AUTH: z.enum(["0", "1"]).default("0"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

function readPublic(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_MOTION_PLUS: process.env.NEXT_PUBLIC_MOTION_PLUS ?? "0",
    NEXT_PUBLIC_GOOGLE_AUTH: process.env.NEXT_PUBLIC_GOOGLE_AUTH ?? "0",
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join(".") || "unknown");
    throw new Error(
      `Aqualite is missing public environment variables:\n${missing.map((m) => `  - ${m}`).join("\n")}\nCopy .env.example to .env.local and fill every value.`,
    );
  }
  return parsed.data;
}

export const publicEnv = readPublic();
