import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "project-images.json");
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "projects");
const PUBLIC_PREFIX = "/uploads/projects/";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/avif": ".avif",
};

// Codes like "5432/1" are valid mapping keys but not valid filenames.
function safeFileStem(code: string): string {
  return code.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function readMapping(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMapping(mapping: Record<string, string>): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(mapping, null, 2), "utf8");
}

async function removeStoredFiles(stem: string): Promise<void> {
  try {
    const entries = await fs.readdir(UPLOAD_DIR);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(`${stem}.`))
        .map((name) => fs.unlink(path.join(UPLOAD_DIR, name)).catch(() => {}))
    );
  } catch {
    // upload dir may not exist yet
  }
}

export async function GET() {
  const mapping = await readMapping();
  return NextResponse.json(mapping);
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const code = form.get("code");
    const file = form.get("file");
    const url = form.get("url");

    if (typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const mapping = await readMapping();

    if (file instanceof File && file.size > 0) {
      const stem = safeFileStem(code.trim());
      const ext =
        path.extname(file.name).toLowerCase() || EXT_BY_MIME[file.type] || ".png";

      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await removeStoredFiles(stem);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(UPLOAD_DIR, `${stem}${ext}`), buffer);

      mapping[code.trim()] = `${PUBLIC_PREFIX}${stem}${ext}`;
    } else if (typeof url === "string" && url.trim().length > 0) {
      mapping[code.trim()] = url.trim();
    } else {
      return NextResponse.json({ error: "Provide a file or a url" }, { status: 400 });
    }

    await writeMapping(mapping);
    return NextResponse.json({ code: code.trim(), url: mapping[code.trim()] });
  } catch (error) {
    console.error("project-images POST error:", error);
    return NextResponse.json({ error: "Failed to save image" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim() : "";

    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const mapping = await readMapping();
    const stored = mapping[code];

    if (stored) {
      delete mapping[code];
      await writeMapping(mapping);
      if (stored.startsWith(PUBLIC_PREFIX)) {
        await removeStoredFiles(safeFileStem(code));
      }
    }

    return NextResponse.json({ code });
  } catch (error) {
    console.error("project-images DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove image" }, { status: 500 });
  }
}
