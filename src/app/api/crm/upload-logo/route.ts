import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const ALLOWED_EXTS = new Set([".png", ".jpg", ".jpeg", ".svg", ".webp"]);
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext))
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${[...ALLOWED_EXTS].join(", ")}` },
        { status: 400 },
      );

    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_SIZE)
      return NextResponse.json({ error: "File too large. Maximum 2MB." }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "public", "uploaded-logos");
    await mkdir(uploadDir, { recursive: true });

    const randomHex = Math.random().toString(16).slice(2, 6);
    const filename = `${Date.now()}-${randomHex}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({ url: `/uploaded-logos/${filename}` });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 },
    );
  }
}
