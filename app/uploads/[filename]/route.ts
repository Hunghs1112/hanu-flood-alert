import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_PATTERN = /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/;

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  if (!FILE_PATTERN.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const image = await readFile(path.join(process.cwd(), "public", "uploads", filename));
    const extension = path.extname(filename).toLowerCase();
    const contentType = extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
