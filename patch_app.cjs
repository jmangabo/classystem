const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/color: "000000", bg: "166534", color: "FFFFFF"/g, 'color: "FFFFFF", bg: "166534"');
fs.writeFileSync('src/App.tsx', code);
