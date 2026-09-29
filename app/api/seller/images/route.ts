import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

import { readSession } from "@/lib/auth/session";
import { isLocalDataMode, serverEnv } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await readSession();
  if (user?.role !== "admin") return NextResponse.json({ message: "Sign in to upload images." }, { status: 401 });
  let body: FormData;
  try { body = await request.formData(); } catch { return NextResponse.json({ message: "Expected an image upload." }, { status: 400 }); }
  const file = body.get("file");
  if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) || file.size > 12 * 1024 * 1024) {
    return NextResponse.json({ message: "Choose a JPEG, PNG, WebP or AVIF under 12 MB." }, { status: 400 });
  }
  let output: Buffer;
  let width: number; let height: number;
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 32_000_000 }).rotate().resize({ width: 1600, height: 1800, fit: "inside", withoutEnlargement: true });
    const meta = await image.metadata(); width = meta.width ?? 0; height = meta.height ?? 0;
    if (width < 400 || height < 400) return NextResponse.json({ message: "Use an image at least 400×400 px." }, { status: 422 });
    const converted = await image.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    output = converted.data; width = converted.info.width; height = converted.info.height;
  } catch { return NextResponse.json({ message: "Image could not be processed." }, { status: 422 }); }
  const name = `catalog-${crypto.randomUUID()}.webp`;
  if (isLocalDataMode()) {
    const dir = path.join(process.cwd(), ".data", "uploads");
    await fs.mkdir(dir, { recursive: true }); await fs.writeFile(path.join(dir, name), output);
    return NextResponse.json({ src: `/api/media/${name}`, width, height });
  }
  const client = createClient(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const uploaded = await client.storage.from("catalog").upload(name, output, { contentType: "image/webp", cacheControl: "31536000" });
  if (uploaded.error) return NextResponse.json({ message: "Upload failed. Please retry." }, { status: 502 });
  const { data } = client.storage.from("catalog").getPublicUrl(name);
  return NextResponse.json({ src: data.publicUrl, width, height });
}
