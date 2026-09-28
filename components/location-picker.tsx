"use client";

import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapInstance, Marker } from "maplibre-gl";
import { MapPin } from "lucide-react";

maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

const DEFAULT_CENTER: [number, number] = [105.7952, 20.9914];

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
    map.on("click", (event) => {
      const coordinates: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      onChangeRef.current(coordinates);
    });
    map.getCanvas().style.cursor = "crosshair";
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
      markerRef.current = new maplibregl.Marker({ color: "#ff6b4a" })
        .setLngLat(value)
        .addTo(map);
    } else {
      markerRef.current.setLngLat(value);
    }
    map.easeTo({ center: value, duration: 450 });
  }, [value]);

  return (
    <div className="location-picker">
      <div ref={containerRef} className="location-picker-map" aria-label="Bản đồ chọn vị trí báo cáo" />
      <div className="location-picker-hint glass-clear">
        <MapPin size={16} />
        <span>{value ? "Đã ghim vị trí · Chạm nơi khác để đổi" : "Chạm vào bản đồ để đặt ghim"}</span>
      </div>
      {value ? <div className="location-picker-coordinates">{value[1].toFixed(5)}, {value[0].toFixed(5)}</div> : null}
    </div>
  );
}
