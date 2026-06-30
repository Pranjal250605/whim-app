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

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
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
