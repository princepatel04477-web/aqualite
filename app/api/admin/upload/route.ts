import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";

import { readSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const KINDS = {
  desktop: { width: 2560, height: 1440 },
  mobile: { width: 1080, height: 1350 },
} as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_BYTES = 12 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

/**
 * Admin hero-image upload. Files land in .data/uploads and are served back
 * through /api/media/<name>, so the prototype never writes into public/.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await readSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ message: "Sign in as an admin to upload." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Expected a multipart upload." }, { status: 400 });
  }

  const kind = z.enum(["desktop", "mobile"]).safeParse(form.get("kind"));
  if (!kind.success) {
    return NextResponse.json({ message: "Unknown upload slot." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "No file received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "Hero sources must be 12 MB or smaller." }, { status: 413 });
  }
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json({ message: "Upload a JPEG, PNG, WebP or AVIF file." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let width = 0;
  let height = 0;
  try {
    const meta = await sharp(buffer).metadata();
    width = meta.width ?? 0;
    height = meta.height ?? 0;
  } catch (error) {
    logger.warn("admin.upload_unreadable", { message: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ message: "That file could not be read as an image." }, { status: 422 });
  }

  const minimum = KINDS[kind.data];
  if (width < minimum.width || height < minimum.height) {
    return NextResponse.json(
      {
        message: `Received ${width}×${height}. The ${kind.data} hero needs at least ${minimum.width}×${minimum.height} (art direction minimum).`,
      },
      { status: 422 },
    );
  }

  const safeBase = (file.name.replace(/\.[^.]+$/, "").match(/[A-Za-z0-9_-]+/g) ?? []).join("-").slice(0, 48) || "hero";
  const name = `${kind.data}-${Date.now()}-${safeBase}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer);

  return NextResponse.json({ path: `/api/media/${name}`, width, height });
}
