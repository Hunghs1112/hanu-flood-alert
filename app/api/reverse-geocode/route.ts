import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const latitude = Number.parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const longitude = Number.parseFloat(request.nextUrl.searchParams.get("lng") ?? "");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Tọa độ không hợp lệ." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude.toFixed(6));
  url.searchParams.set("lon", longitude.toFixed(6));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "vi,en");

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "HANU-Pulse/0.1 (community flood map; http://180.93.37.143:4317)",
        "Referer": "http://180.93.37.143:4317/"
      },
      next: { revalidate: 2_592_000 }
    });
    if (!response.ok) throw new Error("Reverse geocoder unavailable");

    const result = await response.json() as { display_name?: string; name?: string };
    const placeName = result.display_name?.trim() || result.name?.trim();
    if (!placeName) return NextResponse.json({ error: "Chưa tìm thấy tên địa điểm." }, { status: 404 });

    return NextResponse.json(
      { placeName },
      { headers: { "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400" } }
    );
  } catch {
    return NextResponse.json({ error: "Chưa thể tra tên địa điểm." }, { status: 502 });
  }
}
