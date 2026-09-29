const storageKey = "hanu-report-location";

export type ReportLocation = {
  coordinates: [number, number];
  placeName: string;
};

export function rememberReportLocation([longitude, latitude]: [number, number], placeName = "") {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify({ longitude, latitude, placeName }));
  } catch {
    // The map remains usable when browser storage is unavailable.
  }
}

export function getReportLocation() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null") as { longitude?: unknown; latitude?: unknown; placeName?: unknown } | null;
    if (value && Number.isFinite(value.longitude) && Number.isFinite(value.latitude)) {
      return { coordinates: [Number(value.longitude), Number(value.latitude)], placeName: typeof value.placeName === "string" ? value.placeName : "" } satisfies ReportLocation;
    }
  } catch {
    // Fall back to the ordinary report route when browser storage is unavailable.
  }
  return null;
}
