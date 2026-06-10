import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { pathToFileURL } from "node:url";

const WIDTH = 1200;
const HEIGHT = 630;

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["00111", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function blendChannel(base, top, alpha) {
  return Math.round(base * (1 - alpha) + top * alpha);
}

function createCanvas() {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 3);

  function setPixel(x, y, color, alpha = 1) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= WIDTH || iy >= HEIGHT) return;
    const i = (iy * WIDTH + ix) * 3;
    data[i] = blendChannel(data[i], color[0], alpha);
    data[i + 1] = blendChannel(data[i + 1], color[1], alpha);
    data[i + 2] = blendChannel(data[i + 2], color[2], alpha);
  }

  function rect(x, y, w, h, color, alpha = 1) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(WIDTH, Math.round(x + w));
    const y1 = Math.min(HEIGHT, Math.round(y + h));
    for (let yy = y0; yy < y1; yy += 1) {
      for (let xx = x0; xx < x1; xx += 1) setPixel(xx, yy, color, alpha);
    }
  }

  function circle(cx, cy, r, color, alpha = 1) {
    const rr = r * r;
    for (let y = Math.max(0, Math.round(cy - r)); y < Math.min(HEIGHT, Math.round(cy + r)); y += 1) {
      for (let x = Math.max(0, Math.round(cx - r)); x < Math.min(WIDTH, Math.round(cx + r)); x += 1) {
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d <= rr) setPixel(x, y, color, alpha * (1 - Math.sqrt(d / rr) * 0.65));
      }
    }
  }

  function drawText(text, x, y, scale, color, alpha = 1) {
    let cursor = x;
    for (const rawChar of text.toUpperCase()) {
      if (rawChar === " ") {
        cursor += scale * 4;
        continue;
      }
      const glyph = FONT[rawChar];
      if (!glyph) {
        cursor += scale * 4;
        continue;
      }
      for (let gy = 0; gy < glyph.length; gy += 1) {
        for (let gx = 0; gx < glyph[gy].length; gx += 1) {
          if (glyph[gy][gx] !== "1") continue;
          rect(cursor + gx * scale, y + gy * scale, scale, scale, color, alpha);
        }
      }
      cursor += scale * 6;
    }
  }

  return { data, setPixel, rect, circle, drawText };
}

function encodePng(rgb) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // truecolor RGB
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  const stride = WIDTH * 3;
  const scanlines = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    const row = y * (stride + 1);
    scanlines[row] = 0;
    Buffer.from(rgb.buffer, y * stride, stride).copy(scanlines, row + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function createOgImage(outputPath = resolve("public", "og-image.png")) {
  const canvas = createCanvas();
  const { data, rect, circle, drawText } = canvas;

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const t = x / WIDTH;
      const u = y / HEIGHT;
      const i = (y * WIDTH + x) * 3;
      data[i] = 7 + Math.round(11 * t);
      data[i + 1] = 27 + Math.round(58 * t + 12 * u);
      data[i + 2] = 39 + Math.round(41 * u);
    }
  }

  circle(215, 98, 260, [20, 184, 166], 0.42);
  circle(1070, 570, 300, [16, 185, 129], 0.24);
  rect(0, 0, WIDTH, 18, [20, 184, 166], 0.9);

  drawText("FICHAELEAM", 78, 118, 10, [246, 255, 253], 1);
  drawText("SOFTWARE ELEAM CHILE", 84, 250, 5, [163, 230, 221], 1);
  drawText("Decreto N°20 - FICHAS - TURNOS - SEREMI", 84, 332, 4, [217, 245, 240], 0.95);

  rect(84, 444, 360, 7, [20, 184, 166], 1);
  rect(84, 472, 250, 7, [94, 234, 212], 0.8);

  rect(670, 80, 420, 470, [241, 248, 247], 0.96);
  rect(700, 112, 120, 406, [15, 118, 110], 0.95);
  rect(842, 116, 210, 18, [15, 23, 42], 0.18);
  rect(842, 156, 170, 12, [15, 23, 42], 0.12);
  rect(842, 198, 86, 86, [20, 184, 166], 0.9);
  rect(946, 198, 86, 86, [14, 165, 233], 0.75);
  rect(842, 315, 210, 18, [15, 23, 42], 0.15);
  rect(842, 354, 150, 12, [15, 23, 42], 0.12);
  rect(842, 386, 190, 12, [15, 23, 42], 0.12);
  rect(842, 418, 130, 12, [15, 23, 42], 0.12);
  rect(724, 142, 54, 10, [240, 253, 250], 1);
  rect(724, 190, 72, 10, [240, 253, 250], 0.9);
  rect(724, 238, 64, 10, [240, 253, 250], 0.9);
  rect(724, 286, 74, 10, [240, 253, 250], 0.9);
  rect(724, 334, 52, 10, [240, 253, 250], 0.9);
  rect(724, 452, 70, 34, [94, 234, 212], 0.95);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, encodePng(data));
  return outputPath;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const output = process.argv[2] ? resolve(process.argv[2]) : resolve("public", "og-image.png");
  createOgImage(output);
  console.log(`Created ${output}`);
}
