import { NextResponse } from "next/server";

import { lookupPincode } from "@/lib/store/pincode";
import { limitIp } from "@/lib/rate-limit";

export async function GET(_request: Request, { params }: { params: { code: string } }) {
  if (await limitIp("pincode", 20, 60)) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const info = lookupPincode(params.code);
  if (!info) return NextResponse.json({ error: "INVALID" }, { status: 400 });
  return NextResponse.json(info);
}
