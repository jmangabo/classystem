import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  doc, 
  getDocFromServer,
  getDoc as firestoreGetDoc, 
  getDocs as firestoreGetDocs, 
  getDocFromCache, 
  getDocsFromCache,
  DocumentReference, 
  Query, 
  DocumentSnapshot, 
  QuerySnapshot
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Enable stable connectivity settings with modern multi-tab local cache persistence
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);


// Custom safe data fetching wrappers to avoid unhandled "client is offline" crashes
export async function safeGetDoc<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  try {
    return await firestoreGetDoc(ref);
  } catch (error: any) {
    if (error.message?.includes('client is offline') || error.code === 'unavailable') {
      try {
        console.log("Firestore is offline, attempt to load from local cache for document path:", ref.path);
        return await getDocFromCache(ref);
      } catch (cacheError) {
        console.warn("Local cache missed/unavailable for document:", ref.path, ". Returning empty document snapshot.");
        return {
          exists: () => false,
          data: () => undefined,
          id: ref.id,
          ref: ref,
          metadata: { fromCache: true, hasPendingWrites: false },
        } as unknown as DocumentSnapshot<T>;
      }
    }
    throw error;
  }
}

export async function safeGetDocs<T>(q: Query<T>): Promise<QuerySnapshot<T>> {
  try {
    return await firestoreGetDocs(q);
  } catch (error: any) {
    if (error.message?.includes('client is offline') || error.code === 'unavailable') {
      try {
        console.log("Firestore is offline, attempt to load from local cache for query.");
        return await getDocsFromCache(q);
      } catch (cacheError) {
        console.warn("Local cache missed/unavailable for query. Returning empty query snapshot.");
        return {
          docs: [],
          empty: true,
          size: 0,
          forEach: () => {},
          metadata: { fromCache: true, hasPendingWrites: false },
        } as unknown as QuerySnapshot<T>;
      }
    }
    throw error;
  }
}

// Add to window for debugging in console if needed
if (typeof window !== 'undefined') {
  (window as any).db = db;
}

export const auth = getAuth(app);

// Critical connection test - wrapped in a function that doesn't block top-level
async function testConnection() {
  try {
    // We only try once on startup
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connected successfully.");
  } catch (error: any) {
    if (error.message?.includes('client is offline') || error.code === 'unavailable') {
      console.warn("Firestore is operating in offline mode. This is expected if the network is strictly restricted.");
    } else {
      console.error("Firestore connection error:", error);
    }
  }
}

testConnection();

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operation: FirestoreErrorInfo['operationType'], path: string | null = null): never {
  const user = auth.currentUser;
  const errorInfo: FirestoreErrorInfo = {
    error: error.message || String(error),
    operationType: operation,
    path: path,
    authInfo: {
      userId: user?.uid || 'unauthenticated',
      email: user?.email || 'none',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || false,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || '',
      })) || [],
    }
  };
  throw new Error(JSON.stringify(errorInfo));
}
