"use client";

import { usePathname } from "next/navigation";
import MapExperience from "./map-experience";

export function AppMapShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mapMode = pathname === "/";

  return (
    <>
      <MapExperience controlsVisible={mapMode} />
      <div className={mapMode ? "route-layer route-layer-map" : "route-layer"}>{children}</div>
    </>
  );
}
