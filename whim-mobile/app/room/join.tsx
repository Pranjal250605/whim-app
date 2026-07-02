import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { joinRoom } from '@/lib/db';
import { COLORS } from '@/lib/theme';

// Invite deep-link target: whim://room/join?code=ABC123
// Joins immediately and lands in the lobby. (The auth gate holds this route
// while the user signs in, then resumes it — see app/_layout.tsx.)
export default function RoomJoinLink() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    const go = async () => {
      try {
        if (!code) throw new Error('missing code');
        const room = await joinRoom(String(code));
        router.replace(`/room/${room.id}` as never);
      } catch {
        Alert.alert('Couldn’t join', 'That invite didn’t work — ask your friend for a fresh code.', [
          { text: 'OK', onPress: () => router.replace('/room' as never) },
        ]);
      }
    };
    void go();
  }, [code]);

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
      <ActivityIndicator color={COLORS.accent} />
      <Text className="mt-4 font-mono text-[11px] tracking-[0.14em] text-muted">JOINING ROOM…</Text>
    </SafeAreaView>
  );
}
