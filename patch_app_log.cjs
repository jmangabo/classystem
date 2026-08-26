const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(
  /const userDoc = await getDoc\(doc\(db, "users", user\.uid\)\);/g,
  'console.log("DB at doc call:", db); const userDoc = await getDoc(doc(db, "users", user.uid));'
);
fs.writeFileSync('src/App.tsx', code);
