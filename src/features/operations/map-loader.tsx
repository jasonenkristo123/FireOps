"use client";
import dynamic from "next/dynamic";
import type { DistrictBoundaries } from "./domain";
import type { MapPoint } from "./map";

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
  return <LazyMap {...props} />;
}
