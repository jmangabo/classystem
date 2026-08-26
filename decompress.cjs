const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('src/App.tsx');
const offset = buf.indexOf(Buffer.from('789c', 'hex'));
console.log("Offset:", offset);
if (offset !== -1) {
  const compressed = buf.slice(offset);
  try {
    const decompressed = zlib.inflateSync(compressed);
    fs.writeFileSync('decompressed.tsx', decompressed);
    console.log("Decompressed successfully!");
  } catch (e) {
    console.log("Error:", e.message);
  }
}
