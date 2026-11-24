// Draw the extension icon from basic shapes and write PNG files to extension/icons/.
// The script uses only Node built-ins. Run: node scripts/make-icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const SIZES = [16, 32, 48, 128];
const SUPERSAMPLE = 8; // Samples per pixel axis, for anti-aliased edges.
const outDir = path.resolve(import.meta.dirname, '../extension/icons');

// The design uses a 128 x 128 coordinate space. Each shape returns true if a point is inside it.
const roundedRect = (x0, y0, x1, y1, r) => (x, y) => {
  const dx = Math.max(x0 + r - x, 0, x - (x1 - r));
  const dy = Math.max(y0 + r - y, 0, y - (y1 - r));
  return x >= x0 && x <= x1 && y >= y0 && y <= y1 && dx * dx + dy * dy <= r * r;
};
const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

// A ranked list: three rows, each with a gold, silver or bronze bullet and a bar.
const ROWS = [
  { y: 38, bullet: [242, 193, 78], barEnd: 106 },
  { y: 64, bullet: [192, 200, 208], barEnd: 96 },
  { y: 90, bullet: [205, 138, 79], barEnd: 86 },
];
const LAYERS = [
  { shape: roundedRect(4, 4, 124, 124, 28), color: [36, 44, 54] },
  ...ROWS.flatMap(({ y, bullet, barEnd }) => [
    { shape: circle(36, y, 10), color: bullet },
    { shape: roundedRect(54, y - 7, barEnd, y + 7, 7), color: [228, 233, 238] },
  ]),
];

function render(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = 128 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // Composite the layers in premultiplied alpha. Each layer uses its coverage as alpha.
      let [r, g, b, a] = [0, 0, 0, 0];
      for (const { shape, color } of LAYERS) {
        let hits = 0;
        for (let sy = 0; sy < SUPERSAMPLE; sy++) {
          for (let sx = 0; sx < SUPERSAMPLE; sx++) {
            const x = (px + (sx + 0.5) / SUPERSAMPLE) * scale;
            const y = (py + (sy + 0.5) / SUPERSAMPLE) * scale;
            if (shape(x, y)) hits++;
          }
        }
        const coverage = hits / SUPERSAMPLE ** 2;
        r = color[0] * coverage + r * (1 - coverage);
        g = color[1] * coverage + g * (1 - coverage);
        b = color[2] * coverage + b * (1 - coverage);
        a = coverage + a * (1 - coverage);
      }
      const i = (py * size + px) * 4;
      pixels[i] = a ? Math.round(r / a) : 0;
      pixels[i + 1] = a ? Math.round(g / a) : 0;
      pixels[i + 2] = a ? Math.round(b / a) : 0;
      pixels[i + 3] = Math.round(a * 255);
    }
  }
  return pixels;
}

function encodePng(size, pixels) {
  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit depth, RGBA, default compression, filter and interlace.
  // Each scanline starts with filter type 0 (none).
  const rows = [];
  for (let y = 0; y < size; y++) {
    rows.push(Buffer.from([0]), pixels.subarray(y * size * 4, (y + 1) * size * 4));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(outDir, { recursive: true });
for (const size of SIZES) {
  const file = path.join(outDir, `icon${size}.png`);
  fs.writeFileSync(file, encodePng(size, render(size)));
  console.log(`Wrote ${path.relative(process.cwd(), file)}`);
}
