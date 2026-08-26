const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');
code = code.replace(
  `let dbInstance;\ntry {`,
  `let dbInstance;\ntry {`
).replace(
  `dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);\n    }\n  }\n}`,
  `dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);\n    } catch (e) { console.error("Firebase init completely failed:", e); }\n  }\n}`
);
fs.writeFileSync('src/firebase.ts', code);
