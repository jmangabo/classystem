const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('compressed.zlib');

try {
  const decompressed = zlib.inflateSync(buf);
  console.log("Decompressed length:", decompressed.length);
} catch (e) {
  console.log("Error:", e.message);
}
