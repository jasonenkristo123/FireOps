"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { DistrictBoundaries } from "./domain";
import type { MapPoint } from "./map";
import { MapDistance } from "./map-distance";
import type { ReferenceLocation } from "./map-geometry";

const LazyMap = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => (
    <output className="block h-[560px] w-full bg-muted p-6">
      Memuat peta Kalimantan Barat…
    </output>
  ),
});
export function IncidentMap(props: {
  points: MapPoint[];
  boundaries?: DistrictBoundaries;
  districtUrl?: string;
  overview?: boolean;
}) {
  const [location, setLocation] = useState<ReferenceLocation | null>(null);
  const [selection, setSelection] = useState<MapPoint | null>(null);
  // A filter or refreshed NASA snapshot must never connect to a stale point.
  const selectedPoint = selection
    ? (props.points.find(
        (point) =>
          point.id === selection.id &&
          point.latitude === selection.latitude &&
          point.longitude === selection.longitude,
      ) ?? null)
    : null;
  return (
    <>
      <LazyMap
        {...props}
        location={location}
        selectedPoint={selectedPoint}
        onSelectPoint={setSelection}
      />
      <MapDistance
        points={props.points}
        location={location}
        onLocation={setLocation}
        selectedPoint={selectedPoint}
        onSelectPoint={setSelection}
      />
    </>
  );
}
