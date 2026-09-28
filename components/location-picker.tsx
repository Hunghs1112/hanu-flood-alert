"use client";

import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { Crosshair, MapPin } from "lucide-react";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const DEFAULT_CENTER: [number, number] = [105.7952, 20.9914];

function createLocationMarker() {
  const element = document.createElement("div");
  element.className = "location-pin";
  const core = document.createElement("span");
  element.appendChild(core);
  return element;
}

export function LocationPicker({
  value,
  onChange
}: {
  value: [number, number] | null;
  onChange: (coordinates: [number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [centerPoint, setCenterPoint] = useState<[number, number]>(value ?? DEFAULT_CENTER);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: value ?? DEFAULT_CENTER,
      zoom: 15,
      minZoom: 12,
      maxZoom: 19,
      maxBounds: [[105.72, 20.92], [105.88, 21.06]],
      attributionControl: false,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["/api/tiles/{z}/{x}/{y}"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors"
          }
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }]
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.on("move", () => {
      const center = map.getCenter();
      setCenterPoint([center.lng, center.lat]);
    });
    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !value) return;

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ element: createLocationMarker(), anchor: "center" })
        .setLngLat(value)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(value);
    }
    map.easeTo({ center: value, duration: 450 });
  }, [value]);

  function confirmCenter() {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    const coordinates: [number, number] = [center.lng, center.lat];
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ element: createLocationMarker(), anchor: "center" })
        .setLngLat(coordinates)
        .addTo(mapRef.current!);
    } else {
      markerRef.current.setLngLat(coordinates);
    }
    onChangeRef.current(coordinates);
  }

  return (
    <div className="location-picker">
      <div ref={containerRef} className="location-picker-map" aria-label="Bản đồ chọn vị trí báo cáo" />
      <div className="location-picker-hint glass-clear">
        <MapPin size={16} />
        <span>Kéo bản đồ để đưa vị trí vào chính giữa</span>
      </div>
      <div className="location-center-target" aria-hidden="true"><span /></div>
      <div className="location-picker-coordinates">{centerPoint[1].toFixed(5)}, {centerPoint[0].toFixed(5)}</div>
      <button type="button" className="pin-center-button" onClick={confirmCenter}><Crosshair size={17} /> {value ? "Cập nhật ghim tại đây" : "Đặt ghim tại đây"}</button>
    </div>
  );
}
