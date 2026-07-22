import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import {
  fetchUserProfileWithBadges,
  followUser,
  unfollowUser,
  fetchFollowingIds,
  type UserLite,
  type Badge,
} from '@/lib/db';
import { TIER, tierOf, nextTier, tierProgress, type Tier } from '@/data/badges';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import BackButton from '@/components/BackButton';

const initialsOf = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Read-only view of a followed user's badges — the "Strava profile" of a friend.
export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [user, setUser] = useState<UserLite | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [following, setFollowing] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [res, ids] = await Promise.all([fetchUserProfileWithBadges(String(id)), fetchFollowingIds()]);
      if (!res) {
        setState('error');
        return;
      }
      setUser(res.user);
      setBadges(res.badges);
      setFollowing(ids.includes(String(id)));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async () => {
    const was = following;
    setFollowing(!was);
    try {
      was ? await unfollowUser(String(id)) : await followUser(String(id));
      load();
    } catch {
      setFollowing(was);
      toast('Couldn’t update — try again.');
    }
  };

  const name = user?.displayName || user?.username || 'Traveler';
  const cities = badges.length;
  const places = badges.reduce((n, b) => n + b.spotCount, 0);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center px-4 pb-1 pt-1">
        <BackButton />
      </View>

      {state === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={COLORS.accent} />
        </View>
      )}

      {state === 'error' && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-serif text-[21px] text-ink">Couldn’t load this profile</Text>
          <Pressable onPress={load} className="mt-5 rounded-2xl bg-ink px-6 py-3.5">
            <Text className="text-[15px] font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {state === 'ready' && user && (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="flex-row items-center gap-3.5 px-5 pt-2">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-accent" style={SHADOWS.accent}>
              <Text className="font-serif text-[24px] text-white">{initialsOf(name)}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-serif text-[27px] leading-[1.05] text-ink" numberOfLines={1}>{name}</Text>
              {user.username && <Text className="mt-0.5 font-mono text-[13px] text-accent">@{user.username}</Text>}
            </View>
            <Pressable onPress={toggle} style={press()} className={`rounded-full border px-4 py-2 ${following ? 'border-ink/15 bg-white' : 'border-accent bg-accent'}`}>
              <Text className={`text-[13px] font-bold ${following ? 'text-muted' : 'text-white'}`}>{following ? 'Following' : 'Follow'}</Text>
            </Pressable>
          </View>

          <View className="mx-5 mt-5 flex-row rounded-2xl bg-white py-3.5" style={SHADOWS.soft}>
            {[
              { n: badges.length, l: 'Badges' },
              { n: cities, l: cities === 1 ? 'City' : 'Cities' },
              { n: places, l: 'Stamps' },
            ].map((s, i) => (
              <View key={s.l} className={`flex-1 items-center ${i > 0 ? 'border-l border-ink/8' : ''}`}>
                <Text className="font-serif text-[26px] text-ink">{s.n}</Text>
                <Text className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted">{s.l}</Text>
              </View>
            ))}
          </View>

          {badges.length === 0 ? (
            <View className="mx-5 mt-6 items-center rounded-2xl border border-dashed border-ink/15 px-6 py-8">
              <Text className="text-center font-serif text-[17px] text-ink">{following ? 'No badges yet' : 'Follow to see their badges'}</Text>
              <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">
                {following ? 'They haven’t stamped a city yet.' : 'Once you follow, their city badges show up here.'}
              </Text>
            </View>
          ) : (
            <>
              <Text className="mt-7 px-5 font-serif text-[20px] text-ink">City badges</Text>
              <View className="mt-3 flex-row flex-wrap px-5" style={{ gap: 12 }}>
                {badges.map((b) => {
                  const tier = tierOf(b.spotCount) as Tier;
                  const t = TIER[tier];
                  const nx = nextTier(b.spotCount);
                  return (
                    <View key={b.city} style={{ width: '30.6%' }} className="items-center">
                      <View className="aspect-square w-full items-center justify-center rounded-full" style={{ borderWidth: 3.5, borderColor: t.color, backgroundColor: t.soft }}>
                        <Text className="font-serif text-[24px]" style={{ color: t.color }}>{initialsOf(b.city)}</Text>
                        {tier === 3 && <Text className="absolute bottom-2 text-[11px]">★</Text>}
                      </View>
                      <Text className="mt-1.5 text-[12.5px] font-bold text-ink" numberOfLines={1}>{b.city}</Text>
                      <Text className="font-mono text-[9px] uppercase tracking-wide" style={{ color: t.color }}>{t.label}</Text>
                      <View className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink/8">
                        <View className="h-full rounded-full" style={{ width: `${Math.round(tierProgress(b.spotCount) * 100)}%`, backgroundColor: t.color }} />
                      </View>
                      <Text className="mt-0.5 font-mono text-[8.5px] text-muted">{nx ? `${nx.need} to ${TIER[nx.to].label}` : `${b.spotCount} spots`}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
