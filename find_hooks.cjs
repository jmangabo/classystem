const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

let inFunction = 0;
let topLevelHooks = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/^function\s/) || line.match(/^[a-zA-Z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{/)) {
    inFunction++;
  }
  if (line.match(/^}/)) {
    inFunction = Math.max(0, inFunction - 1);
  }
  if (inFunction === 0 && line.match(/\buse[A-Z]\w*\(/)) {
    topLevelHooks.push({ lineNum: i + 1, line });
  }
}
console.log(topLevelHooks);
