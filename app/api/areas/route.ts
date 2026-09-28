import { NextResponse } from "next/server";
import { getAreaStatuses, getMapPoints } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [areas, points] = await Promise.all([getAreaStatuses(), getMapPoints()]);
  return NextResponse.json({ areas, points });
}
