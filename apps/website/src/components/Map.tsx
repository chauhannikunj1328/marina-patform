// The street map loads only when a page shows one (Leaflet is a large download).
import { lazy, Suspense, type ComponentProps } from "react";

const MapView = lazy(() => import("./MapView").then((m) => ({ default: m.MapView })));

export type { MapMarker } from "./MapView";

export function Map(props: ComponentProps<typeof MapView>) {
  return (
    <Suspense fallback={<div className="skeleton rounded-[12px]" style={{ height: props.height ?? 420 }} />}>
      <MapView {...props} />
    </Suspense>
  );
}
