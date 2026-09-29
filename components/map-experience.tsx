"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapInstance, Marker } from "maplibre-gl";
import { Crosshair, Home, Info, MapPin, Minus, Plus, Search, X } from "lucide-react";
import { rememberReportLocation } from "@/lib/report-location";
import type { AreaStatus, MapPointStatus } from "@/lib/types";
import { StatusChip, STATUS_META, timeAgo } from "./status";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const HANU_CENTER: [number, number] = [105.7952, 20.9914];
type PlaceMatch = { name: string; coordinates: [number, number] };

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
    { id: "background", type: "background", paint: { "background-color": "#eef2f4" } },
    {
      id: "osm",
      type: "raster",
      source: "osm",
      paint: {
        "raster-opacity": 0.92,
        "raster-saturation": -0.25,
        "raster-contrast": 0.06,
        "raster-brightness-max": 0.98
      }
    }
  ]
};

function toGeoJson(points: MapPointStatus[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: point.coordinates },
      properties: {
        id: point.id,
        areaId: point.areaId,
        slug: point.slug,
        name: point.name,
        status: point.status,
        count: point.recentReporterCount,
        reportCount: point.recentReportCount
      }
    }))
  };
}

function addAreaLayers(map: MapInstance, points: MapPointStatus[]) {
  map.addSource("flood-areas", { type: "geojson", data: toGeoJson(points), cluster: true, clusterMaxZoom: 13, clusterRadius: 54 });
  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "flood-areas",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#f97316",
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
    layout: { "text-field": ["to-string", ["get", "count"]], "text-size": 13, "text-font": ["Noto Sans Bold"] },
    paint: { "text-color": "#fff", "text-halo-color": "rgba(0,0,0,.25)", "text-halo-width": 1 }
  });
  map.addLayer({
    id: "area-labels",
    type: "symbol",
    source: "flood-areas",
    minzoom: 14.2,
    filter: ["!", ["has", "point_count"]],
    layout: { "text-field": ["get", "name"], "text-size": 12, "text-offset": [0, 2.7], "text-anchor": "top" },
    paint: { "text-color": "#273449", "text-halo-color": "#ffffff", "text-halo-width": 2 }
  });
}

function createClickedMarker() {
  const element = document.createElement("div");
  element.className = "map-click-pin";
  const core = document.createElement("span");
  element.appendChild(core);
  return element;
}

export default function MapExperience({ controlsVisible = true }: { controlsVisible?: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const pickedMarkerRef = useRef<Marker | null>(null);
  const pinGeocodeRef = useRef<AbortController | null>(null);
  const areasRef = useRef<AreaStatus[]>([]);
  const pointsRef = useRef<MapPointStatus[]>([]);
  const [areas, setAreas] = useState<AreaStatus[]>([]);
  const [selected, setSelected] = useState<AreaStatus | MapPointStatus | null>(null);
  const [query, setQuery] = useState("");
  const [placeMatches, setPlaceMatches] = useState<PlaceMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [legend, setLegend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pickedPoint, setPickedPoint] = useState<[number, number] | null>(null);
  const [pickedPlaceName, setPickedPlaceName] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const loadAreas = useCallback(async () => {
    const response = await fetch("/api/areas", { cache: "no-store" });
    const data = await response.json();
    setAreas(data.areas);
    areasRef.current = data.areas;
    pointsRef.current = data.points;
    setLoading(false);
    const source = mapRef.current?.getSource("flood-areas") as GeoJSONSource | undefined;
    source?.setData(toGeoJson(data.points));
  }, []);

  useEffect(() => {
    loadAreas();
    const timer = window.setInterval(loadAreas, 30_000);
    window.addEventListener("hanu:reports-updated", loadAreas);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("hanu:reports-updated", loadAreas);
    };
  }, [loadAreas]);

  useEffect(() => {
    if (!container.current || mapRef.current) return;
    const map = new maplibregl.Map({ container: container.current, style: MAP_STYLE, center: HANU_CENTER, zoom: 13.8, minZoom: 11, maxZoom: 18, attributionControl: false });
    map.scrollZoom.enable();
    map.dragPan.enable();
    map.touchZoomRotate.enable();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-left");
    const rememberCenter = () => {
      if (pickedMarkerRef.current) return;
      const center = map.getCenter();
      rememberReportLocation([center.lng, center.lat]);
    };
    map.on("moveend", rememberCenter);
    map.on("load", async () => {
      rememberCenter();
      const response = await fetch("/api/areas", { cache: "no-store" });
      const data = await response.json();
      setAreas(data.areas);
      areasRef.current = data.areas;
      pointsRef.current = data.points;
      setLoading(false);
      addAreaLayers(map, data.points);
    });
    map.on("click", (event) => {
      const clickableLayers = ["area-bubbles", "clusters"].filter((layer) => map.getLayer(layer));
      const feature = clickableLayers.length
        ? map.queryRenderedFeatures(event.point, { layers: clickableLayers })[0]
        : undefined;
      if (feature?.layer.id === "area-bubbles") {
        const point = pointsRef.current.find((item) => item.id === feature.properties?.id);
        if (point) {
          pickedMarkerRef.current?.remove();
          pickedMarkerRef.current = null;
          pinGeocodeRef.current?.abort();
          setPickedPoint(null);
          setPickedPlaceName("");
          rememberReportLocation(point.coordinates, point.name);
          setSelected(point);
        }
        return;
      }
      if (feature?.layer.id === "clusters") {
        const coordinates = (feature.geometry as { coordinates?: [number, number] }).coordinates;
        if (coordinates) map.easeTo({ center: coordinates, zoom: Math.min(map.getZoom() + 2, 16), duration: 650 });
        return;
      }
    });
    for (const layer of ["area-bubbles", "clusters"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
    mapRef.current = map;
    return () => { map.off("moveend", rememberCenter); pinGeocodeRef.current?.abort(); pickedMarkerRef.current?.remove(); map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const applyLayout = () => {
      const panelWidth = !controlsVisible && window.innerWidth > 900 ? 500 : 0;
      map.easeTo({ padding: { left: panelWidth, right: 0, top: 0, bottom: 0 }, duration: 320 });
      map.resize();
    };
    applyLayout();
    window.addEventListener("resize", applyLayout);
    return () => window.removeEventListener("resize", applyLayout);
  }, [controlsVisible]);

  useEffect(() => {
    if (!mapRef.current || !selected) return;
    mapRef.current.easeTo({ center: selected.coordinates, zoom: Math.max(mapRef.current.getZoom(), 14.8), offset: [0, -120], duration: 650 });
  }, [selected]);

  const areaMatches = useMemo(() => query.trim() ? areas.filter((area) => area.name.toLowerCase().includes(query.trim().toLowerCase())) : [], [areas, query]);
  const summary = useMemo(() => areas.reduce((acc, area) => ({ ...acc, [area.status]: acc[area.status] + 1 }), { HEAVY: 0, LIGHT: 0, DRY: 0, UNKNOWN: 0 }), [areas]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setPlaceMatches([]); setSearching(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : { places: [] })
        .then((result) => { if (!controller.signal.aborted) setPlaceMatches(result.places ?? []); })
        .catch(() => { if (!controller.signal.aborted) setPlaceMatches([]); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  function focusArea(area: AreaStatus) {
    pickedMarkerRef.current?.remove();
    pickedMarkerRef.current = null;
    pinGeocodeRef.current?.abort();
    setPickedPoint(null);
    setPickedPlaceName("");
    rememberReportLocation(area.coordinates, area.name);
    setSelected(area);
    setQuery("");
    setMobileSearchOpen(false);
  }

  function geolocate() {
    navigator.geolocation?.getCurrentPosition((position) => mapRef.current?.easeTo({ center: [position.coords.longitude, position.coords.latitude], zoom: 15, duration: 650 }));
  }

  function pinMapCenter(coordinates?: [number, number], placeName?: string) {
    const map = mapRef.current;
    if (!map) return;
    const center = map.getCenter();
    const point = coordinates ?? [center.lng, center.lat] as [number, number];
    if (!pickedMarkerRef.current) {
      pickedMarkerRef.current = new maplibregl.Marker({ element: createClickedMarker(), anchor: "center" })
        .setLngLat(point)
        .addTo(map);
    } else {
      pickedMarkerRef.current.setLngLat(point);
    }
    pinGeocodeRef.current?.abort();
    const controller = new AbortController();
    pinGeocodeRef.current = controller;
    const nearestArea = [...areasRef.current].sort((a, b) => Math.hypot(a.coordinates[0] - point[0], a.coordinates[1] - point[1]) - Math.hypot(b.coordinates[0] - point[0], b.coordinates[1] - point[1]))[0];
    const fallbackPlaceName = placeName || (nearestArea ? `${nearestArea.name}, Hà Nội` : `Tọa độ ${point[1].toFixed(5)}, ${point[0].toFixed(5)}`);
    rememberReportLocation(point, fallbackPlaceName);
    setSelected(null);
    setPickedPoint(point);
    setPickedPlaceName(fallbackPlaceName);
    if (placeName) return;
    fetch(`/api/reverse-geocode?lat=${point[1]}&lng=${point[0]}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.placeName || controller.signal.aborted) return;
        setPickedPlaceName(result.placeName);
        rememberReportLocation(point, result.placeName);
      })
      .catch(() => undefined);
  }

  function focusPlace(place: PlaceMatch) {
    mapRef.current?.easeTo({ center: place.coordinates, zoom: 16, duration: 650 });
    pinMapCenter(place.coordinates, place.name);
    setQuery("");
    setPlaceMatches([]);
    setMobileSearchOpen(false);
  }

  return (
    <section className={`map-page ${controlsVisible ? "map-active" : "map-background"}`}>
      <div ref={container} className="map-canvas" aria-label="Bản đồ tình trạng ngập quanh HANU" />
      {controlsVisible ? <>
      <div className="map-mobile-brand glass"><span>HANU <b>PULSE</b></span><small>{loading ? "Đang cập nhật" : "Cộng đồng trực tuyến"}</small></div>
      <button className={`mobile-search-toggle glass ${mobileSearchOpen ? "hidden" : ""}`} onClick={() => setMobileSearchOpen(true)} aria-label="Mở tìm kiếm"><Search size={20} /></button>
      <div className={`map-search-wrap ${mobileSearchOpen ? "mobile-open" : ""}`}>
        <div className="map-search glass"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm khu vực, đường phố..." aria-label="Tìm khu vực hoặc địa điểm" />{query ? <button onClick={() => setQuery("")} aria-label="Xóa tìm kiếm"><X size={18} /></button> : <button className="mobile-search-close" onClick={() => setMobileSearchOpen(false)} aria-label="Đóng tìm kiếm"><X size={18} /></button>}</div>
        {areaMatches.length || placeMatches.length || searching ? <div className="search-results glass">{areaMatches.map((area) => <button key={area.id} onClick={() => focusArea(area)}><span className={`mini-dot ${STATUS_META[area.status].className}`} /><span>{area.name}<small>{STATUS_META[area.status].label} · {area.recentReporterCount} người báo</small></span></button>)}{placeMatches.map((place) => <button key={`${place.coordinates.join(",")}-${place.name}`} onClick={() => focusPlace(place)}><MapPin size={16} /><span>{place.name}<small>Địa điểm trên bản đồ · chọn để đăng báo cáo</small></span></button>)}{searching ? <small className="search-loading">Đang tìm địa điểm…</small> : null}</div> : null}
      </div>
      {!selected && !pickedPoint ? <div className="main-map-center-target" aria-hidden="true"><span /></div> : null}
      {!selected && !pickedPoint ? <button className="mobile-pin-center" onClick={() => pinMapCenter()}><Crosshair size={18} /><span>Đặt ghim</span></button> : null}
      <div className={`map-controls glass-clear ${selected || pickedPoint ? "has-selection" : ""}`}>
        <button onClick={() => mapRef.current?.zoomIn()} aria-label="Phóng to"><Plus /></button>
        <button onClick={() => mapRef.current?.zoomOut()} aria-label="Thu nhỏ"><Minus /></button>
        <button onClick={geolocate} aria-label="Vị trí của tôi"><Crosshair /></button>
        <button onClick={() => mapRef.current?.easeTo({ center: HANU_CENTER, zoom: 13.8, duration: 650 })} aria-label="Quay về HANU"><Home /></button>
      </div>
      <button className="legend-toggle glass-clear" onClick={() => setLegend((value) => !value)} aria-label="Chú thích bản đồ"><Info size={19} /></button>
      {legend ? <div className="map-legend glass"><strong>Chú thích</strong>{(["HEAVY", "LIGHT", "DRY", "UNKNOWN"] as const).map((status) => <div key={status}><span className={`legend-dot ${STATUS_META[status].className}`} />{STATUS_META[status].label}</div>)}<small>Chấm lớn hơn = nhiều người báo cáo hơn</small></div> : null}
      <aside className={`area-sheet glass ${selected || pickedPoint ? "selected" : ""}`}>
        <div className="sheet-handle" />
        {selected ? <>
          <button className="sheet-close" onClick={() => setSelected(null)} aria-label="Đóng"><X size={18} /></button>
          <div className="eyebrow">TÌNH TRẠNG KHU VỰC</div>
          <h1>{selected.name}</h1>
          <div className="sheet-status-row"><StatusChip status={selected.status} /><span>{timeAgo(selected.latestReportAt)}</span></div>
          <div className="sheet-metrics"><div><strong>{selected.recentReporterCount}</strong><span>người báo</span></div><div><strong>{selected.recentReportCount}</strong><span>bài gần đây</span></div></div>
          <div className="sheet-actions"><Link className="primary-button" href={`/report?area=${selected.id}`}>Cập nhật tình trạng</Link><Link className="secondary-button" href={`/area/${selected.slug}`}>Xem lịch sử</Link></div>
        </> : pickedPoint ? <>
          <button className="sheet-close" onClick={() => { pickedMarkerRef.current?.remove(); pickedMarkerRef.current = null; pinGeocodeRef.current?.abort(); setPickedPoint(null); setPickedPlaceName(""); const map = mapRef.current; if (map) rememberReportLocation([map.getCenter().lng, map.getCenter().lat]); }} aria-label="Đóng"><X size={18} /></button>
          <div className="eyebrow"><MapPin size={14} /> ĐIỂM ĐÃ CHỌN</div>
          <h1>{pickedPlaceName || "Vị trí trên bản đồ"}</h1>
          <p className="picked-coordinates">{pickedPoint[1].toFixed(6)}, {pickedPoint[0].toFixed(6)}</p>
          <p>Điểm ghim đã sẵn sàng để bạn gửi tình trạng ngập tại đúng vị trí này.</p>
          <Link className="primary-button point-report-button" href={`/report?lat=${pickedPoint[1]}&lng=${pickedPoint[0]}`}>Đăng báo cáo tại đây</Link>
        </> : <>
          <div className="eyebrow">CẬP NHẬT QUANH HANU</div>
          <h1>Nhìn nhanh trước khi đi</h1>
          <div className="overview-row"><span className="danger-text"><b>{summary.HEAVY}</b> nguy hiểm</span><span className="warning-text"><b>{summary.LIGHT}</b> cảnh báo</span><span className="safe-text"><b>{summary.DRY}</b> ổn định</span></div>
          <p>Kéo bản đồ để đưa vị trí vào tâm, hoặc chạm một chấm ngập để xem chi tiết.</p>
          <button className="primary-button point-report-button" onClick={() => pinMapCenter()}><Crosshair size={18} /> Đặt ghim ở tâm bản đồ</button>
        </>}
      </aside>
      </> : null}
    </section>
  );
}
