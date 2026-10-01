import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isLocalDataMode, serverEnv } from "@/lib/env";

/** Invoke from an authenticated scheduler after pg_cron writes due boundaries. */
export async function POST(request: Request) {
  if (!serverEnv.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  }
  if (isLocalDataMode()) return NextResponse.json({ processed: 0 });
  const client = createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.from("hub_revalidation_queue").select("id,product_slug").is("processed_at", null).lte("boundary_at", new Date().toISOString()).limit(100);
  if (error) return NextResponse.json({ message: "Queue unavailable" }, { status: 503 });
  if (!data?.length) return NextResponse.json({ processed: 0 });
  revalidateTag("catalog", "max");
  revalidatePath("/shop"); revalidatePath("/");
  for (const slug of new Set(data.map((row) => row.product_slug))) revalidatePath(`/product/${slug}`);
  const { error: saveError } = await client.from("hub_revalidation_queue").update({ processed_at: new Date().toISOString() }).in("id", data.map((row) => row.id));
  if (saveError) return NextResponse.json({ message: "Could not mark queue entries processed" }, { status: 503 });
  return NextResponse.json({ processed: data.length });
}

export const GET = POST;
