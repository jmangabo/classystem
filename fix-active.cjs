const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/c\.subject\?\.activeTerms/g, 'c.subject?.offeredTerms');

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed activeTerms to offeredTerms');
