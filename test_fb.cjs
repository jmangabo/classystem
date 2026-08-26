const { readFileSync } = require('fs');
const content = readFileSync('src/firebase.ts', 'utf8');
console.log(content.includes('dbInstance'));
