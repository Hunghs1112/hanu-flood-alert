import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { addReport, AREAS, getReports } from "@/lib/data";
import type { Severity } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const areaId = request.nextUrl.searchParams.get("areaId");
  const reports = (await getReports())
    .filter((report) => !areaId || report.areaId === areaId)
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  return NextResponse.json({ reports });
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const areaId = String(form.get("areaId") || "");
    const reporterName = String(form.get("reporterName") || "").trim().slice(0, 40);
    const severity = String(form.get("severity") || "") as Severity;
    const description = String(form.get("description") || "").trim().slice(0, 300);
    const occurredAt = String(form.get("occurredAt") || new Date().toISOString());
    const deviceId = String(form.get("deviceId") || randomUUID()).slice(0, 100);
    const area = AREAS.find((item) => item.id === areaId);

    if (!area || reporterName.length < 2 || !["HEAVY", "LIGHT", "DRY"].includes(severity)) {
      return NextResponse.json({ error: "Thông tin báo cáo chưa hợp lệ." }, { status: 400 });
    }

    if (+new Date(occurredAt) > Date.now() + 60_000) {
      return NextResponse.json({ error: "Thời gian ghi nhận không thể ở tương lai." }, { status: 400 });
    }

    let imageUrl: string | undefined;
    const image = form.get("image");
    if (image instanceof File && image.size > 0) {
      if (image.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
        return NextResponse.json({ error: "Ảnh phải là JPEG, PNG hoặc WebP và nhỏ hơn 5MB." }, { status: 400 });
      }
      const ext = image.type === "image/png" ? "png" : image.type === "image/webp" ? "webp" : "jpg";
      const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });
      await writeFile(path.join(uploadDir, fileName), Buffer.from(await image.arrayBuffer()));
      imageUrl = `/uploads/${fileName}`;
    }

    const report = await addReport({
      areaId,
      reporterName,
      deviceId,
      severity,
      description: description || undefined,
      imageUrl,
      latitude: area.coordinates[1],
      longitude: area.coordinates[0],
      occurredAt: new Date(occurredAt).toISOString()
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Chưa thể đăng báo cáo. Hãy thử lại." }, { status: 500 });
  }
}
