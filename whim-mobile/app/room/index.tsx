import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useWhimStore } from '@/store/useWhimStore';
import { createRoom, fetchMyRooms, joinRoom, type Room } from '@/lib/db';
import { VIBE_LABEL, VIBE_DOT } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

// Group Rooms hub — start a room for the current city+vibe, join a friend's
// by invite code, or jump back into a room you're already in.
export default function RoomHub() {
  const city = useWhimStore((s) => s.city);
  const vibe = useWhimStore((s) => s.vibe);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [rooms, setRooms] = useState<Room[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyRooms().then(setRooms).catch(() => setRooms([]));
    }, []),
  );

  const create = async () => {
    setCreating(true);
    try {
      const room = await createRoom(city, vibe, name.trim() || undefined);
      router.push(`/room/${room.id}` as never);
    } catch (e: any) {
      Alert.alert('Couldn’t create the room', String(e?.message ?? e));
    } finally {
      setCreating(false);
    }
  };

  const join = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('Check the code', 'Invite codes are 6 characters.');
      return;
    }
    setJoining(true);
    try {
      const room = await joinRoom(trimmed);
      setCode('');
      router.push(`/room/${room.id}` as never);
    } catch {
      Alert.alert('Couldn’t join', 'No open room with that code — double-check it with your friend.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-1">
        <BackButton />
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Text className="font-mono text-[11px] tracking-[0.08em] text-accent">GROUP ROOMS</Text>
        </View>
        <Text className="mt-2 font-serif text-[36px] leading-[1.02] text-ink">Plan together</Text>
        <Text className="mt-2 text-[15px] leading-6 text-muted">
          Everyone swipes the same deck. Spots the whole crew likes become matches.
        </Text>

        {/* create */}
        <View className="mt-7 rounded-[24px] bg-white p-5" style={SHADOWS.soft}>
          <Text className="font-serif text-[21px] text-ink">Start a room</Text>
          <View className="mt-2.5 flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: VIBE_DOT[vibe] }} />
            <Text className="text-[13.5px] font-semibold text-ink">
              {city} · {VIBE_LABEL[vibe]}
            </Text>
            <Text className="text-[12px] text-muted">(from Discover)</Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Trip name (optional)"
            placeholderTextColor="#B6B1A9"
            maxLength={40}
            className="mt-4 rounded-2xl border border-ink/10 bg-canvas px-4 py-3.5 text-[15px] text-ink"
          />
          <Pressable
            onPress={create}
            disabled={creating}
            style={press()}
            className="mt-4 h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-accent"
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-[15.5px] font-bold text-white">Create & invite friends</Text>
                <Icon name="arrowRight" size={16} color="#fff" strokeWidth={2.4} />
              </>
            )}
          </Pressable>
        </View>

        {/* join */}
        <View className="mt-4 rounded-[24px] bg-white p-5" style={SHADOWS.soft}>
          <Text className="font-serif text-[21px] text-ink">Join with a code</Text>
          <View className="mt-4 flex-row gap-2.5">
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="ABC123"
              placeholderTextColor="#B6B1A9"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              className="flex-1 rounded-2xl border border-ink/10 bg-canvas px-4 py-3.5 font-mono text-[17px] tracking-[0.3em] text-ink"
            />
            <Pressable
              onPress={join}
              disabled={joining}
              style={press()}
              className="h-[52px] items-center justify-center rounded-full bg-ink px-6"
            >
              {joining ? <ActivityIndicator color="#fff" /> : <Text className="text-[15px] font-bold text-white">Join</Text>}
            </Pressable>
          </View>
        </View>

        {/* my rooms */}
        {rooms && rooms.length > 0 && (
          <View className="mt-8">
            <Text className="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">Your rooms</Text>
            {rooms.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/room/${r.id}` as never)}
                style={press(SHADOWS.soft)}
                className="mb-3 flex-row items-center gap-3.5 rounded-2xl bg-white p-4"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full bg-accent-soft">
                  <Icon name="person" size={20} color={COLORS.accent} strokeWidth={2} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15.5px] font-bold text-ink">{r.name ?? `${r.city} together`}</Text>
                  <Text className="mt-0.5 text-[12.5px] text-muted">
                    {r.city} · {VIBE_LABEL[r.vibe]} · {r.memberCount ?? 1} {(r.memberCount ?? 1) === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                <Text className="font-mono text-[12px] tracking-[0.14em] text-muted">{r.code}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
