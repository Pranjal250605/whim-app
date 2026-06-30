import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// SECURITY NOTES
// ──────────────
// 1. Only the ANON key ships in the app. It is *designed* to be public and is
//    safe ONLY because every table has Row-Level Security enabled (see the SQL
//    in the message). NEVER put the service_role key in client code.
// 2. Auth tokens are stored in the device keychain/keystore via expo-secure-store
//    (encrypted at rest), not AsyncStorage (plaintext).
// 3. Values come from EAS env vars, not hardcoded. `EXPO_PUBLIC_` vars are
//    inlined at build time — fine for the anon key, never for secrets.
// 4. The keychain needs a signing entitlement. Unsigned simulator builds (no
//    Apple account yet) lack it, so the calls are wrapped to degrade gracefully:
//    on failure they no-op / return null instead of throwing, which means the
//    session just won't persist across launches on an unsigned build. On a
//    proper signed build the keychain works and persistence is restored.
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      /* keychain unavailable (unsigned build) — skip persistence */
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* keychain unavailable — nothing to remove */
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not a web app; avoids RN URL parsing
  },
});
