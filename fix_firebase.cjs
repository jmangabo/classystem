const fs = require("fs");
let content = fs.readFileSync("src/firebase.ts", "utf8");

content = content.replace(
  /initializeFirestore\(app, \{\}, firebaseConfig\.firestoreDatabaseId\)/g,
  `initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId)`
);

content = content.replace(
  /localCache: memoryLocalCache\(\)/g,
  `localCache: memoryLocalCache(), experimentalForceLongPolling: true`
);

fs.writeFileSync("src/firebase.ts", content);
console.log("Updated firebase.ts to use experimentalForceLongPolling");
