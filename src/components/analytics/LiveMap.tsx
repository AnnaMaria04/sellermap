"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

/**
 * Self-contained "Live View" map visualisation — no external tiles. Renders the
 * activity either as a gently rotating teal globe (default) or a stylised flat
 * map of Russia. Markers are deterministic so the same region always lands in
 * the same spot, mirroring the Shopify Live View aesthetic with pure SVG/CSS.
 */

export type MapMode = "globe" | "map";

export interface MapMarker {
  /** Region / city name — used as the deterministic seed and tooltip label. */
  region: string;
  /** "order" markers are teal, "visitor" markers are grey. */
  kind: "order" | "visitor";
  /** Relative weight (e.g. order count) used to size the dot. */
  weight: number;
}

/** Rough lat/long for the built-in RU cities; everything else is hashed. */
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  "Москва": { lat: 55.75, lon: 37.62 },
  "Санкт-Петербург": { lat: 59.94, lon: 30.31 },
  "Казань": { lat: 55.79, lon: 49.12 },
  "Екатеринбург": { lat: 56.84, lon: 60.6 },
  "Новосибирск": { lat: 55.03, lon: 82.92 },
  "Краснодар": { lat: 45.04, lon: 38.98 },
  "Ростов-на-Дону": { lat: 47.23, lon: 39.7 },
  "Самара": { lat: 53.2, lon: 50.15 },
  "Уфа": { lat: 54.74, lon: 55.97 },
  "Челябинск": { lat: 55.16, lon: 61.4 },
};

/** Deterministic 32-bit hash of a string (FNV-1a). */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Resolve a region to a [lat, lon], falling back to a hashed point over RU. */
function coordsFor(region: string): { lat: number; lon: number } {
  const known = CITY_COORDS[region];
  if (known) return known;
  const h = hash(region);
  // Spread unknown regions across the populated band of Russia.
  const lat = 45 + ((h >>> 0) % 1700) / 100; // 45..62
  const lon = 30 + ((h >>> 8) % 11000) / 100; // 30..140
  return { lat, lon };
}

const VIEWBOX = 400;
const R = 150; // globe radius

/**
 * Project lat/lon onto the visible hemisphere of the globe. `spin` (degrees)
 * shifts the central meridian so the auto-rotation also moves the markers, and
 * `centerLon` lets a search selection recentre the globe on a city.
 */
function projectGlobe(
  lat: number,
  lon: number,
  spin: number,
  centerLon: number,
): { x: number; y: number; front: boolean } {
  const latR = (lat * Math.PI) / 180;
  const lonR = ((lon - centerLon - spin) * Math.PI) / 180;
  const x = VIEWBOX / 2 + R * Math.cos(latR) * Math.sin(lonR);
  const y = VIEWBOX / 2 - R * Math.sin(latR);
  // Markers on the far side of the sphere are hidden.
  const front = Math.cos(latR) * Math.cos(lonR) >= 0;
  return { x, y, front };
}

/** Flat-map projection across a simple equirectangular box over Russia. */
function projectFlat(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon - 18) / (150 - 18)) * VIEWBOX;
  const y = ((68 - lat) / (68 - 41)) * VIEWBOX;
  return { x, y };
}

export function LiveMap({
  mode,
  markers,
  zoom,
  spin,
  centerRegion,
  className,
}: {
  mode: MapMode;
  markers: MapMarker[];
  /** Globe scale multiplier (clamped by the parent). Ignored in map mode. */
  zoom: number;
  /** Auto-rotation offset in degrees (driven by a CSS-free RAF-less timer). */
  spin: number;
  /** Region the search box recentred on, highlighted on the globe. */
  centerRegion: string | null;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const centerLon = useMemo(
    () => (centerRegion ? coordsFor(centerRegion).lon : 90),
    [centerRegion],
  );

  const maxWeight = useMemo(
    () => Math.max(1, ...markers.map((m) => m.weight)),
    [markers],
  );
  const dotRadius = (m: MapMarker) => 3 + (m.weight / maxWeight) * 4;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={mode === "globe" ? "Глобус активности" : "Карта активности"}
    >
      <defs>
        <radialGradient id={`${uid}-sphere`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#dbeafe" />
          <stop offset="55%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#7dd3c8" />
        </radialGradient>
        <pattern
          id={`${uid}-dots`}
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="3" r="1.4" fill="#0d9488" opacity="0.45" />
        </pattern>
        <clipPath id={`${uid}-clip`}>
          <circle cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={R} />
        </clipPath>
      </defs>

      {mode === "globe" ? (
        <g
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center",
            transition: "transform 200ms ease-out",
          }}
        >
          {/* Sphere body */}
          <circle cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={R} fill={`url(#${uid}-sphere)`} />
          {/* Hex/dot texture, masked to the sphere */}
          <circle
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={R}
            fill={`url(#${uid}-dots)`}
            clipPath={`url(#${uid}-clip)`}
          />
          {/* Soft latitude/longitude graticule for depth */}
          <g clipPath={`url(#${uid}-clip)`} stroke="#0d9488" strokeOpacity="0.18" fill="none">
            <ellipse cx={VIEWBOX / 2} cy={VIEWBOX / 2} rx={R} ry={R * 0.55} />
            <ellipse cx={VIEWBOX / 2} cy={VIEWBOX / 2} rx={R * 0.55} ry={R} />
            <line x1={VIEWBOX / 2 - R} y1={VIEWBOX / 2} x2={VIEWBOX / 2 + R} y2={VIEWBOX / 2} />
          </g>
          <circle
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={R}
            fill="none"
            stroke="#0f766e"
            strokeOpacity="0.35"
          />

          {/* Activity markers projected onto the visible hemisphere */}
          {markers.map((m, i) => {
            const { lat, lon } = coordsFor(m.region);
            const { x, y, front } = projectGlobe(lat, lon, spin, centerLon);
            if (!front) return null;
            const highlighted = m.region === centerRegion;
            return (
              <circle
                key={`${m.region}-${m.kind}-${i}`}
                cx={x}
                cy={y}
                r={dotRadius(m) + (highlighted ? 2 : 0)}
                fill={m.kind === "order" ? "#14b8a6" : "#94a3b8"}
                stroke={highlighted ? "#0f766e" : "#ffffff"}
                strokeWidth={highlighted ? 2 : 1}
                opacity={m.kind === "order" ? 0.95 : 0.75}
              >
                <title>{m.region}</title>
              </circle>
            );
          })}
        </g>
      ) : (
        <g>
          {/* Stylised, deliberately rough silhouette of Russia (not to scale) */}
          <path
            d="M30,170 L70,150 L110,160 L140,140 L180,150 L210,135 L250,145 L300,130 L350,150 L380,140 L375,175 L350,185 L360,210 L320,220 L300,205 L260,215 L230,200 L190,215 L150,205 L120,220 L80,210 L50,220 L35,200 Z"
            fill="var(--c-bg3)"
            stroke="var(--c-border2)"
            strokeWidth="1.5"
          />

          {/* Store location pin (Moscow) */}
          {(() => {
            const { x, y } = projectFlat(CITY_COORDS["Москва"].lat, CITY_COORDS["Москва"].lon);
            return (
              <g transform={`translate(${x}, ${y})`}>
                <path
                  d="M0,2 C-7,-8 -7,-18 0,-18 C7,-18 7,-8 0,2 Z"
                  fill="var(--c-blue)"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle cx="0" cy="-12" r="3" fill="#ffffff" />
                <title>Ваш магазин · Москва</title>
              </g>
            );
          })()}

          {/* Region markers */}
          {markers.map((m, i) => {
            const { lat, lon } = coordsFor(m.region);
            const { x, y } = projectFlat(lat, lon);
            return (
              <circle
                key={`${m.region}-${m.kind}-${i}`}
                cx={x}
                cy={y}
                r={dotRadius(m)}
                fill={m.kind === "order" ? "#14b8a6" : "#94a3b8"}
                stroke="#ffffff"
                strokeWidth="1"
                opacity={m.kind === "order" ? 0.95 : 0.75}
              >
                <title>{m.region}</title>
              </circle>
            );
          })}
        </g>
      )}
    </svg>
  );
}
