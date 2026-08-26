const fs = require('fs');
const buf = fs.readFileSync('src/App.tsx');
let offsets = [];
let idx = 0;
while ((idx = buf.indexOf(Buffer.from('789c', 'hex'), idx)) !== -1) {
  offsets.push(idx);
  idx++;
}
console.log("Offsets in App.tsx:", offsets);
