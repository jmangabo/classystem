const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync('compressed.zlib'); // wait, compressed.zlib doesn't have the first header

const full = fs.readFileSync('src/App.tsx'); // wait, src/App.tsx was overwritten!
