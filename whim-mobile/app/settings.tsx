import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function Row({
  label,
  value,
  onPress,
  destructive,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between border-b border-hairline px-4 py-4"
    >
      <Text className={`text-[15px] font-medium ${destructive ? 'text-[#C2603F]' : 'text-ink'}`}>{label}</Text>
      {value ? <Text className="text-[14px] text-muted">{value}</Text> : onPress ? <Text className="text-muted">›</Text> : null}
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide text-muted">{title}</Text>
      <View className="overflow-hidden rounded-2xl bg-white">{children}</View>
    </View>
  );
}

export default function Settings() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? 'Signed in';
  const [busy, setBusy] = useState(false);

  const confirmSignOut = () =>
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);

  // App Store Guideline 5.1.1(v): account creation must offer in-app deletion.
  // Handled by the delete-account Edge Function (service role), which removes the
  // auth user and cascades to profiles + saved_spots.
  const deleteAccount = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke('delete-account');
    setBusy(false);
    if (error) {
      Alert.alert('Could not delete account', error.message);
      return;
    }
    await signOut(); // guard routes to sign-in
  };

  const confirmDelete = () =>
    Alert.alert(
      'Delete account?',
      'This permanently deletes your account and everything you’ve saved. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ],
    );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-1">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-black/5"
        >
          <Text className="text-lg text-ink">‹</Text>
        </Pressable>
        <Text className="text-base font-semibold text-ink">Settings</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <Section title="Account">
          <Row label="Signed in as" value={email} />
          <Row label="Sign out" onPress={confirmSignOut} />
        </Section>

        <Section title="About">
          <Row label="Photos via Pexels" onPress={() => Linking.openURL('https://www.pexels.com')} />
          <Row label="Maps © Mapbox / OpenStreetMap" onPress={() => Linking.openURL('https://www.mapbox.com/about/maps/')} />
          <Row label="Privacy Policy" onPress={() => Linking.openURL('https://whim.app/privacy')} />
          <Row label="Version" value="1.0.0" />
        </Section>

        <Section title="Danger zone">
          {busy ? (
            <View className="px-4 py-4">
              <ActivityIndicator color="#C2603F" />
            </View>
          ) : (
            <Row label="Delete account" onPress={confirmDelete} destructive />
          )}
        </Section>

        <Text className="px-1 text-[12px] leading-5 text-muted">
          Photos provided by Pexels. Map data © Mapbox and © OpenStreetMap contributors.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
