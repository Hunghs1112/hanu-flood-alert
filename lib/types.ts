export type Severity = "HEAVY" | "LIGHT" | "DRY";
export type AreaStatusValue = Severity | "UNKNOWN";

export type Area = {
  id: string;
  slug: string;
  name: string;
  coordinates: [number, number];
};

export type FloodReport = {
  id: string;
  areaId: string;
  reporterName: string;
  deviceId: string;
  severity: Severity;
  description?: string;
  imageUrl?: string;
  latitude: number;
  longitude: number;
  occurredAt: string;
  createdAt: string;
};

export type AreaStatus = Area & {
  status: AreaStatusValue;
  recentReporterCount: number;
  recentReportCount: number;
  latestReportAt: string | null;
};
