import { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { fetchMyCommunitySpots, submitPlaces, type CommunitySpot } from '@/lib/db';
import { VIBE_LABEL, VIBE_DOT } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

// UGC — paste your favorite places; we resolve each, an LLM sorts it into a
// Whim vibe + writes a blurb, and it's saved to your spots.
export default function AddSpots() {
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

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
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
            <>
              <Text className="mb-3 mt-9 text-[12px] font-bold uppercase tracking-wide text-muted">
                Your spots · {mine.length}
              </Text>
              {mine.map((s) => (
                <View key={s.id} className="mb-3 rounded-[18px] bg-white p-4" style={SHADOWS.soft}>
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: VIBE_DOT[s.vibe] }} />
                    <Text className="font-mono text-[10px] uppercase tracking-wide text-muted">
                      {VIBE_LABEL[s.vibe]}
                      {s.city ? ` · ${s.city}` : ''}
                    </Text>
                  </View>
                  <Text className="mt-1.5 font-serif text-[18px] text-ink">{s.title}</Text>
                  {s.blurb ? <Text className="mt-0.5 text-[13px] leading-5 text-muted">{s.blurb}</Text> : null}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
