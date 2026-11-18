export interface CropBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CroppedAcCutouts {
  indoor: HTMLCanvasElement;
  outdoor: HTMLCanvasElement;
}

/**
 * Computes tight non-white bounding box within a horizontal slice [xMin, xMax)
 * from raw RGBA image pixel data.
 */
export function computeNonWhiteBounds(
  data: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  xMin: number,
  xMax: number,
  whiteThreshold = 242
): CropBounds {
  const startX = Math.max(0, Math.floor(xMin));
  const endX = Math.min(imgWidth, Math.ceil(xMax));

  let minX = endX;
  let maxX = startX - 1;
  let minY = imgHeight;
  let maxY = -1;

  for (let y = 0; y < imgHeight; y++) {
    const rowOffset = y * imgWidth * 4;
    for (let x = startX; x < endX; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a > 20 && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: startX, y: 0, width: Math.max(1, endX - startX), height: imgHeight };
  }

  const pad = 3;
  const x = Math.max(startX, minX - pad);
  const y = Math.max(0, minY - pad);
  const right = Math.min(endX, maxX + pad + 1);
  const bottom = Math.min(imgHeight, maxY + pad + 1);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

/**
 * Edge flood-fill removal of pure white background pixels so bright indoor unit text ("22°C", "HELUX")
 * remains completely intact while exterior white studio background becomes transparent.
 */
export function keyOutExteriorWhite(
  imgData: ImageData,
  whiteThreshold = 238
): ImageData {
  const { width, height, data } = imgData;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBg = (pIdx: number): boolean => {
    const i = pIdx * 4;
    return (
      data[i] >= whiteThreshold &&
      data[i + 1] >= whiteThreshold &&
      data[i + 2] >= whiteThreshold
    );
  };

  const pushIfBg = (x: number, y: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const p = y * width + x;
    if (visited[p] || !isBg(p)) return;
    visited[p] = 1;
    queue[tail++] = p;
  };

  for (let x = 0; x < width; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    data[p * 4 + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  // Soft 1px edge anti-aliasing on pixels adjacent to transparent exterior
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      if (visited[p]) continue;
      const i = p * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum > 215) {
        const adjTransparent =
          visited[p - 1] || visited[p + 1] || visited[p - width] || visited[p + width];
        if (adjTransparent) {
          const t = Math.max(0, Math.min(1, (250 - lum) / 35));
          data[i + 3] = Math.round(data[i + 3] * t);
        }
      }
    }
  }

  return imgData;
}

export function extractHeluxCutouts(img: HTMLImageElement): CroppedAcCutouts {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const sctx = srcCanvas.getContext('2d');
  if (!sctx) {
    return { indoor: srcCanvas, outdoor: srcCanvas };
  }
  sctx.drawImage(img, 0, 0);
  const fullData = sctx.getImageData(0, 0, w, h);

  // Split horizontally at ~60.5% width between indoor unit (left) and outdoor block (right)
  const splitX = Math.round(w * 0.605);
  const indoorBounds = computeNonWhiteBounds(fullData.data, w, h, 0, splitX);
  const outdoorBounds = computeNonWhiteBounds(fullData.data, w, h, splitX, w);

  const makeCutout = (bounds: CropBounds): HTMLCanvasElement => {
    const out = document.createElement('canvas');
    out.width = bounds.width;
    out.height = bounds.height;
    const octx = out.getContext('2d');
    if (!octx) return out;
    octx.drawImage(
      srcCanvas,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
      0,
      0,
      bounds.width,
      bounds.height
    );
    const id = octx.getImageData(0, 0, bounds.width, bounds.height);
    keyOutExteriorWhite(id);
    octx.putImageData(id, 0, 0);
    return out;
  };

  return {
    indoor: makeCutout(indoorBounds),
    outdoor: makeCutout(outdoorBounds),
  };
}
