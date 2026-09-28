"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import type { AreaStatus } from "@/lib/types";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const DEFAULT_CENTER: [number, number] = [105.7952, 20.9914];

export function PageMapBackdrop({ center = DEFAULT_CENTER }: { center?: [number, number] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const markers: Marker[] = [];
    const map = new maplibregl.Map({
      container: containerRef.current,
      center,
      zoom: 14.2,
      minZoom: 11,
      maxZoom: 18,
      attributionControl: false,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["/api/tiles/{z}/{x}/{y}"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.3, "raster-opacity": 0.9 } }]
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", async () => {
      try {
        const response = await fetch("/api/areas", { cache: "no-store" });
        const data = await response.json() as { areas: AreaStatus[] };
        for (const area of data.areas) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = `context-map-dot status-${area.status.toLowerCase()}`;
          element.style.setProperty("--dot-size", `${Math.min(24 + area.recentReporterCount * 4, 48)}px`);
          element.title = `${area.name} · ${area.recentReporterCount} người báo`;
          element.setAttribute("aria-label", element.title);
          element.addEventListener("click", () => { window.location.href = `/area/${area.slug}`; });
          markers.push(new maplibregl.Marker({ element }).setLngLat(area.coordinates).addTo(map));
        }
      } catch {
        // The basemap remains usable when live status data is temporarily unavailable.
      }
    });
    mapRef.current = map;

    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [center]);

  return <div className="page-map-backdrop" ref={containerRef} aria-hidden="true" />;
}
