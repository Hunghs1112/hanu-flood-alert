import { randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { AREAS } from "./areas";
import type { AreaStatus, AreaStatusValue, FloodReport, MapPointStatus, Severity } from "./types";

export { AREAS } from "./areas";

const dataPath = path.join(process.cwd(), "data", "reports.runtime.json");

export async function getReports(): Promise<FloodReport[]> {
  try {
    const raw = await readFile(dataPath, "utf8");
    const reports = JSON.parse(raw) as FloodReport[];
    return reports;
  } catch {
    return [];
  }
}

async function persistReports(reports: FloodReport[]) {
  await mkdir(path.dirname(dataPath), { recursive: true });
  const temp = `${dataPath}.${process.pid}.tmp`;
  await writeFile(temp, JSON.stringify(reports, null, 2), "utf8");
  await rename(temp, dataPath);
}

export async function addReport(input: Omit<FloodReport, "id" | "createdAt">) {
  const existing = await getReports();
  const report: FloodReport = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
  await persistReports([report, ...existing.filter((item) => !item.id.startsWith("demo-")).slice(0, 999)]);
  return report;
}

function calculateStatus(reports: FloodReport[]): AreaStatusValue {
  if (!reports.length) return "UNKNOWN";
  const latest = reports[0];
  const people = new Map<string, Severity>();
  for (const report of reports) if (!people.has(report.deviceId)) people.set(report.deviceId, report.severity);
  const values = Array.from(people.values());
  const heavy = values.filter((value) => value === "HEAVY").length;
  const light = values.filter((value) => value === "LIGHT").length;
  const dry = values.filter((value) => value === "DRY").length;
  if (latest.severity === "DRY" && heavy < 2) return "DRY";
  if (heavy >= 1) return "HEAVY";
  if (light >= 1) return "LIGHT";
  if (dry >= 1) return "DRY";
  return "UNKNOWN";
}

export async function getAreaStatuses(): Promise<AreaStatus[]> {
  const reports = await getReports();
  const cutoff = Date.now() - 2 * 60 * 60_000;
  return AREAS.map((area) => {
    const recent = reports
      .filter((report) => report.areaId === area.id && new Date(report.occurredAt).getTime() >= cutoff)
      .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
    return {
      ...area,
      status: calculateStatus(recent),
      recentReporterCount: new Set(recent.map((report) => report.deviceId)).size,
      recentReportCount: recent.length,
      latestReportAt: recent[0]?.occurredAt ?? null
    };
  });
}

export async function getMapPoints(): Promise<MapPointStatus[]> {
  const reports = (await getReports())
    .filter((report) => Number.isFinite(report.latitude) && Number.isFinite(report.longitude))
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const groups = new Map<string, FloodReport[]>();

  for (const report of reports) {
    // A grid cell is roughly 50 metres around HANU, so nearby reports form one bubble.
    const latitudeCell = Math.round(report.latitude * 2000);
    const longitudeCell = Math.round(report.longitude * 2000);
    const key = `${report.areaId}:${latitudeCell}:${longitudeCell}`;
    const group = groups.get(key) ?? [];
    group.push(report);
    groups.set(key, group);
  }

  return Array.from(groups.entries()).flatMap(([key, group]) => {
    const area = AREAS.find((item) => item.id === group[0].areaId);
    if (!area) return [];
    const longitude = group.reduce((sum, report) => sum + report.longitude, 0) / group.length;
    const latitude = group.reduce((sum, report) => sum + report.latitude, 0) / group.length;
    return [{
      id: `point-${key}`,
      areaId: area.id,
      slug: area.slug,
      name: group[0].placeName?.split(",")[0]?.trim() || area.name,
      coordinates: [longitude, latitude] as [number, number],
      status: calculateStatus(group),
      recentReporterCount: new Set(group.map((report) => report.deviceId)).size,
      recentReportCount: group.length,
      latestReportAt: group[0].occurredAt
    }];
  });
}

export async function getAreaBySlug(slug: string) {
  const area = AREAS.find((item) => item.slug === slug);
  if (!area) return null;
  const statuses = await getAreaStatuses();
  const reports = (await getReports())
    .filter((report) => report.areaId === area.id)
    .sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  return { area: statuses.find((item) => item.id === area.id)!, reports };
}
