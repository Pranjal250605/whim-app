import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  searchUsers,
  followUser,
  unfollowUser,
  fetchFollowingIds,
  fetchFriends,
  fetchFriendsActivity,
  type UserLite,
  type Friend,
  type Activity,
} from '@/lib/db';
import { TIER, type Tier } from '@/data/badges';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

const initialsOf = (s: string) => s.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

function Avatar({ name, tier }: { name: string; tier?: number }) {
  const ring = tier && tier > 0 ? TIER[tier as Tier].color : COLORS.accent;
  return (
    <View className="h-12 w-12 items-center justify-center rounded-full bg-accent-soft" style={{ borderWidth: 2, borderColor: ring }}>
      <Text className="font-serif text-[16px] text-accent">{initialsOf(name || '?')}</Text>
    </View>
  );
}

// Friends — find people by @handle, follow them, and see their badge activity.
export default function Friends() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);

  const qc = useQueryClient();
  const mine = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const [ids, fr, act] = await Promise.all([fetchFollowingIds(), fetchFriends(), fetchFriendsActivity()]);
      return { ids: new Set(ids), friends: fr, activity: act };
    },
  });
  const followingIds = mine.data?.ids ?? new Set<string>();
  const friends: Friend[] = mine.data?.friends ?? [];
  const activity: Activity[] = mine.data?.activity ?? [];
  const loading = mine.isLoading;

  // debounced search
  useEffect(() => {
    const term = q.trim();
    if (term.replace(/^@/, '').length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(() => {
      searchUsers(term)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 280);
    return () => clearTimeout(id);
  }, [q]);

  const toggleFollow = async (u: UserLite) => {
    const isFollowing = followingIds.has(u.id);
    // optimistic: flip the id in the cached follow set
    qc.setQueryData<{ ids: Set<string>; friends: Friend[]; activity: Activity[] }>(['friends'], (old) => {
      if (!old) return old;
      const ids = new Set(old.ids);
      isFollowing ? ids.delete(u.id) : ids.add(u.id);
      return { ...old, ids };
    });
    try {
      isFollowing ? await unfollowUser(u.id) : await followUser(u.id);
    } catch {
      toast('Couldn’t update — try again.');
    } finally {
      qc.invalidateQueries({ queryKey: ['friends'] });
    }
  };

  const isSearching = q.trim().replace(/^@/, '').length >= 2;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-1">
        <BackButton />
      </View>

      <View className="px-5 pt-1">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Text className="font-mono text-[11px] tracking-[0.16em] text-accent">FRIENDS</Text>
        </View>
        <Text className="mt-1 font-serif text-[32px] leading-[1.02] text-ink">Your people</Text>
      </View>

      {/* search */}
      <View className="mx-5 mt-4 flex-row items-center rounded-2xl border border-ink/10 bg-white px-4">
        <Text className="font-mono text-[16px] text-muted">@</Text>
        <TextInput
          value={q.replace(/^@/, '')}
          onChangeText={(t) => setQ(t.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
          placeholder="find friends by handle"
          placeholderTextColor="#B6B1A9"
          autoCapitalize="none"
          autoCorrect={false}
          className="flex-1 py-3 text-[15px] text-ink"
        />
        {searching && <ActivityIndicator size="small" color={COLORS.accent} />}
      </View>

      {isSearching ? (
        <FlatList
          data={results}
          keyExtractor={(u) => u.id}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !searching ? <Text className="mt-8 text-center text-[13.5px] text-muted">No one found for “@{q.replace(/^@/, '')}”.</Text> : null
          }
          renderItem={({ item: u }) => {
            const following = followingIds.has(u.id);
            return (
              <View className="mb-2.5 flex-row items-center gap-3 rounded-2xl bg-white p-3" style={SHADOWS.soft}>
                <Avatar name={u.displayName || u.username || '?'} />
                <View className="flex-1">
                  <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{u.displayName || u.username}</Text>
                  {u.username && <Text className="font-mono text-[11.5px] text-muted">@{u.username}</Text>}
                </View>
                <Pressable
                  onPress={() => toggleFollow(u)}
                  style={press()}
                  className={`rounded-full border px-4 py-2 ${following ? 'border-ink/15 bg-white' : 'border-accent bg-accent'}`}
                >
                  <Text className={`text-[13px] font-bold ${following ? 'text-muted' : 'text-white'}`}>{following ? 'Following' : 'Follow'}</Text>
                </Pressable>
              </View>
            );
          }}
        />
      ) : loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(f) => f.id}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {activity.length > 0 && (
                <View className="mb-6">
                  <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">Recent activity</Text>
                  {activity.map((a, i) => {
                    const tier = TIER[(a.tier as Tier)] ?? TIER[1];
                    const who = a.displayName || (a.username ? `@${a.username}` : 'Someone');
                    return (
                      <Pressable key={`${a.id}-${a.city}-${i}`} onPress={() => router.push(`/u/${a.id}`)} style={press(SHADOWS.soft)} className="mb-2.5 flex-row items-center gap-3 rounded-2xl bg-white p-3">
                        <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: tier.soft, borderWidth: 2, borderColor: tier.color }}>
                          <Text className="font-serif text-[13px]" style={{ color: tier.color }}>{initialsOf(a.city)}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-[14px] text-ink" numberOfLines={2}>
                            <Text className="font-bold">{who}</Text> earned the <Text className="font-bold">{a.city}</Text> badge
                          </Text>
                          <Text className="mt-0.5 font-mono text-[10px] uppercase tracking-wide" style={{ color: tier.color }}>{tier.label}</Text>
                        </View>
                        <Text className="font-mono text-[10px] text-muted">{ago(a.at)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              <Text className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink">Following · {friends.length}</Text>
            </View>
          }
          ListEmptyComponent={
            <View className="items-center px-6 pt-6">
              <Text className="text-center font-serif text-[18px] text-ink">Follow your friends</Text>
              <Text className="mt-1.5 text-center text-[13px] leading-5 text-muted">Search a handle above to follow someone and watch their badges roll in.</Text>
            </View>
          }
          renderItem={({ item: f }) => (
            <Pressable onPress={() => router.push(`/u/${f.id}`)} style={press(SHADOWS.soft)} className="mb-2.5 flex-row items-center gap-3 rounded-2xl bg-white p-3">
              <Avatar name={f.displayName || f.username || '?'} tier={f.bestTier} />
              <View className="flex-1">
                <Text className="text-[15px] font-bold text-ink" numberOfLines={1}>{f.displayName || f.username}</Text>
                <Text className="font-mono text-[11.5px] text-muted">
                  {f.username ? `@${f.username} · ` : ''}
                  {f.badgeCount} badge{f.badgeCount === 1 ? '' : 's'}
                  {f.topCity ? ` · top: ${f.topCity}` : ''}
                </Text>
              </View>
              <Icon name="arrowRight" size={16} color="#B6B1A9" strokeWidth={2} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
