import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

console.info("[NovaQuant Firebase Service] Detecting configuration keys...");

const cleanEnvVar = (v: any) => {
  if (typeof v === 'string') {
    return v.replace(/^['"]|['"]$/g, '').trim();
  }
  return v;
};

const envApiKey = cleanEnvVar((import.meta as any).env.VITE_FIREBASE_API_KEY);
const envAuthDomain = cleanEnvVar((import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN);
const envProjectId = cleanEnvVar((import.meta as any).env.VITE_FIREBASE_PROJECT_ID);
const envStorageBucket = cleanEnvVar((import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET);
const envMessagingSenderId = cleanEnvVar((import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID);
const envAppId = cleanEnvVar((import.meta as any).env.VITE_FIREBASE_APP_ID);

console.log("[NovaQuant Firebase Service] Environment Variables diagnostics:", {
  VITE_FIREBASE_API_KEY_exists: !!envApiKey,
  VITE_FIREBASE_AUTH_DOMAIN_exists: !!envAuthDomain,
  VITE_FIREBASE_PROJECT_ID_exists: !!envProjectId,
});

// Double security fallback - we load from environment or fallback to provisioned values
const firebaseConfig = {
  apiKey: envApiKey || cleanEnvVar(appletConfig.apiKey),
  authDomain: envAuthDomain || cleanEnvVar(appletConfig.authDomain),
  projectId: envProjectId || cleanEnvVar(appletConfig.projectId),
  storageBucket: envStorageBucket || cleanEnvVar(appletConfig.storageBucket),
  messagingSenderId: envMessagingSenderId || cleanEnvVar(appletConfig.messagingSenderId),
  appId: envAppId || cleanEnvVar(appletConfig.appId)
};

console.info("[NovaQuant Firebase Service] Initializing App with project ID:", firebaseConfig.projectId);

let app;
try {
  app = initializeApp(firebaseConfig);
  console.info("[NovaQuant Firebase Service] Client App configured successfully.");
} catch (error) {
  console.error("[NovaQuant Firebase Service] Client App initialization error:", error);
  throw error;
}

export const auth = getAuth(app);

// Support multi-database instances or standard Firestore database ID
const databaseId = (firebaseConfig.projectId !== cleanEnvVar(appletConfig.projectId))
  ? undefined
  : (appletConfig.firestoreDatabaseId || undefined);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, databaseId);

console.log("[NovaQuant Firebase Service] Services instantiated.");

// ==========================================
// ZERO-TRUST ADVANCED SECURITY & DIAGNOSTICS
// ==========================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Standard security and connection crash investigator as required by the Firebase Integration Skill.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMessage = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || 'unknown';

  const errInfo: FirestoreErrorInfo = {
    error: `${errMessage} (Code: ${errCode})`,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.error('[NovaQuant Firestore Error Log]:', JSON.stringify(errInfo, null, 2));
  
  // Create a clean readable error containing the JSON context
  const richError = new Error(JSON.stringify(errInfo));
  (richError as any).code = errCode;
  throw richError;
}

// Runtime connection status trackers
let lastKnownStatus: 'CONNECTED' | 'DISCONNECTED' | 'UNKNOWN' = 'UNKNOWN';
let transportType: 'LONG_POLLING' | 'STREAMING' | 'PENDING' = 'PENDING';
let connectionError: string | null = null;
let currentRetries = 0;

export function getFirestoreConnectionStatus() {
  return {
    status: lastKnownStatus,
    transport: transportType,
    error: connectionError,
    retries: currentRetries
  };
}

/**
 * Validates Firestore database availability and tests connection to backend
 */
export async function testConnection(): Promise<{ success: boolean; transport: string; error?: string | null }> {
  const pathForConnectionTest = 'users/ping_connection_probe';
  try {
    const testDoc = doc(db, 'users', 'ping_connection_probe');
    await getDocFromServer(testDoc);
    
    lastKnownStatus = 'CONNECTED';
    transportType = 'LONG_POLLING';
    connectionError = null;
    currentRetries = 0;
    
    console.info('[NovaQuant Connection Status]: Firestore connection active. Transport: Long Polling (Secure Handshake Bypass Enabled).');
    return { success: true, transport: 'Long Polling' };
  } catch (error: any) {
    currentRetries++;
    const errMsg = error instanceof Error ? error.name + ': ' + error.message : String(error);
    connectionError = errMsg;
    
    if (error.code === 'permission-denied') {
      // If we got 'permission-denied', the database backend actually responded! This means connection is fully healthy, just unauthorized!
      lastKnownStatus = 'CONNECTED';
      transportType = 'LONG_POLLING';
      console.info('[NovaQuant Connection Status]: Connected, authenticated handshake was verified by backend but permissions denied.');
      return { success: true, transport: 'Long Polling (Authenticated Bypass)' };
    }
    
    lastKnownStatus = 'DISCONNECTED';
    console.warn(`[NovaQuant Connection Status]: Connection unreachable (Attempt #${currentRetries}). Reason: ${errMsg}`);
    
    if (errMsg.toLowerCase().includes('client is offline')) {
      console.error("[NovaQuant Connection Status]: Firestore is offline. Please check your Firebase project config, whitelists, or firewall settings.");
    }
    return { success: false, transport: 'None', error: errMsg };
  }
}

// Automatically fire an initial connection probe in the background
testConnection().catch(err => console.warn('[NovaQuant FireInit Background Failure]', err));

export default app;
