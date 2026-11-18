export interface LayoutModes {
  port: boolean;
  land: boolean;
  hp: boolean;
  sticky: boolean;
}

export interface LayoutUnits {
  vw: number;
  vh: number;
  uc: number;
  uv: number;
  us: number;
  u: number;
  up: number;
  heroHeight: number;
  wrapHeight: number;
  A: number;
  B: number;
  modes: LayoutModes;
}

export interface HorizonGlowState {
  e: number;
  drawnEdge: number;
  opacity: number;
  visible: boolean;
  heroHidden: boolean;
  k: number;
  navOpacity: number;
  copyTranslateVh: number;
  copyOpacity: number;
  globeOpacity: number;
  glitchJ: number;
}

export interface ServicesProgress {
  q: number;
  r: number;
  settled: boolean;
  stripX: number;
  lettersX: number;
}

export function clamp(val: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, val));
}

export function easeInOutQuad(t: number): number {
  const x = clamp(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function easeOutCubic(t: number): number {
  const x = clamp(t);
  return 1 - Math.pow(1 - x, 3);
}

export function computeLayoutUnits(
  vw: number,
  vh: number,
  stripWidth = 2200,
  heroCopyBottomPx = 0
): LayoutUnits {
  const safeVw = Math.max(320, vw);
  const safeVh = Math.max(240, vh);

  const port = safeVw <= safeVh;
  const land = !port && safeVh < 500;
  const hp = port || land || safeVw < 768;
  const sticky = !port && !land && safeVh >= 500;

  let uc = Math.min(safeVw / 1440, safeVh / 900);
  if (safeVh < 520 && !port) {
    uc = Math.min(safeVw / 1440, Math.max(safeVh / 900, 0.6));
  }

  let heroHeight = safeVh;
  if (land) {
    heroHeight = Math.max(safeVh, 900 * uc, heroCopyBottomPx + 28);
  }

  const uv = Math.max(safeVw / 1440, heroHeight / 900);
  const us = safeVw / 1440;
  const up = (1.25 * safeVw) / 800;

  let u = Math.min(safeVw / 1440, safeVh / 960);
  if (land) {
    u = safeVh / 430;
  } else if (hp) {
    u = Math.min(safeVw / 430, 1.4);
  }

  const wrapHeight = sticky
    ? 1.65 * safeVh
    : Math.max(1.65 * safeVh, heroHeight + 0.12 * safeVh);

  const A = 2.4;
  const B = ((stripWidth + 0.45 * safeVw) / safeVw) * 1.1;

  return {
    vw: safeVw,
    vh: safeVh,
    uc,
    uv,
    us,
    u,
    up,
    heroHeight,
    wrapHeight,
    A,
    B,
    modes: { port, land, hp, sticky },
  };
}

export function computeHorizonGlow(
  wrapHeight: number,
  scrollY: number,
  vh: number
): HorizonGlowState {
  const safeVh = Math.max(1, vh);
  const e = (wrapHeight - scrollY) / safeVh - 0.47;

  const drawnEdge =
    e > 0.12 ? e : -0.03 + 0.15 * Math.exp((e - 0.12) / 0.15);

  const fadeProgress = clamp((-0.12 - e) / 0.4);
  const opacity = 1 - easeInOutQuad(fadeProgress);
  const visible = opacity >= 0.002 && e <= 1.04;
  const heroHidden = e < -0.06;

  const k = clamp((0.95 - e) / 0.42);
  const navOpacity = 1 - clamp((0.85 - e) / 0.4);
  const copyOpacity = 1 - k;
  const copyTranslateVh = -5 * k;
  const globeOpacity = 0.45 + 0.55 * clamp(e / 0.7);

  const glitchJ =
    k > 0 && k < 1
      ? (((Math.floor(k * 16) * 9301 + 49297) % 233280) / 233280) - 0.5
      : 0;

  return {
    e,
    drawnEdge,
    opacity,
    visible,
    heroHidden,
    k,
    navOpacity,
    copyTranslateVh,
    copyOpacity,
    globeOpacity,
    glitchJ,
  };
}

export function computeServicesProgress(
  scrollY: number,
  trackTop: number,
  vh: number,
  A: number,
  B: number,
  stripWidth: number,
  lettersWidth: number,
  vw: number
): ServicesProgress {
  const safeVh = Math.max(1, vh);
  const q = clamp((scrollY - trackTop) / (A * safeVh));
  const r = clamp((scrollY - trackTop - A * safeVh) / Math.max(1, B * safeVh));
  const settled = q >= 0.94;
  const stripX = vw - r * (stripWidth + 0.45 * vw);
  const lettersX = vw - r * (lettersWidth + vw);

  return {
    q,
    r,
    settled,
    stripX,
    lettersX,
  };
}

export function computeCardSweepPercent(cardLeft: number, vw: number): number {
  const safeVw = Math.max(1, vw);
  return clamp((0.98 - cardLeft / safeVw) / 0.3, -0.4, 1.6) * 100;
}

export function formatStatValue(
  target: number,
  decimals: number,
  suffix: string,
  progress: number
): string {
  const eased = easeOutCubic(progress);
  const current = target * eased;
  if (decimals > 0) {
    return `${current.toFixed(decimals)}${suffix}`;
  }
  const rounded = Math.round(current);
  const formatted = rounded
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
  return `${formatted}${suffix}`;
}

export function computeSpeedKmh(
  deltaY: number,
  deltaTimeSec: number,
  prevSpeed: number
): { speed: number; label: string } {
  const safeDt = Math.max(0.008, deltaTimeSec);
  const instant = Math.abs(deltaY) / safeDt / 32;
  const speed = Math.min(99, prevSpeed + (instant - prevSpeed) * 0.1);
  const rounded = Math.min(99, Math.max(0, Math.round(speed)));
  return {
    speed,
    label: `${rounded.toString().padStart(2, '0')} КМ/Ч`,
  };
}
