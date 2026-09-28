import { NextResponse } from "next/server";
import { getAreaStatuses } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const areas = await getAreaStatuses();
  return NextResponse.json({ areas });
}
