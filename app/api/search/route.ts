import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ places: [] });

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({ format: "jsonv2", q: query, limit: "5", bounded: "1", viewbox: "105.72,21.05,105.88,20.94", "accept-language": "vi,en" }).toString();

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "HANU-Pulse/0.1 (community flood map; https://hanu-flood-alert.vercel.app)", Referer: "https://hanu-flood-alert.vercel.app/" },
      next: { revalidate: 86_400 }
    });
    if (!response.ok) throw new Error("Geocoder unavailable");

    const results = await response.json() as Array<{ display_name?: string; lat?: string; lon?: string }>;
    const places = results.flatMap((result) => {
      const latitude = Number.parseFloat(result.lat ?? "");
      const longitude = Number.parseFloat(result.lon ?? "");
      const name = result.display_name?.trim();
      return name && Number.isFinite(latitude) && Number.isFinite(longitude) ? [{ name, coordinates: [longitude, latitude] as [number, number] }] : [];
    });
    return NextResponse.json({ places }, { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ places: [] });
  }
}
