import { NextResponse } from "next/server";
import { z } from "zod";

import { limitIp } from "@/lib/rate-limit";
import { getOrderByNumber } from "@/lib/store/engine";

const schema = z.object({
  number: z.string().min(4),
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (await limitIp("track", 5, 600)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  const json: unknown = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const order = await getOrderByNumber(parsed.data.number.trim());
  if (!order || order.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({
    ok: true,
    status: order.status,
    number: order.number,
    tracking: order.trackingNumber,
  });
}
