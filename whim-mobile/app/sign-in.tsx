import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

type Mode = 'sign-in' | 'sign-up';

export default function SignIn() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Apple Sign-In is deferred until the paid Apple Developer account + Supabase
  // Apple provider are configured (the entitlement requires code signing). Flip
  // APPLE_ENABLED to true then to re-enable the button.
  const APPLE_ENABLED = false;
  useEffect(() => {
    if (APPLE_ENABLED && Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  // Email + password. (In Supabase → Auth, you can turn off "Confirm email"
  // during development so sign-up logs you in immediately.)
  const submitEmail = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    if (mode === 'sign-up' && password.length < 8) {
      Alert.alert('Weak password', 'Use at least 8 characters.');
      return;
    }
    if (mode === 'sign-up' && !name.trim()) {
      Alert.alert('What’s your name?', 'Friends will see it when you plan trips together.');
      return;
    }
    setBusy(true);
    const { error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            // the signup trigger copies this into profiles.display_name
            options: { data: { display_name: name.trim().slice(0, 60) } },
          });
    setBusy(false);

    if (error) Alert.alert('Could not continue', error.message);
    else if (mode === 'sign-up') {
      Alert.alert('Almost there', 'Check your email to confirm your account, then sign in.');
      setMode('sign-in');
    }
    // on success the auth listener flips the session and the guard routes us home
  };

  // Sends the reset email; the link opens our hosted page (docs/reset.html on
  // GitHub Pages) where the user sets the new password, then signs in here.
  const forgotPassword = () => {
    Alert.prompt(
      'Reset password',
      'We’ll email you a link to choose a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send link',
          onPress: async (value) => {
            const target = (value ?? '').trim();
            if (!target) return;
            const { error } = await supabase.auth.resetPasswordForEmail(target, {
              redirectTo: 'https://pranjal250605.github.io/whim-app/reset.html',
            });
            // don't reveal whether the email exists — same message either way
            if (!error) Alert.alert('Check your email', 'If that address has an account, a reset link is on its way.');
            else Alert.alert('Couldn’t send', error.message);
          },
        },
      ],
      'plain-text',
      email,
      'email-address',
    );
  };

  // Sign in with Apple — required by App Store Guideline 4.8 once we offer it.
  // Needs the Apple provider configured in Supabase + a paid Apple account to
  // fully work; the button is hidden on non-iOS.
  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token from Apple.');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) Alert.alert('Apple sign-in failed', error.message);
    } catch (e: any) {
      if (e?.code !== 'ERR_REQUEST_CANCELED') Alert.alert('Apple sign-in failed', String(e?.message ?? e));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-1 justify-center px-7">
        <Text className="font-serif text-4xl font-bold text-ink">Whim</Text>
        <Text className="mt-2 text-[15px] text-muted">
          {mode === 'sign-in' ? 'Welcome back.' : 'Create your account to start swiping.'}
        </Text>

        <View className="mt-8 gap-3">
          {mode === 'sign-up' && (
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#B6B1A9"
              autoCapitalize="words"
              autoComplete="name"
              maxLength={60}
              className="rounded-2xl border border-ink/10 bg-white px-4 py-4 text-[16px] text-ink"
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#B6B1A9"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            className="rounded-2xl border border-ink/10 bg-white px-4 py-4 text-[16px] text-ink"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#B6B1A9"
            secureTextEntry
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            className="rounded-2xl border border-ink/10 bg-white px-4 py-4 text-[16px] text-ink"
          />
        </View>

        <Pressable
          onPress={submitEmail}
          disabled={busy}
          className="mt-5 h-14 items-center justify-center rounded-2xl bg-ink"
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="mt-4 items-center">
          <Text className="text-[14px] font-medium text-muted">
            {mode === 'sign-in' ? 'New here?  Create an account' : 'Already have an account?  Sign in'}
          </Text>
        </Pressable>

        {mode === 'sign-in' && (
          <Pressable onPress={forgotPassword} className="mt-3 items-center">
            <Text className="text-[13.5px] font-semibold text-accent">Forgot password?</Text>
          </Pressable>
        )}

        {appleAvailable && (
          <View className="mt-8">
            <View className="mb-5 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-ink/10" />
              <Text className="text-[12px] text-muted">or</Text>
              <View className="h-px flex-1 bg-ink/10" />
            </View>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={16}
              style={{ height: 52, width: '100%' }}
              onPress={signInWithApple}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
