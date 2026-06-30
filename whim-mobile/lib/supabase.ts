import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// SECURITY NOTES
// ──────────────
// 1. Only the ANON/publishable key ships in the app. It is *designed* to be
//    public and is safe ONLY because every table has Row-Level Security enabled.
//    NEVER put the service_role/secret key in client code.
// 2. Session tokens are persisted via AsyncStorage — the storage Supabase
//    recommends for React Native. It works on unsigned dev builds (unlike the
//    keychain, which needs a signing entitlement), so the session survives app
//    reloads/relaunches. For a hardened production build we can move to an
//    encrypted store once the app is signed.
// 3. Values come from EAS env vars, not hardcoded. `EXPO_PUBLIC_` vars are
//    inlined at build time — fine for the anon key, never for secrets.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // not a web app; avoids RN URL parsing
  },
});
