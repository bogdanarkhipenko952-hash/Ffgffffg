import {
  Vec3,
  buildGreatCircleArc,
  projectGlobePoint,
} from '../lib/globeMath';
import {
  MOSCOW_HUBS,
  buildMoskvaRiver,
  buildMoscowRing,
  generateMoscowDotGrid,
  moscowKmToUnitVec,
} from '../lib/moscowMap';
import { clamp } from '../lib/scrollMath';

export interface GlobeDrawParams {
  canvas: HTMLCanvasElement;
  elapsedSec: number;
  vw: number;
  heroHeight: number;
  uv: number;
  up: number;
  isPortrait: boolean;
  reducedMotion: boolean;
  scrollFadeOpacity: number;
}

const MOSCOW_DOTS: Vec3[] = generateMoscowDotGrid();
const MOSCOW_RIVER: Vec3[] = buildMoskvaRiver(64);
const RING_SADOVOE: Vec3[] = buildMoscowRing(3.4, 3.8, -8, 56);
const RING_TTK: Vec3[] = buildMoscowRing(7.4, 8.2, -8, 64);
const RING_MKAD: Vec3[] = buildMoscowRing(17.2, 20.4, -8, 84);

const HUB_VECS = MOSCOW_HUBS.map((h) => ({
  ...h,
  vec: moscowKmToUnitVec(h.dxKm, h.dyKm),
}));

// Raised 3D cobalt dispatch arcs across Moscow districts
const MOSCOW_ARCS = [
  buildGreatCircleArc(HUB_VECS[0].vec, HUB_VECS[1].vec, 48), // ЦАО <-> Москва-Сити
  buildGreatCircleArc(HUB_VECS[0].vec, HUB_VECS[2].vec, 48), // ЦАО <-> Север САО
  buildGreatCircleArc(HUB_VECS[0].vec, HUB_VECS[3].vec, 48), // ЦАО <-> Юг ЮАО
  buildGreatCircleArc(HUB_VECS[1].vec, HUB_VECS[2].vec, 48), // Москва-Сити <-> Север САО
];

let cachedSphereCanvas: HTMLCanvasElement | null = null;
let cachedKey = '';

function getStaticSphereLayer(
  w: number,
  h: number,
  dpr: number,
  cx: number,
  cy: number,
  R: number
): HTMLCanvasElement {
  const key = `${w}|${h}|${dpr}|${cx.toFixed(1)}|${cy.toFixed(1)}|${R.toFixed(1)}`;
  if (cachedSphereCanvas && cachedKey === key) {
    return cachedSphereCanvas;
  }

  const off = cachedSphereCanvas || document.createElement('canvas');
  off.width = Math.round(w * dpr);
  off.height = Math.round(h * dpr);
  const octx = off.getContext('2d');
  if (!octx) return off;

  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
  octx.clearRect(0, 0, w, h);

  // 1. Haze and rim glow
  const hazeGrad = octx.createRadialGradient(
    cx - 0.05 * R,
    cy + 0.08 * R,
    0.9 * R,
    cx - 0.05 * R,
    cy + 0.08 * R,
    1.5 * R
  );
  hazeGrad.addColorStop(0, 'rgba(47,99,255,0.55)');
  hazeGrad.addColorStop(0.12, 'rgba(90,128,255,0.32)');
  hazeGrad.addColorStop(0.4, 'rgba(169,188,255,0.16)');
  hazeGrad.addColorStop(1, 'rgba(238,242,255,0)');
  octx.fillStyle = hazeGrad;
  octx.fillRect(0, 0, w, h);

  // 2. Sphere body
  const bodyGrad = octx.createRadialGradient(
    cx + 0.3 * R,
    cy - 0.42 * R,
    0.05 * R,
    cx + 0.1 * R,
    cy - 0.15 * R,
    1.25 * R
  );
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(0.55, '#f6f8ff');
  bodyGrad.addColorStop(0.85, '#e8eeff');
  bodyGrad.addColorStop(1, '#d5dfff');

  octx.beginPath();
  octx.arc(cx, cy, R, 0, Math.PI * 2);
  octx.fillStyle = bodyGrad;
  octx.fill();

  // 3. Inner shading clipped to sphere
  octx.save();
  octx.beginPath();
  octx.arc(cx, cy, R, 0, Math.PI * 2);
  octx.clip();

  const innerLimb = octx.createRadialGradient(cx, cy, 0.8 * R, cx, cy, R);
  innerLimb.addColorStop(0, 'rgba(47,99,255,0)');
  innerLimb.addColorStop(0.75, 'rgba(47,99,255,0.10)');
  innerLimb.addColorStop(1, 'rgba(47,99,255,0.42)');
  octx.fillStyle = innerLimb;
  octx.fillRect(cx - R, cy - R, R * 2, R * 2);

  const blBoost = octx.createLinearGradient(
    cx - 0.8 * R,
    cy + 0.8 * R,
    cx + 0.2 * R,
    cy - 0.2 * R
  );
  blBoost.addColorStop(0, 'rgba(47,99,255,0.30)');
  blBoost.addColorStop(1, 'rgba(47,99,255,0)');
  octx.fillStyle = blBoost;
  octx.fillRect(cx - R, cy - R, R * 2, R * 2);
  octx.restore();

  cachedSphereCanvas = off;
  cachedKey = key;
  return off;
}

function strokeProjectedCurve(
  ctx: CanvasRenderingContext2D,
  pts: Vec3[],
  viewLon: number,
  tilt: number,
  cx: number,
  cy: number,
  R: number
): void {
  ctx.beginPath();
  let started = false;
  for (let i = 0; i < pts.length; i++) {
    const p = projectGlobePoint(pts[i], viewLon, tilt);
    if (p.z <= 0.02) {
      started = false;
      continue;
    }
    const sx = cx + R * p.x;
    const sy = cy - R * p.y;
    if (!started) {
      ctx.moveTo(sx, sy);
      started = true;
    } else {
      ctx.lineTo(sx, sy);
    }
  }
  ctx.stroke();
}

export function drawGlobeFrame(params: GlobeDrawParams): void {
  const {
    canvas,
    elapsedSec,
    vw,
    heroHeight,
    uv,
    up,
    isPortrait,
    reducedMotion,
    scrollFadeOpacity,
  } = params;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;

  const targetW = Math.round(w * dpr);
  const targetH = Math.round(h * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = isPortrait ? up : uv;
  const ox = vw - 1440 * scale;
  const oy = isPortrait
    ? 16 - 130 * scale
    : Math.min(0, (heroHeight - 900 * scale) / 2);

  const cx = ox + 1166 * scale;
  const cy = oy + 530 * scale;
  const R = 400 * scale;

  const introAlpha = reducedMotion
    ? 1
    : 1 - Math.pow(1 - clamp(elapsedSec / 1.1), 3);
  const totalAlpha = introAlpha * scrollFadeOpacity;

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (totalAlpha <= 0.002) {
    ctx.restore();
    return;
  }

  ctx.globalAlpha = totalAlpha;

  // 1-3. Blit cached static haze + sphere body + inner shading
  const staticLayer = getStaticSphereLayer(w, h, dpr, cx, cy, R);
  ctx.drawImage(staticLayer, 0, 0, w, h);

  // Subtle living 3D orbital sway centered directly on Moscow
  const viewLon = reducedMotion ? -4 : -4 + Math.sin(elapsedSec * 0.36) * 10;
  const tilt = reducedMotion ? 8 : 8 + Math.cos(elapsedSec * 0.28) * 3.5;

  // 4. Moscow rings, Moskva River & dense urban dot matrix clipped to sphere
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // Concentric Moscow rings (Sadovoe, TTK, MKAD)
  ctx.lineWidth = Math.max(1, 1.1 * scale);
  ctx.strokeStyle = 'rgba(47,99,255,0.18)';
  strokeProjectedCurve(ctx, RING_SADOVOE, viewLon, tilt, cx, cy, R);
  strokeProjectedCurve(ctx, RING_TTK, viewLon, tilt, cx, cy, R);

  ctx.lineWidth = Math.max(1.2, 1.7 * scale);
  ctx.strokeStyle = 'rgba(47,99,255,0.34)';
  strokeProjectedCurve(ctx, RING_MKAD, viewLon, tilt, cx, cy, R);

  // Winding Moskva River ribbon
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, 7.5 * scale);
  ctx.strokeStyle = 'rgba(169,188,255,0.48)';
  strokeProjectedCurve(ctx, MOSCOW_RIVER, viewLon, tilt, cx, cy, R);
  ctx.lineWidth = Math.max(1.5, 2.5 * scale);
  ctx.strokeStyle = 'rgba(47,99,255,0.38)';
  strokeProjectedCurve(ctx, MOSCOW_RIVER, viewLon, tilt, cx, cy, R);

  // Moscow district dots in 5 depth buckets
  const baseDotRadius = Math.max(1.0, 2.0 * scale);
  const bx: number[][] = [[], [], [], [], []];
  const by: number[][] = [[], [], [], [], []];
  const br: number[][] = [[], [], [], [], []];

  for (let i = 0; i < MOSCOW_DOTS.length; i++) {
    const p = projectGlobePoint(MOSCOW_DOTS[i], viewLon, tilt);
    if (p.z <= 0.02) continue;
    const b = Math.min(4, Math.floor((p.z - 0.45) * 9));
    const bucket = Math.max(0, Math.min(4, b));
    const r = baseDotRadius * (0.55 + 0.45 * Math.sqrt(p.z));
    bx[bucket].push(cx + R * p.x);
    by[bucket].push(cy - R * p.y);
    br[bucket].push(r);
  }

  for (let b = 0; b < 5; b++) {
    const xs = bx[b];
    if (xs.length === 0) continue;
    const ys = by[b];
    const rs = br[b];
    ctx.beginPath();
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      const y = ys[i];
      const r = rs[i];
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = `rgba(17,17,17,${(0.24 + b * 0.18).toFixed(2)})`;
    ctx.fill();
  }

  ctx.restore(); // unclip sphere

  // 5. Rim + white highlight arc
  const rimWidth = Math.max(1, 1.4 * scale);
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(47,99,255,0.38)';
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, R - 0.8, -2.4, -0.3);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = rimWidth;
  ctx.stroke();

  // 6. Moscow dispatch route arcs
  ctx.lineWidth = Math.max(1.2, 1.45 * scale);
  ctx.strokeStyle = 'rgba(47,99,255,0.85)';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < MOSCOW_ARCS.length; i++) {
    const arcProg = reducedMotion
      ? 1
      : clamp((elapsedSec - (0.9 + i * 0.15)) / 1.0);
    if (arcProg <= 0) continue;

    const pts = MOSCOW_ARCS[i];
    const maxIdx = Math.floor(arcProg * (pts.length - 1));
    if (maxIdx < 1) continue;

    ctx.beginPath();
    let drawing = false;
    for (let j = 0; j <= maxIdx; j++) {
      const p = projectGlobePoint(pts[j], viewLon, tilt);
      const visible = p.z > 0 || p.x * p.x + p.y * p.y > 1;
      const sx = cx + R * p.x;
      const sy = cy - R * p.y;
      if (visible) {
        if (!drawing) {
          ctx.moveTo(sx, sy);
          drawing = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      } else {
        drawing = false;
      }
    }
    ctx.stroke();
  }

  // 7. Moscow district pins & labels
  const pinR = Math.max(3.2, 4.8 * scale);
  const labelSize = isPortrait ? Math.max(9.5, 12.2 * scale) : 12.2 * scale;
  ctx.font = `500 ${labelSize}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  for (let i = 0; i < HUB_VECS.length; i++) {
    const pinProg = reducedMotion
      ? 1
      : clamp((elapsedSec - (0.7 + i * 0.14)) / 0.55);
    if (pinProg <= 0) continue;

    const hub = HUB_VECS[i];
    const p = projectGlobePoint(hub.vec, viewLon, tilt);
    if (p.z <= 0) continue;

    const pinAlpha = clamp(p.z * 5) * pinProg;
    if (pinAlpha <= 0.01) continue;

    const sx = cx + R * p.x;
    const sy = cy - R * p.y;

    ctx.save();
    ctx.globalAlpha = totalAlpha * pinAlpha;

    ctx.beginPath();
    ctx.arc(sx, sy, pinR, 0, Math.PI * 2);
    ctx.fillStyle = '#2f63ff';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.lineJoin = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(hub.label, sx, sy - (pinR + 0.55 * labelSize));
    ctx.fillStyle = '#111111';
    ctx.fillText(hub.label, sx, sy - (pinR + 0.55 * labelSize));
    ctx.restore();
  }

  ctx.restore();
}
