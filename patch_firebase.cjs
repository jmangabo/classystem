const fs = require('fs');
let code = fs.readFileSync('src/firebase.ts', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('let dbInstance;'));
const end = lines.findIndex(l => l.includes('export const db = dbInstance;'));
const replacement = `let dbInstance;
try {
  dbInstance = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);
} catch (error: any) {
  if (error.message?.includes('already been initialized') || error.code === 'failed-precondition') {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } else {
    try {
      dbInstance = initializeFirestore(app, {
        localCache: memoryLocalCache(), experimentalForceLongPolling: true
      }, firebaseConfig.firestoreDatabaseId);
    } catch (fallbackError: any) {
      dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
}
export const db = dbInstance;`;

code = lines.slice(0, start).join('\n') + '\n' + replacement + '\n' + lines.slice(end + 1).join('\n');
fs.writeFileSync('src/firebase.ts', code);
