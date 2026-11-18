export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GlobePin {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export function latLonToUnitVec(latDeg: number, lonDeg: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(lat);
  return {
    x: cosLat * Math.sin(lon),
    y: Math.sin(lat),
    z: cosLat * Math.cos(lon),
  };
}

export function decodeLandDots(flatCoords: number[]): Vec3[] {
  const result: Vec3[] = [];
  for (let i = 0; i < flatCoords.length; i += 2) {
    const lon = flatCoords[i] / 10;
    const lat = flatCoords[i + 1] / 10;
    result.push(latLonToUnitVec(lat, lon));
  }
  return result;
}

export function projectGlobePoint(
  vec: Vec3,
  viewLonDeg: number,
  tiltDeg = 9
): Vec3 {
  const viewLon = (viewLonDeg * Math.PI) / 180;
  const tilt = (tiltDeg * Math.PI) / 180;

  // Rotate around vertical Y axis by -viewLon so increasing viewLon turns land appropriately
  // Using standard spherical view rotation:
  // x1 = x * cos(a) - z * sin(a)
  // z1 = x * sin(a) + z * cos(a)
  const cosL = Math.cos(viewLon);
  const sinL = Math.sin(viewLon);
  const x1 = vec.x * cosL - vec.z * sinL;
  const y1 = vec.y;
  const z1 = vec.x * sinL + vec.z * cosL;

  // Rotate around horizontal X axis by tilt (north pole leans toward viewer)
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);
  const y2 = y1 * cosT - z1 * sinT;
  const z2 = y1 * sinT + z1 * cosT;

  return { x: x1, y: y2, z: z2 };
}

export function buildGreatCircleArc(
  p1: Vec3,
  p2: Vec3,
  segments = 56
): Vec3[] {
  const dot = Math.max(-1, Math.min(1, p1.x * p2.x + p1.y * p2.y + p1.z * p2.z));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);
  const pts: Vec3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let x: number;
    let y: number;
    let z: number;

    if (sinOmega < 1e-5) {
      x = p1.x + (p2.x - p1.x) * t;
      y = p1.y + (p2.y - p1.y) * t;
      z = p1.z + (p2.z - p1.z) * t;
      const len = Math.hypot(x, y, z) || 1;
      x /= len;
      y /= len;
      z /= len;
    } else {
      const w1 = Math.sin((1 - t) * omega) / sinOmega;
      const w2 = Math.sin(t * omega) / sinOmega;
      x = w1 * p1.x + w2 * p2.x;
      y = w1 * p1.y + w2 * p2.y;
      z = w1 * p1.z + w2 * p2.z;
    }

    const lift = 1 + (0.07 + 0.42 * (omega / Math.PI)) * Math.sin(Math.PI * t);
    pts.push({
      x: x * lift,
      y: y * lift,
      z: z * lift,
    });
  }

  return pts;
}

export const GLOBE_PINS: GlobePin[] = [
  { id: 'moscow', label: 'МОСКВА', lat: 55.75, lon: 37.62 },
  { id: 'milan', label: 'МИЛАН', lat: 45.46, lon: 9.19 },
  { id: 'dubai', label: 'ДУБАЙ', lat: 25.2, lon: 55.27 },
];
