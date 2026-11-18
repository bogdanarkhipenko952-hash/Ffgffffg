import { CroppedAcCutouts } from '../lib/imageCrop';
import { clamp, easeInOutQuad, easeOutCubic } from '../lib/scrollMath';

export interface DeliveryStageDrawParams {
  canvas: HTMLCanvasElement;
  q: number; // 0..1 scrubbed progress
  isPhone: boolean;
  cutouts: CroppedAcCutouts | null;
}

export function computeBandEdgeRatio(q: number, isPhone: boolean): number {
  const pull = easeInOutQuad(clamp((q - 0.76) / 0.17));
  const startRatio = isPhone ? 0.78 : 0.829;
  const endRatio = isPhone ? 0.36 : 0.448;
  return startRatio + (endRatio - startRatio) * pull;
}

export function drawDeliveryStage(params: DeliveryStageDrawParams): void {
  const { canvas, q, isPhone, cutouts } = params;
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

  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const edgeRatio = computeBandEdgeRatio(q, isPhone);
  const groundY = edgeRatio * h;

  // Camera pullback: 1.0 during close-up unpacking -> 0.65 at the end
  const pull = easeInOutQuad(clamp((q - 0.76) / 0.17));
  const camScale = 1 - 0.35 * pull;

  const baseScale =
    (isPhone ? w / 760 : Math.min(w / 1440, h / 900)) *
    (1.18 + 0.16 * pull) *
    camScale;

  // Van glides gently leftward at the very end (pull) so the cropped HELUX AC + outdoor block
  // stand center-stage and prominent when the scene finishes!
  const vanArrive = easeOutCubic(clamp(q / 0.22));
  const anchorX = isPhone
    ? w * (0.50 - 0.08 * pull)
    : w * (0.54 - 0.14 * pull);
  const anchorY = groundY;

  ctx.save();
  ctx.translate(anchorX, anchorY);
  ctx.scale(baseScale, baseScale);

  // Subtle floor shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(-180 * (1 - vanArrive) - 55, 2, 260, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // ==================== 1. KV КЛИМАТ DELIVERY VAN (LEFT) ====================
  const vanX = -300 - (1 - vanArrive) * 460 - pull * 40;
  const brakeBounce =
    q > 0.18 && q < 0.27
      ? Math.sin(((q - 0.18) / 0.09) * Math.PI) * 3.5
      : 0;
  const wheelAngle = (vanArrive * 460 - pull * 40) / 30;

  ctx.save();
  ctx.translate(vanX, brakeBounce);

  // Rear hydraulic ramp
  const rampDown = easeInOutQuad(clamp((q - 0.16) / 0.11));
  const rampRetract = easeInOutQuad(clamp((q - 0.72) / 0.12));
  const rampProg = rampDown * (1 - 0.85 * rampRetract);
  if (rampProg > 0.01) {
    ctx.save();
    ctx.translate(185, -36);
    ctx.rotate(rampProg * 0.27);
    ctx.fillStyle = '#2a303c';
    ctx.fillRect(0, -4, 96, 8);
    ctx.fillStyle = '#2f63ff';
    ctx.fillRect(88, -4, 8, 8);
    ctx.restore();
  }

  // Van cargo body
  ctx.fillStyle = '#1b1f28';
  ctx.beginPath();
  ctx.roundRect(-210, -210, 396, 174, [12, 6, 4, 4]);
  ctx.fill();

  // Van cabin
  ctx.fillStyle = '#181b22';
  ctx.beginPath();
  ctx.moveTo(-210, -198);
  ctx.lineTo(-278, -192);
  ctx.quadraticCurveTo(-304, -188, -312, -135);
  ctx.lineTo(-322, -72);
  ctx.quadraticCurveTo(-322, -38, -296, -36);
  ctx.lineTo(-210, -36);
  ctx.closePath();
  ctx.fill();

  // Windshield
  ctx.fillStyle = '#2f384a';
  ctx.beginPath();
  ctx.moveTo(-222, -184);
  ctx.lineTo(-272, -180);
  ctx.quadraticCurveTo(-292, -176, -298, -134);
  ctx.lineTo(-222, -134);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(47, 99, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(-266, -177);
  ctx.lineTo(-244, -177);
  ctx.lineTo(-258, -137);
  ctx.lineTo(-280, -137);
  ctx.closePath();
  ctx.fill();

  // Cobalt architectural accent stripe
  ctx.fillStyle = '#2f63ff';
  ctx.fillRect(-208, -106, 394, 10);

  // Subtle KV mark
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 32px Oswald, Anton, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('KV', -180, -136);
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillText('МОСКВА · КЛИМАТ', -132, -138);

  if (rampProg > 0.05) {
    ctx.fillStyle = '#111318';
    ctx.fillRect(172, -198, 14, 158);
    ctx.fillStyle = '#2d3340';
    ctx.fillRect(176, -194, 8, 150);
  }

  ctx.fillStyle = '#eef2ff';
  ctx.fillRect(-318, -74, 12, 12);

  const drawWheel = (wx: number, wy: number) => {
    ctx.save();
    ctx.translate(wx, wy);
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#12141a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#313746';
    ctx.stroke();

    ctx.rotate(wheelAngle);
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fillStyle = '#272c38';
    ctx.fill();

    ctx.strokeStyle = '#7e889b';
    ctx.lineWidth = 2;
    for (let s = 0; s < 5; s++) {
      const a = (s * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#2f63ff';
    ctx.fill();
    ctx.restore();
  };

  drawWheel(-240, -30);
  drawWheel(106, -30);
  ctx.restore(); // end van

  // ==================== 2. UNPACKING & REAL CROPPED HELUX UNITS ====================
  const unloadSlide = easeOutCubic(clamp((q - 0.18) / 0.12));
  const boxCenterX = 76 + unloadSlide * 116;
  const boxSlideFromVanY = -44 * (1 - unloadSlide);

  // Protective cobalt drop-mat
  if (q > 0.14) {
    const matAlpha = clamp((q - 0.14) / 0.08) * (1 - 0.3 * pull);
    ctx.save();
    ctx.globalAlpha = matAlpha;
    ctx.fillStyle = '#2f63ff';
    ctx.fillRect(boxCenterX - 188, -5, 420, 5);
    ctx.restore();
  }

  const strapSnap = easeInOutQuad(clamp((q - 0.28) / 0.08));
  const flapsOpen = easeInOutQuad(clamp((q - 0.35) / 0.11));
  const foamOut = easeInOutQuad(clamp((q - 0.45) / 0.11));
  const unitLift = easeInOutQuad(clamp((q - 0.56) / 0.14));
  const cartonTidy = easeInOutQuad(clamp((q - 0.66) / 0.10));

  ctx.save();
  ctx.translate(boxCenterX, boxSlideFromVanY);

  // --- A. Carton Back Wall & Top Flaps ---
  if (unloadSlide > 0.02 && cartonTidy < 0.99) {
    ctx.save();
    ctx.globalAlpha = unloadSlide * (1 - cartonTidy);

    ctx.fillStyle = '#cdb99d';
    ctx.fillRect(-156, -152, 312, 146);
    ctx.strokeStyle = '#9f8b70';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-156, -152, 312, 146);

    const flapAngle = flapsOpen * (Math.PI * 0.72);
    ctx.save();
    ctx.translate(-156, -152);
    ctx.rotate(-flapAngle);
    ctx.fillStyle = '#d8c7ae';
    ctx.fillRect(0, -12, 156, 12);
    ctx.strokeRect(0, -12, 156, 12);
    ctx.restore();

    ctx.save();
    ctx.translate(156, -152);
    ctx.rotate(flapAngle);
    ctx.fillStyle = '#d8c7ae';
    ctx.fillRect(-156, -12, 156, 12);
    ctx.strokeRect(-156, -12, 156, 12);
    ctx.restore();
    ctx.restore();
  }

  // --- B. Cropped HELUX Indoor Unit + HELUX Outdoor Condenser Block ---
  const revealAlpha = clamp((q - 0.30) / 0.08);
  if (revealAlpha > 0.01) {
    ctx.save();
    ctx.globalAlpha = revealAlpha;

    // Clean mounting stand supporting the indoor unit cleanly above the outdoor block/ground
    const inTargetW = 248 + pull * 54;
    const inRatio = cutouts
      ? cutouts.indoor.height / Math.max(1, cutouts.indoor.width)
      : 0.33;
    const inTargetH = inTargetW * inRatio;
    const inX = -152 - foamOut * 12 + pull * 8;
    const inY = -inTargetH - 18 - unitLift * 94;

    if (unitLift > 0.02) {
      const standCenterX = inX + inTargetW * 0.5;
      ctx.fillStyle = '#252a36';
      ctx.fillRect(standCenterX - 58, inY + inTargetH * 0.65, 8, -(inY + inTargetH * 0.65) - 5);
      ctx.fillRect(standCenterX + 50, inY + inTargetH * 0.65, 8, -(inY + inTargetH * 0.65) - 5);
      ctx.fillStyle = '#1b1f28';
      ctx.fillRect(standCenterX - 76, -12, 152, 7);
    }

    // 1. Cropped HELUX Outdoor Condenser Block (right side, resting squarely on ground band)
    const outTargetW = 148 + pull * 40;
    const outRatio = cutouts
      ? cutouts.outdoor.height / Math.max(1, cutouts.outdoor.width)
      : 0.78;
    const outTargetH = outTargetW * outRatio;
    const outX = 36 + foamOut * 100 + pull * 56;
    const outY = -outTargetH - 4;

    if (cutouts && cutouts.outdoor.width > 0) {
      ctx.drawImage(cutouts.outdoor, outX, outY, outTargetW, outTargetH);
    } else {
      ctx.fillStyle = '#243a30';
      ctx.beginPath();
      ctx.roundRect(outX, outY, outTargetW, outTargetH, 4);
      ctx.fill();
    }

    // 2. Cropped HELUX Indoor Unit (with "22°C" display, left-center elevated on stand)
    if (cutouts && cutouts.indoor.width > 0) {
      ctx.drawImage(cutouts.indoor, inX, inY, inTargetW, inTargetH);
    } else {
      ctx.fillStyle = '#243a30';
      ctx.beginPath();
      ctx.roundRect(inX, inY, inTargetW, inTargetH, 8);
      ctx.fill();
    }

    // Subtle cool-air flow arcs below indoor unit once lifted
    if (unitLift > 0.45) {
      const airAlpha = clamp((unitLift - 0.45) / 0.4) * 0.55;
      ctx.strokeStyle = `rgba(47, 99, 255, ${airAlpha.toFixed(2)})`;
      ctx.lineWidth = 1.6;
      for (let a = 0; a < 3; a++) {
        const ax = inX + inTargetW * (0.28 + a * 0.22);
        const ay = inY + inTargetH + 4;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.quadraticCurveTo(ax - 5, ay + 18, ax - 16, ay + 30);
        ctx.stroke();
      }
    }

    // Molded EPS foam protective shells separating outward during Phase 2
    if (foamOut < 0.98) {
      ctx.save();
      ctx.globalAlpha = revealAlpha * (1 - clamp((foamOut - 0.7) / 0.28));
      const fShift = foamOut * 78;
      ctx.fillStyle = '#eef2ff';
      ctx.strokeStyle = '#b9c4dc';
      ctx.lineWidth = 1.2;
      ctx.fillRect(-140 - fShift, -120, 28, 92);
      ctx.strokeRect(-140 - fShift, -120, 28, 92);
      ctx.fillRect(148 + fShift, -120, 28, 92);
      ctx.strokeRect(148 + fShift, -120, 28, 92);
      ctx.restore();
    }

    ctx.restore();
  }

  // --- C. Front Corrugated Sleeve & Cobalt Straps ---
  if (unloadSlide > 0.02 && cartonTidy < 0.98) {
    ctx.save();
    ctx.globalAlpha = unloadSlide * (1 - cartonTidy);

    const frontHeight = Math.max(8, 146 * (1 - flapsOpen * 0.92));
    ctx.fillStyle = '#dfcfb7';
    ctx.strokeStyle = '#9f8b70';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-156, -6 - frontHeight, 312, frontHeight);
    ctx.strokeRect(-156, -6 - frontHeight, 312, frontHeight);

    if (frontHeight > 54) {
      ctx.fillStyle = '#6f5f4b';
      ctx.font = '700 18px Oswald, Anton, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('HELUX INVERTER', -132, -6 - frontHeight + 42);
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillText('МОСКВА · ДОСТАВКА И РАСПАКОВКА', -132, -6 - frontHeight + 60);

      ctx.fillStyle = '#2f63ff';
      ctx.fillRect(92, -6 - frontHeight + 24, 42, 16);
    }

    if (strapSnap < 0.95) {
      ctx.globalAlpha = unloadSlide * (1 - strapSnap);
      ctx.fillStyle = '#2f63ff';
      const splitGap = strapSnap * 30;
      ctx.fillRect(-84 - splitGap, -152, 6, 146);
      ctx.fillRect(78 + splitGap, -152, 6, 146);
    }

    ctx.restore();
  }

  ctx.restore(); // end unpacking zone
  ctx.restore(); // end camera scale
  ctx.restore(); // end dpr
}
