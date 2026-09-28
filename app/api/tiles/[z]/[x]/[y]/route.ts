import { NextResponse } from "next/server";

const TILE_PATTERN = /^\d+$/;
const MAX_ZOOM = 19;

export async function GET(
  _request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await context.params;

  if (![z, x, y].every((value) => TILE_PATTERN.test(value))) {
    return NextResponse.json({ error: "Invalid tile coordinates" }, { status: 400 });
  }

  const zoom = Number(z);
  const column = Number(x);
  const row = Number(y);
  const tileLimit = 2 ** zoom;

  if (
    zoom < 0 ||
    zoom > MAX_ZOOM ||
    column < 0 ||
    column >= tileLimit ||
    row < 0 ||
    row >= tileLimit
  ) {
    return NextResponse.json({ error: "Tile is outside the valid range" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://tile.openstreetmap.org/${zoom}/${column}/${row}.png`,
      {
        headers: {
          "User-Agent": "HANU-Pulse/0.1 (community flood map)"
        },
        next: { revalidate: 86400 }
      }
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Map tile provider is temporarily unavailable" },
        { status: upstream.status }
      );
    }

    return new NextResponse(await upstream.arrayBuffer(), {
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/png",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to reach the map tile provider" },
      { status: 502 }
    );
  }
}
