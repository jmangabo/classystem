const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('compressed.zlib');
const offsets = [15605, 74529, 89345, 90579, 91943, 166876, 178016];
for (let off of offsets) {
  try {
    let dec = zlib.inflateSync(buf.slice(off));
    console.log("Success at offset", off, "length:", dec.length);
    fs.writeFileSync(`chunk_${off}.tsx`, dec);
  } catch(e) {
    // ignore
  }
}
