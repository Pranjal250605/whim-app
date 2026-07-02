import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// SECURITY NOTES
// ──────────────
// 1. Only the ANON/publishable key ships in the app. It is *designed* to be
//    public and is safe ONLY because every table has Row-Level Security enabled.
//    NEVER put the service_role/secret key in client code.
// 2. Session tokens are persisted in the iOS Keychain (expo-secure-store), so
//    they're encrypted at rest and excluded from plaintext device backups.
//    Unsigned dev builds have no keychain entitlement — there we fall back to
//    AsyncStorage so the dev workflow keeps session persistence. Signed
//    (TestFlight / App Store) builds automatically get the keychain.
// 3. Values come from EAS env vars, not hardcoded. `EXPO_PUBLIC_` vars are
//    inlined at build time — fine for the anon key, never for secrets.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// ── keychain-backed storage adapter ─────────────────────────────────────────
// SecureStore values should stay under ~2 KB; a Supabase session JSON is ~3 KB,
// so large values are split into chunks (`<key>` holds "__chunks__:<n>",
// `<key>.0 … <key>.n-1` hold the pieces).

const CHUNK_SIZE = 1800;
const CHUNK_MARKER = '__chunks__:';
// AFTER_FIRST_UNLOCK so background token refresh still works on a locked phone
const KEYCHAIN_OPTS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let keychainUsable: boolean | null = null;
async function hasKeychain(): Promise<boolean> {
  if (keychainUsable !== null) return keychainUsable;
  try {
    await SecureStore.setItemAsync('whim.keychain.probe', 'ok', KEYCHAIN_OPTS);
    await SecureStore.deleteItemAsync('whim.keychain.probe');
    keychainUsable = true;
  } catch {
    keychainUsable = false; // unsigned build → no keychain entitlement
  }
  return keychainUsable;
}

function chunkCount(head: string | null): number {
  if (!head?.startsWith(CHUNK_MARKER)) return 0;
  const n = Number.parseInt(head.slice(CHUNK_MARKER.length), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

async function secureGet(key: string): Promise<string | null> {
  const head = await SecureStore.getItemAsync(key);
  const n = chunkCount(head);
  if (n === 0) return head;
  const parts: (string | null)[] = [];
  for (let i = 0; i < n; i++) parts.push(await SecureStore.getItemAsync(`${key}.${i}`));
  if (parts.some((p) => p == null)) return null; // torn write → treat as signed out
  return parts.join('');
}

async function secureSet(key: string, value: string): Promise<void> {
  const oldChunks = chunkCount(await SecureStore.getItemAsync(key));
  const n = value.length > CHUNK_SIZE ? Math.ceil(value.length / CHUNK_SIZE) : 0;
  for (let i = 0; i < n; i++) {
    await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), KEYCHAIN_OPTS);
  }
  await SecureStore.setItemAsync(key, n === 0 ? value : `${CHUNK_MARKER}${n}`, KEYCHAIN_OPTS);
  for (let i = n; i < oldChunks; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
}

async function secureRemove(key: string): Promise<void> {
  const n = chunkCount(await SecureStore.getItemAsync(key));
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  await SecureStore.deleteItemAsync(key);
}

const sessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!(await hasKeychain())) return AsyncStorage.getItem(key);
    const secure = await secureGet(key);
    if (secure != null) return secure;
    // one-time migration: sessions saved before this adapter live in AsyncStorage
    const legacy = await AsyncStorage.getItem(key);
    if (legacy != null) {
      await secureSet(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (await hasKeychain()) await secureSet(key, value);
    else await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (await hasKeychain()) await secureRemove(key);
    await AsyncStorage.removeItem(key); // clear any legacy copy too
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not a web app; avoids RN URL parsing
  },
});
