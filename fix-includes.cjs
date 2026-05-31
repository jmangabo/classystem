const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/!c\.subject\.activeTerms\.includes/g, '!c.subject.offeredTerms.includes');

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed activeTerms to offeredTerms in includes');
