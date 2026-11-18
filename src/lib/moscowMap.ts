import { Vec3 } from './globeMath';

export interface MoscowHub {
  id: string;
  label: string;
  shortLabel: string;
  dxKm: number;
  dyKm: number;
}

/**
 * Maps planar Moscow coordinates (km offset from Kremlin, x=East, y=North)
 * onto a 3D unit sphere cap (~46 deg radius) so Moscow fills the sphere beautifully.
 */
export function moscowKmToUnitVec(dxKm: number, dyKm: number): Vec3 {
  const scaleDegPerKm = 2.05; // ~22 km MKAD radius -> ~45 deg on sphere
  const lat = (dyKm * scaleDegPerKm * Math.PI) / 180;
  const lon = (dxKm * scaleDegPerKm * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return {
    x: cosLat * Math.sin(lon),
    y: Math.sin(lat),
    z: cosLat * Math.cos(lon),
  };
}

/**
 * Generates an organic urban dot-matrix covering Moscow inside and slightly beyond MKAD,
 * denser toward central districts (Sadovoe/TTK) and tapering smoothly past MKAD.
 */
export function generateMoscowDotGrid(): Vec3[] {
  const dots: Vec3[] = [];
  const stepKm = 1.08;
  let row = 0;

  for (let y = -24; y <= 25; y += stepKm) {
    const offset = (row % 2) * (stepKm * 0.5);
    for (let x = -23; x <= 23; x += stepKm) {
      const px = x + offset;
      const py = y;

      // MKAD authentic slight oblong contour (slightly taller N-S, angled -8 deg)
      const rad = (-8 * Math.PI) / 180;
      const rx = px * Math.cos(rad) - py * Math.sin(rad);
      const ry = px * Math.sin(rad) + py * Math.cos(rad);
      const mkadNorm = Math.hypot(rx / 17.2, ry / 20.4);

      // Keep dense urban fabric inside MKAD + organic outer districts (Mitino, Butovo, Solntsevo, Nekrasovka)
      const outerLobe =
        (px < -12 && py > 4 && py < 16 && mkadNorm < 1.24) || // Mitino / NW
        (px > -6 && px < 4 && py < -16 && mkadNorm < 1.26) || // Yuzhnoye Butovo
        (px > 12 && py < -2 && py > -13 && mkadNorm < 1.22); // Zhulebino / Nekrasovka

      if (mkadNorm > 1.03 && !outerLobe) continue;

      // Carve subtle river channel clearing along Moskva River for visual clarity
      const riverY =
        -0.45 * px +
        2.6 * Math.sin(px * 0.34) -
        1.4 * Math.cos(px * 0.16);
      if (Math.abs(py - riverY) < 0.72 && Math.abs(px) < 20) continue;

      dots.push(moscowKmToUnitVec(px, py));
    }
    row++;
  }

  return dots;
}

/**
 * Returns sampled unit vectors for concentric Moscow rings (Bulvarnoe, Sadovoe, TTK, MKAD)
 */
export function buildMoscowRing(
  rxKm: number,
  ryKm: number,
  rotDeg = -8,
  segments = 72
): Vec3[] {
  const pts: Vec3[] = [];
  const rad = (rotDeg * Math.PI) / 180;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const lx = rxKm * Math.cos(a);
    const ly = ryKm * Math.sin(a);
    const px = lx * Math.cos(rad) + ly * Math.sin(rad);
    const py = -lx * Math.sin(rad) + ly * Math.cos(rad);
    pts.push(moscowKmToUnitVec(px, py));
  }
  return pts;
}

/**
 * Winding Moskva River path across the city (NW Khoroshevo -> City -> Luzhniki -> Kremlin -> Zil -> Maryino SE)
 */
export function buildMoskvaRiver(segments = 64): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const px = -20 + t * 40;
    const py =
      -0.45 * px +
      2.6 * Math.sin(px * 0.34) -
      1.4 * Math.cos(px * 0.16);
    const v = moscowKmToUnitVec(px, py);
    // Lift infinitesimally so it draws cleanly on the sphere face
    pts.push({ x: v.x * 1.003, y: v.y * 1.003, z: v.z * 1.003 });
  }
  return pts;
}

export const MOSCOW_HUBS: MoscowHub[] = [
  { id: 'cao', label: 'КРЕМЛЬ · ЦАО', shortLabel: 'ЦАО', dxKm: 1.6, dyKm: 1.2 },
  { id: 'city', label: 'МОСКВА-СИТИ', shortLabel: 'СИТИ', dxKm: -8.2, dyKm: -0.8 },
  { id: 'sao', label: 'СЕВЕР · САО', shortLabel: 'САО', dxKm: -1.8, dyKm: 12.6 },
  { id: 'uao', label: 'ЮГ · ЮАО', shortLabel: 'ЮАО', dxKm: 5.8, dyKm: -11.4 },
  { id: 'zao', label: 'ЗАПАД · ЗАО', shortLabel: 'ЗАО', dxKm: -13.6, dyKm: -8.6 },
];

/**
 * Generates radial Moscow avenues (Leningradsky, Yaroslavsky, Entuziastov, Varshavskoe, Kutuzovsky, etc.)
 * extending across the spherical city-planet beyond MKAD for rich 3D geodesic continuity.
 */
export function buildMoscowAvenues(maxKm = 27, segments = 24): Vec3[][] {
  const anglesDeg = [14, 58, 96, 134, 178, 224, 268, 318];
  return anglesDeg.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const pts: Vec3[] = [];
    for (let i = 0; i <= segments; i++) {
      const rKm = 2.2 + (i / segments) * (maxKm - 2.2);
      const px = Math.cos(rad) * rKm;
      const py = Math.sin(rad) * rKm;
      pts.push(moscowKmToUnitVec(px, py));
    }
    return pts;
  });
}

export interface CityTowerSpec {
  dxKm: number;
  dyKm: number;
  height: number;
  width: number;
}

export const MOSCOW_CITY_TOWERS: CityTowerSpec[] = [
  { dxKm: -7.8, dyKm: -1.6, height: 0.135, width: 0.025 },
  { dxKm: -7.1, dyKm: -1.1, height: 0.105, width: 0.021 },
  { dxKm: -8.3, dyKm: -1.0, height: 0.092, width: 0.020 },
  { dxKm: -7.5, dyKm: -2.2, height: 0.078, width: 0.019 },
  { dxKm: -6.7, dyKm: -1.8, height: 0.064, width: 0.018 },
];

