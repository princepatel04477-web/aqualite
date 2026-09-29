/**
 * Unit tests run outside Next, where `.env.local` is never loaded. Modules
 * behind `server-only` still validate their environment at import — give them
 * local placeholders so the suites can exercise the real code paths (all
 * placeholder values select demo behaviour for payments and email).
 */
const fallbacks: Record<string, string> = {
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_ANON_KEY: "placeholder-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "placeholder-service-role-key",
  RAZORPAY_KEY_ID: "rzp_placeholder_key",
  RAZORPAY_KEY_SECRET: "placeholder-key-secret",
  RAZORPAY_WEBHOOK_SECRET: "placeholder-webhook-secret",
  RESEND_API_KEY: "re_placeholder_key",
  RESEND_WEBHOOK_SECRET: "placeholder-resend-webhook-secret",
  EMAIL_FROM: "Aqualite <orders@example.com>",
  SITE_URL: "http://localhost:3000",
};

for (const [key, value] of Object.entries(fallbacks)) {
  if (!process.env[key]) process.env[key] = value;
}
