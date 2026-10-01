import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EXT_TO_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** Serves admin-uploaded hero sources from .data/uploads. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<NextResponse> {
  const { name } = await params;
  const clean = name.replace(/[^A-Za-z0-9._-]/g, "");
  const ext = clean.split(".").pop() ?? "";
  const type = EXT_TO_TYPE[ext];
  if (!clean.startsWith("desktop-") && !clean.startsWith("mobile-") && !clean.startsWith("catalog-")) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!type) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await fs.readFile(path.join(process.cwd(), ".data", "uploads", clean));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
