// Generates minimal valid PNG icons for the PWA manifest
// Run once: node generate-icons.js
const fs = require("fs");
const zlib = require("zlib");

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    let b = buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc ^ b) & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
      b >>= 1;
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB

  // Draw a purple rounded square with "H" letter
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const raw = Buffer.alloc(size * (size * 3 + 1));

  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter None
    for (let x = 0; x < size; x++) {
      const px = row + 1 + x * 3;
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: dark purple/navy
      let red = 15, grn = 10, blu = 30;

      // Rounded square fill (circle approximation for simplicity)
      if (dist < r) {
        // Gradient: violet to fuchsia
        const t = dist / r;
        red = Math.round(124 * (1 - t * 0.3));
        grn = Math.round(58 * (1 - t * 0.1));
        blu = Math.round(237 * (1 - t * 0.2));
      }

      // Draw "H" letter in white in the center
      const lx = Math.abs(x - cx), ly = Math.abs(y - cy);
      const letterW = size * 0.18, letterH = size * 0.28, barH = size * 0.04;
      const isLeftBar  = lx >= letterW * 0.55 && lx <= letterW * 0.85 && ly <= letterH;
      const isRightBar = lx >= letterW * 0.55 && lx <= letterW * 0.85 && ly <= letterH;
      const isCrossbar = ly <= barH && lx <= letterW * 0.85;
      // Simple H: two vertical bars + crossbar
      const vbar = x >= cx - size * 0.14 && x <= cx - size * 0.06 && ly <= letterH;
      const vbar2 = x >= cx + size * 0.06 && x <= cx + size * 0.14 && ly <= letterH;
      const cross = ly <= size * 0.025 && x >= cx - size * 0.14 && x <= cx + size * 0.14;

      if (dist < r && (vbar || vbar2 || cross)) {
        red = 255; grn = 255; blu = 255;
      }

      raw[px] = Math.min(255, Math.max(0, red));
      raw[px + 1] = Math.min(255, Math.max(0, grn));
      raw[px + 2] = Math.min(255, Math.max(0, blu));
    }
  }

  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", Buffer.alloc(0))]);
}

fs.mkdirSync("./public/icons", { recursive: true });
fs.writeFileSync("./public/icons/icon-192.png", makePNG(192));
fs.writeFileSync("./public/icons/icon-512.png", makePNG(512));
console.log("PWA icons created: public/icons/icon-192.png + icon-512.png");
