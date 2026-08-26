const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('compressed.zlib');
let offset = buf.indexOf(Buffer.from('789c', 'hex'));
console.log("Offset:", offset);
if (offset !== -1) {
  let zlibBuf = buf.slice(offset);
  try {
    let dec = zlib.inflateSync(zlibBuf);
    console.log("Decompressed len:", dec.length);
  } catch(e) {
    console.log("Error decompressing:", e.message);
  }
}
