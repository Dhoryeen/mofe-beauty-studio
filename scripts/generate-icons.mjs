// Generates brand PWA icons with zero dependencies (raw pixel buffer + zlib PNG).
// Usage: node scripts/generate-icons.mjs
import { writeFileSync, mkdirSync } from "fs";
import { deflateSync } from "zlib";

const CREAM = [250, 245, 239];
const GOLD = [176, 125, 60];

// Gold "M" monogram polygon on a 108 grid (matches the Android launcher mark).
const M = [
  [30, 78], [30, 34], [40, 34], [54, 60], [68, 34], [78, 34],
  [78, 78], [69, 78], [69, 48], [56, 70], [52, 70], [39, 48], [39, 78]
];

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function crc32(buf) {
  let table = crc32.t;
  if (!table) {
    table = crc32.t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let c = -1;
  for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([td, data])));
  return Buffer.concat([len, td, data, crc]);
}

function png(size, scaleMark) {
  const px = Buffer.alloc(size * size * 3);
  // Pixels per mark-unit so the 108-grid M spans scaleMark of the icon.
  const k = (size * scaleMark) / 108;
  const cx = size / 2, cy = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Map the pixel into mark space (centered, scaled), then fill gold inside the M.
      const gx = (x - cx) / k + 54;
      const gy = (y - cy) / k + 54;
      const c = pointInPoly(gx, gy, M) ? GOLD : CREAM;
      const o = (y * size + x) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
  const raw = Buffer.alloc(size * (1 + size * 3));  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    px.copy(raw, y * (1 + size * 3) + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync(new URL("../public/icons", import.meta.url), { recursive: true });
const out = (n, b) => writeFileSync(new URL(`../public/icons/${n}`, import.meta.url), b);
out("icon-192.png", png(192, 1.4));
out("icon-512.png", png(512, 1.4));
out("maskable-512.png", png(512, 0.9)); // smaller mark: safe zone for mask cropping
out("apple-touch-icon.png", png(180, 1.4));
console.log("icons written to public/icons");
