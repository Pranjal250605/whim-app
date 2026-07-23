import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { fetchMyCommunitySpots, submitPlaces, type CommunitySpot } from '@/lib/db';
import { placePhotoSource } from '@/lib/placePhoto';
import { VIBE_LABEL, VIBE_DOT } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import { useQueryClient } from '@tanstack/react-query';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

// UGC — paste your favorite places; we resolve each, an LLM sorts it into a
// Whim vibe + writes a blurb, and it's saved to your spots.
export default function AddSpots() {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<CommunitySpot[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchMyCommunitySpots().then(setMine).catch(() => {});
    }, []),
  );

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const { saved, notFound } = await submitPlaces(text);
      setText('');
      setMine(await fetchMyCommunitySpots());
      qc.invalidateQueries({ queryKey: ['communityFeed'] });
      if (saved.length) toast(`Added ${saved.length} spot${saved.length > 1 ? 's' : ''} ✦`);
      if (notFound.length) toast(`Couldn’t find: ${notFound.slice(0, 2).join(', ')}`);
    } catch (e: any) {
      toast(e?.message || 'Couldn’t add those — try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-1">
          <BackButton />
        </View>

        <FlatList
          data={mine}
          keyExtractor={(s) => s.id}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <View className="mt-1 flex-row items-center gap-2">
                <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                <Text className="font-mono text-[11px] tracking-[0.16em] text-accent">YOUR LOCAL KNOWLEDGE</Text>
              </View>
              <Text className="mt-2 font-serif text-[32px] leading-[1.02] text-ink">Add your spots</Text>
              <Text className="mt-1.5 text-[14.5px] leading-6 text-muted">
                Drop the places you love — cafés, bars, hidden gems, anywhere. We’ll find each one and sort it into a vibe.
              </Text>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={'One per line, e.g.\nBlue Tokai Koregaon Park\nShaniwar Wada\nHigh Spirits Cafe'}
                placeholderTextColor="#B6B1A9"
                multiline
                className="mt-5 min-h-[132px] rounded-2xl border border-ink/10 bg-white px-4 py-3.5 text-[15px] leading-6 text-ink"
                style={{ textAlignVertical: 'top' }}
              />

              <Pressable
                onPress={submit}
                disabled={busy || !text.trim()}
                style={press(SHADOWS.accent)}
                className={`mt-4 h-14 flex-row items-center justify-center gap-2 rounded-full ${text.trim() ? 'bg-accent' : 'bg-[#C9C4BC]'}`}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text className="text-[16px] font-bold text-white">Add & sort them</Text>
                    <Icon name="arrowRight" size={16} color="#fff" strokeWidth={2.4} />
                  </>
                )}
              </Pressable>

              {mine.length > 0 && (
                <Text className="mb-3 mt-9 text-[12px] font-bold uppercase tracking-wide text-muted">
                  Your spots · {mine.length}
                </Text>
              )}
            </View>
          }
          renderItem={({ item: s }) => {
            const photo = placePhotoSource({ placeId: s.id, w: 300 });
            return (
              <View className="mb-3 flex-row items-center gap-3.5 rounded-[18px] bg-white p-3" style={SHADOWS.soft}>
                <View className="h-[58px] w-[58px] overflow-hidden rounded-[14px]" style={{ backgroundColor: COLORS.accentSoft }}>
                  {photo ? (
                    <Image source={photo} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VIBE_DOT[s.vibe] }} />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: VIBE_DOT[s.vibe] }} />
                    <Text className="font-mono text-[9.5px] uppercase tracking-wide text-muted">
                      {VIBE_LABEL[s.vibe]}
                      {s.city ? ` · ${s.city}` : ''}
                    </Text>
                  </View>
                  <Text className="mt-1 font-serif text-[17px] text-ink" numberOfLines={1}>{s.title}</Text>
                  {s.blurb ? <Text className="mt-0.5 text-[12.5px] leading-5 text-muted" numberOfLines={2}>{s.blurb}</Text> : null}
                </View>
              </View>
            );
          }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
