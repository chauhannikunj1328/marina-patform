// Real map (Leaflet) with street tiles that follow the light/dark theme, brand-styled markers and
// an optional "click to place" mode for setting a marina's position.
// Tiles: OpenStreetMap's standard tiles (no key; dark mode tints them with a CSS filter). They're
// meant for light use, so for production set VITE_MAP_TILES (and optionally VITE_MAP_TILES_DARK and
// VITE_MAP_ATTRIBUTION) to a provider you have an account with (MapTiler, Stadia, Mapbox…).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isRtl, t, type Point } from "@marina/shared";

const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const LIGHT: string = import.meta.env.VITE_MAP_TILES || OSM;
const DARK: string | undefined = import.meta.env.VITE_MAP_TILES_DARK;
const ATTRIBUTION: string = import.meta.env.VITE_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export interface MapMarker extends Point {
  id: string;
  /** Accessible name and hover title. */
  label: string;
  /** Short text inside the pin, e.g. a count. */
  badge?: string | number;
  /** Muted pin (e.g. a marina closed to bookings). */
  muted?: boolean;
  /** Highlighted (overrides selectedId, so several pins can be on). */
  selected?: boolean;
  popup?: ReactNode;
}

/** The current theme, kept in sync with the theme toggle (it sets data-theme on <html>). */
function useTheme(): "light" | "dark" {
  const read = (): "light" | "dark" => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(read()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

function pin(m: MapMarker, selected: boolean) {
  const size = m.badge !== undefined ? 30 : 22;
  const cls = ["map-pin", selected && "map-pin--on", m.muted && "map-pin--muted"].filter(Boolean).join(" ");
  return L.divIcon({
    className: "",
    html: `<span class="${cls}" style="width:${size}px;height:${size}px">${m.badge ?? ""}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/** Fits the view to the markers when `fitKey` changes (not on every render, so panning sticks). */
function Fit({ points, fitKey, zoom }: { points: Point[]; fitKey: string; zoom: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!points.length) return;
    const fit = () => {
      if (points.length === 1) map.setView([points[0].lat, points[0].lng], zoom);
      else map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [36, 36], maxZoom: zoom });
    };
    if (first.current) { first.current = false; fit(); return; }
    // Later changes wait for a pause, so typing coordinates doesn't fly through half-typed values.
    const timer = setTimeout(fit, 300);
    return () => clearTimeout(timer);
    // Re-fit only when the set of places changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);
  return null;
}

/** Keeps the map filling its box when it opens in a dialog or the layout changes size. */
function Resize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const obs = new ResizeObserver(() => map.invalidateSize());
    obs.observe(el);
    return () => obs.disconnect();
  }, [map]);
  return null;
}

function Picker({ onPick }: { onPick: (p: Point) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: Number(e.latlng.lat.toFixed(5)), lng: Number(e.latlng.lng.toFixed(5)) }) });
  return null;
}

/** Marinas closer than this on screen merge into one numbered pin. */
const GROUP_PX = 34;

/**
 * Draws the pins. When zoomed out, pins that would overlap become one pin showing how many marinas
 * it holds; clicking it zooms in until they separate.
 */
function Pins({ markers, selectedId, onSelect }: { markers: MapMarker[]; selectedId?: string; onSelect?: (id: string) => void }) {
  const map = useMap();
  // Read straight from the map, so it's right even when the first fit happens before rendering.
  const zoom = useSyncExternalStore(
    useCallback((changed: () => void) => {
      map.on("zoomend", changed);
      return () => { map.off("zoomend", changed); };
    }, [map]),
    () => map.getZoom(),
  );
  const groups = useMemo(() => {
    const out: { items: MapMarker[]; x: number; y: number }[] = [];
    for (const m of markers) {
      const p = map.project([m.lat, m.lng], zoom);
      const g = out.find((o) => Math.hypot(o.x - p.x, o.y - p.y) < GROUP_PX);
      if (g) g.items.push(m);
      else out.push({ items: [m], x: p.x, y: p.y });
    }
    return out;
  }, [markers, zoom, map]);
  const on = (m: MapMarker) => m.selected ?? m.id === selectedId;
  return (
    <>
      {groups.map(({ items }) => {
        if (items.length === 1) {
          const m = items[0];
          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={pin(m, on(m))}
              title={m.label}
              alt={m.label}
              keyboard
              zIndexOffset={on(m) ? 1000 : 0}
              eventHandlers={onSelect ? { click: () => onSelect(m.id) } : undefined}
            >
              {m.popup && <Popup>{m.popup}</Popup>}
            </Marker>
          );
        }
        const lat = items.reduce((s, m) => s + m.lat, 0) / items.length;
        const lng = items.reduce((s, m) => s + m.lng, 0) / items.length;
        const label = t("{n} marinas: {names}", { n: items.length, names: items.map((m) => m.label.split(",")[0]).join(", ") });
        const group: MapMarker = { id: items.map((m) => m.id).join("+"), lat, lng, label, badge: items.length };
        return (
          <Marker
            key={group.id}
            position={[lat, lng]}
            icon={pin(group, items.some(on))}
            title={label}
            alt={label}
            keyboard
            zIndexOffset={items.some(on) ? 1000 : 500}
            eventHandlers={{
              click: () => {
                onSelect?.(items[0].id);
                map.fitBounds(L.latLngBounds(items.map((m) => [m.lat, m.lng])), { padding: [60, 60], maxZoom: 16 });
              },
            }}
          />
        );
      })}
    </>
  );
}

export function MapView({
  markers,
  selectedId,
  onSelect,
  onPick,
  height = 420,
  zoom = 13,
  label,
  fitKey: fitOn,
}: {
  markers: MapMarker[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Click on the map to choose a position (marina form). */
  onPick?: (p: Point) => void;
  height?: number | string;
  /** Closest zoom when fitting (a single marker uses exactly this). */
  zoom?: number;
  /** Accessible name for the map region. */
  label: string;
  /** Re-fit the view only when this changes (default: whenever the markers move). */
  fitKey?: string;
}) {
  const theme = useTheme();
  const moved = useMemo(() => markers.map((m) => `${m.id}:${m.lat},${m.lng}`).join("|"), [markers]);
  const fitKey = fitOn ?? moved;
  const center: [number, number] = markers.length ? [markers[0].lat, markers[0].lng] : [39.5, -98.35];
  return (
    <div role="region" aria-label={label} data-tint={theme === "dark" && !DARK ? "night" : "day"} className={`map-shell relative overflow-hidden rounded-[12px] border border-line${onPick ? " picking" : ""}`} style={{ height }}>
      <MapContainer center={center} zoom={markers.length ? zoom : 4} zoomControl={false} scrollWheelZoom={false} className="h-full w-full" attributionControl>
        <TileLayer key={theme} url={theme === "dark" && DARK ? DARK : LIGHT} attribution={ATTRIBUTION} maxZoom={19} />
        <ZoomControl position={isRtl() ? "topleft" : "topright"} zoomInTitle={t("Zoom in")} zoomOutTitle={t("Zoom out")} />
        <Resize />
        <Fit points={markers} fitKey={fitKey} zoom={zoom} />
        {onPick && <Picker onPick={onPick} />}
        <Pins markers={markers} selectedId={selectedId} onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}
