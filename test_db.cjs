const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');
code = code.replace(/export const db = dbInstance;/g, 'export const db = dbInstance;\nconsole.log("Firebase DB initialized as:", db);');
fs.writeFileSync('src/firebase.ts', code);
