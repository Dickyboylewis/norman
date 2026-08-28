import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;
const HEADSHOT_DIR = path.join(process.cwd(), "public", "headshots");
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const personId = form.get("personId");
  if (typeof personId !== "string" || !/^[a-z0-9_-]{1,64}$/i.test(personId)) {
    return NextResponse.json({ error: "Invalid personId" }, { status: 400 });
  }

  const file = form.get("file");
  const url = form.get("url");

  let buffer: Buffer;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is larger than 10MB" }, { status: 400 });
    }
    buffer = Buffer.from(await file.arrayBuffer());
  } else if (typeof url === "string" && url.trim().length > 0) {
    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Only http(s) image URLs are supported" }, { status: 400 });
    }
    let res: Response;
    try {
      res = await fetch(parsed, { redirect: "follow" });
    } catch {
      return NextResponse.json({ error: "Could not fetch the image URL" }, { status: 400 });
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Image URL returned ${res.status}` },
        { status: 400 },
      );
    }
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image is larger than 10MB" }, { status: 400 });
    }
    buffer = Buffer.from(bytes);
  } else {
    return NextResponse.json({ error: "Provide a file or a url" }, { status: 400 });
  }

  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      return NextResponse.json(
        { error: "Not a supported image — use JPEG, PNG or WebP" },
        { status: 400 },
      );
    }

    const png = await sharp(buffer)
      .rotate()
      .resize(400, 400, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();

    fs.mkdirSync(HEADSHOT_DIR, { recursive: true });
    fs.writeFileSync(path.join(HEADSHOT_DIR, `${personId}.png`), png);

    return NextResponse.json({ success: true, path: `/headshots/${personId}.png` });
  } catch (error) {
    console.error("headshot processing error:", error);
    return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
  }
}
