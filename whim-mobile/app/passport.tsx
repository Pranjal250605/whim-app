import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useWhimStore } from '@/store/useWhimStore';
import type { CheckinItem } from '@/lib/db';
import GlassNav from '@/components/GlassNav';
import SpotImage from '@/components/SpotImage';
import PassportCard from '@/components/PassportCard';
import Icon from '@/components/Icon';
import { COLORS, SHADOWS } from '@/lib/theme';

// Profile / Passport — a travel diary of places you've checked in at.
export default function Passport() {
  const checkins = useWhimStore((s) => s.checkins);
  const profile = useWhimStore((s) => s.profile);

  const shareRef = useRef<View>(null);
  const sharePassport = async () => {
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Passport' });
      }
    } catch (e) {
      console.warn('[whim] passport share failed:', e);
    }
  };

  const byCity = useMemo(() => {
    const map = new Map<string, CheckinItem[]>();
    checkins.forEach((c) => {
      if (!map.has(c.city)) map.set(c.city, []);
      map.get(c.city)!.push(c);
    });
    return [...map.entries()];
  }, [checkins]);

  const cityCount = byCity.length;
  const spotCount = checkins.length;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      {/* tab root — no back button; share + settings live top-right */}
      <View className="flex-row items-center justify-end gap-2.5 px-4 pt-1">
        {spotCount > 0 && (
          <Pressable
            onPress={sharePassport}
            accessibilityLabel="Share your Passport"
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            style={SHADOWS.soft}
          >
            <Icon name="share" size={19} color={COLORS.ink} strokeWidth={2} />
          </Pressable>
        )}
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          style={SHADOWS.soft}
        >
          <Icon name="person" size={20} color={COLORS.ink} strokeWidth={1.9} />
        </Pressable>
      </View>

      <View className="px-5 pt-2">
        <Text className="font-serif text-[34px] text-ink">Passport</Text>
        <Text className="mt-1 text-[13.5px] text-muted">Every place you’ve stamped on your travels.</Text>
      </View>

      {/* stats */}
      <View className="mt-4 flex-row gap-3 px-5">
        <View className="flex-1 rounded-2xl bg-white p-4" style={SHADOWS.soft}>
          <Text className="font-serif text-[30px] text-ink">{cityCount}</Text>
          <Text className="mt-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{cityCount === 1 ? 'City' : 'Cities'}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white p-4" style={SHADOWS.soft}>
          <Text className="font-serif text-[30px] text-ink">{spotCount}</Text>
          <Text className="mt-0.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{spotCount === 1 ? 'Place' : 'Places'}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-6" contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {spotCount === 0 ? (
          <View className="items-center px-8 pt-14">
            <Text className="font-serif text-[22px] text-ink">No stamps yet</Text>
            <Text className="mt-2.5 text-center text-[14px] leading-5 text-muted">
              Check in at spots on your itinerary as you visit them, and they’ll be stamped here.
            </Text>
          </View>
        ) : (
          byCity.map(([cityName, stamps]) => (
            <View key={cityName} className="mb-6">
              <Text className="mb-3 text-[12px] font-bold uppercase tracking-wide text-muted">
                {cityName} · {stamps.length}
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {stamps.map((s) => (
                  <View key={s.spotId} style={{ width: '31.5%' }}>
                    <View className="aspect-square overflow-hidden rounded-2xl" style={{ backgroundColor: s.tone }}>
                      <SpotImage uri={s.photo} />
                      <View className="absolute right-1.5 top-1.5 h-6 w-6 items-center justify-center rounded-full bg-accent">
                        <Icon name="check" size={13} color="#fff" strokeWidth={3} />
                      </View>
                    </View>
                    <Text numberOfLines={2} className="mt-1.5 text-[11.5px] font-semibold leading-4 text-ink">
                      {s.title}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <GlassNav active="profile" />

      {/* off-screen card captured for sharing */}
      <View ref={shareRef} collapsable={false} style={{ position: 'absolute', left: -9999, top: 0 }}>
        <PassportCard displayName={profile?.displayName ?? null} checkins={checkins} />
      </View>
    </SafeAreaView>
  );
}
