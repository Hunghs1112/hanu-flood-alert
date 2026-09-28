"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapInstance, MapLayerMouseEvent } from "maplibre-gl";
import { Crosshair, Home, Info, Minus, Plus, Search, X } from "lucide-react";
import type { AreaStatus } from "@/lib/types";
import { StatusChip, STATUS_META, timeAgo } from "./status";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const HANU_CENTER: [number, number] = [105.7952, 20.9914];

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["/api/tiles/{z}/{x}/{y}"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    }
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#08101f" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.7,
        "raster-saturation": -0.65,
        "raster-contrast": 0.25,
        "raster-brightness-max": 0.72
      }
    }
  ]
};

function toGeoJson(areas: AreaStatus[]) {
  return {
    type: "FeatureCollection" as const,
    features: areas.map((area) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: area.coordinates },
      properties: {
        id: area.id,
        slug: area.slug,
        name: area.name,
        status: area.status,
        count: area.recentReporterCount,
        reportCount: area.recentReportCount
      }
    }))
  };
}

function addAreaLayers(map: MapInstance, areas: AreaStatus[]) {
  map.addSource("flood-areas", { type: "geojson", data: toGeoJson(areas), cluster: true, clusterMaxZoom: 13, clusterRadius: 54 });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "flood-areas",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#8b7cff",
      "circle-radius": ["step", ["get", "point_count"], 24, 4, 32, 8, 40],
      "circle-stroke-color": "rgba(255,255,255,.8)",
      "circle-stroke-width": 2,
      "circle-opacity": 0.9,
      "circle-blur": 0.03
    }
  });
  map.addLayer({ id: "cluster-count", type: "symbol", source: "flood-areas", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 14 }, paint: { "text-color": "#fff" } });
  map.addLayer({
    id: "area-glow",
    type: "circle",
    source: "flood-areas",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["match", ["get", "status"], "HEAVY", "#ff4d5a", "LIGHT", "#ffb547", "DRY", "#42d392", "#94a3b8"],
      "circle-radius": ["interpolate", ["linear"], ["get", "count"], 0, 18, 1, 22, 3, 31, 6, 40, 11, 48],
      "circle-opacity": 0.2,
      "circle-blur": 0.8
    }
  });
  map.addLayer({
    id: "area-bubbles",
    type: "circle",
    source: "flood-areas",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": ["match", ["get", "status"], "HEAVY", "#ff4d5a", "LIGHT", "#ffb547", "DRY", "#42d392", "#94a3b8"],
      "circle-radius": ["interpolate", ["linear"], ["get", "count"], 0, 11, 1, 14, 3, 20, 6, 28, 11, 36],
      "circle-opacity": 0.92,
      "circle-stroke-color": "rgba(255,255,255,.9)",
      "circle-stroke-width": 2
    }
  });
  map.addLayer({
    id: "area-count",
    type: "symbol",
    source: "flood-areas",
    filter: ["!", ["has", "point_count"]],
    layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 13, "text-font": ["Open Sans Bold"] },
    paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,.25)", "text-halo-width": 1 }
  });
  map.addLayer({
    id: "area-labels",
    type: "symbol",
    source: "flood-areas",
    minzoom: 14.2,
    filter: ["!", ["has", "point_count"]],
    layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 2.7], "text-anchor": "top" },
    paint: { "text-color": "#f8fafc", "text-halo-color": "#0b1220", "text-halo-width": 2 }
  });
}

export default function MapExperience() {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const areasRef = useRef<AreaStatus[]>([]);
  const [areas, setAreas] = useState<AreaStatus[]>([]);
  const [selected, setSelected] = useState<AreaStatus | null>(null);
  const [query, setQuery] = useState("");
  const [legend, setLegend] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAreas = useCallback(async () => {
    const response = await fetch("/api/areas", { cache: "no-store" });
    const data = await response.json();
    setAreas(data.areas);
    areasRef.current = data.areas;
    setLoading(false);
    const source = mapRef.current?.getSource("flood-areas") as GeoJSONSource | undefined;
    source?.setData(toGeoJson(data.areas));
  }, []);

  useEffect(() => {
    loadAreas();
    const timer = window.setInterval(loadAreas, 30_000);
    return () => window.clearInterval(timer);
  }, [loadAreas]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: container.current, style: MAP_STYLE, center: HANU_CENTER, zoom: 13.8, minZoom: 11, maxZoom: 18, attributionControl: false });
    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
    map.on("load", async () => {
      const response = await fetch("/api/areas", { cache: "no-store" });
      const data = await response.json();
      setAreas(data.areas);
      areasRef.current = data.areas;
      setLoading(false);
      addAreaLayers(map, data.areas);
    });
    map.on("click", "area-bubbles", (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      const area = areasRef.current.find((item) => item.id === id);
      if (area) setSelected(area);
    });
    map.on("click", "clusters", (event: MapLayerMouseEvent) => {
      const coordinates = (event.features?.[0]?.geometry as { coordinates?: [number, number] })?.coordinates;
      if (coordinates) map.easeTo({ center: coordinates, zoom: Math.min(map.getZoom() + 2, 16), duration: 650 });
    });
    for (const layer of ["area-bubbles", "clusters"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !selected) return;
    mapRef.current.easeTo({ center: selected.coordinates, zoom: Math.max(mapRef.current.getZoom(), 14.8), offset: [0, -120], duration: 650 });
  }, [selected]);

  const matches = useMemo(() => query.trim() ? areas.filter((area) => area.name.toLowerCase().includes(query.toLowerCase())) : [], [areas, query]);
  const summary = useMemo(() => areas.reduce((acc, area) => ({ ...acc, [area.status]: acc[area.status] + 1 }), { HEAVY: 0, LIGHT: 0, DRY: 0, UNKNOWN: 0 }), [areas]);

  function focusArea(area: AreaStatus) {
    setSelected(area);
    setQuery("");
  }

  function geolocate() {
    navigator.geolocation?.getCurrentPosition((position) => mapRef.current?.easeTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 15, duration: 650 }));
  }

  return (
    <section className="map-page">
      <div ref={container} className="map-canvas" aria-label="Bản đồ tình trạng ngập quanh HANU" />
      <div className="map-mobile-brand glass"><span>HANU <b>PULSE</b></span><small>{loading ? "Đang cập nhật" : "Cộng đồng trực tuyến"}</small></div>
      <div className="map-search-wrap">
        <div className="map-search glass"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khu vực quanh HANU..." aria-label="Tìm khu vực" />{query ? <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={18} /></button> : null}</div>
        {matches.length ? <div className="search-results glass">{matches.map((area) => <button key={area.id} onClick={() => focusArea(area)}><span className={`mini-dot ${STATUS_META[area.status].className}`} /> <span>{area.name}<small>{STATUS_META[area.status].label} · {area.recentReporterCount} người</small></span></button>)}</div> : null}
      </div>
      <div className="map-controls glass-clear">
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Phóng to"><Plus /></button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Thu nhỏ"><Minus /></button>
        <button onClick={geolocate} aria-label="Vị trí của tôi"><Crosshair /></button>
        <button onClick={() => mapRef.current?.easeTo({ center: HANU_CENTER, zoom: 13.8, duration: 650 })} aria-label="Quay về HANU"><Home /></button>
      </div>
      <button className="legend-toggle glass-clear" onClick={() => setLegend((value) => !value)} aria-label="Chú thích bản đồ"><Info size={19} /></button>
      {legend ? <div className="map-legend glass"><strong>Chú thích</strong>{(["HEAVY", "LIGHT", "DRY", "UNKNOWN"] as const).map((status) => <div key={status}><span className={`legend-dot ${STATUS_META[status].className}`} />{STATUS_META[status].label}</div>)}<small>Chấm lớn hơn = nhiều người báo cáo hơn</small></div> : null}
      <aside className={`area-sheet glass ${selected ? "selected" : ""}`}>
        <div className="sheet-handle" />
        {selected ? <>
          <button className="sheet-close" onClick={() => setSelected(null)} aria-label="Đóng"><X size={18} /></button>
          <div className="eyebrow">TÌNH TRẠNG KHU VỰC</div>
          <h1>{selected.name}</h1>
          <div className="sheet-status-row"><StatusChip status={selected.status} /><span>{timeAgo(selected.latestReportAt)}</span></div>
          <div className="sheet-metrics"><div><strong>{selected.recentReporterCount}</strong><span>người báo</span></div><div><strong>{selected.recentReportCount}</strong><span>bài gần đây</span></div></div>
          <div className="sheet-actions"><Link className="primary-button" href={`/report?area=${selected.id}`}>Cập nhật tình trạng</Link><Link className="secondary-button" href={`/area/${selected.slug}`}>Xem lịch sử</Link></div>
        </> : <>
          <div className="eyebrow">CẬP NHẬT QUANH HANU</div>
          <h1>Nhìn nhanh trước khi đi</h1>
          <div className="overview-row"><span className="danger-text"><b>{summary.HEAVY}</b> nguy hiểm</span><span className="warning-text"><b>{summary.LIGHT}</b> cảnh báo</span><span className="safe-text"><b>{summary.DRY}</b> ổn định</span></div>
          <p>Chạm vào một chấm để xem báo cáo và lịch sử khu vực.</p>
        </>}
      </aside>
    </section>
  );
}
