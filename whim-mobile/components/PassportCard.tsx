import { Text, View } from 'react-native';
import type { CheckinItem } from '@/lib/db';
import { COLORS } from '@/lib/theme';

// The Passport as a flex — a branded, screenshot-ready card of everywhere
// you've been. Rendered off-screen and captured with view-shot (same pattern
// as ShareCard). Every share of this card is an ad for the app.
export default function PassportCard({
  displayName,
  checkins,
}: {
  displayName: string | null;
  checkins: CheckinItem[];
}) {
  const byCity = new Map<string, number>();
  checkins.forEach((c) => byCity.set(c.city, (byCity.get(c.city) ?? 0) + 1));
  const cities = [...byCity.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <View style={{ width: 380, backgroundColor: COLORS.canvas, paddingHorizontal: 30, paddingVertical: 34 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, color: COLORS.ink, letterSpacing: -0.5 }}>
          Whim
        </Text>
        <View
          style={{
            transform: [{ rotate: '-6deg' }],
            borderWidth: 1.5,
            borderColor: COLORS.accent,
            borderRadius: 6,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontFamily: 'IBMPlexMono_400Regular', fontSize: 9, letterSpacing: 2, color: COLORS.accent }}>
            PASSPORT ✦
          </Text>
        </View>
      </View>

      <Text style={{ marginTop: 22, fontFamily: 'IBMPlexMono_400Regular', color: COLORS.accent, fontSize: 11.5, letterSpacing: 2.4 }}>
        {(displayName ?? 'A TRAVELLER').toUpperCase()} HAS STAMPED
      </Text>
      <Text style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 44, color: COLORS.ink, lineHeight: 47, marginTop: 4, letterSpacing: -1 }}>
        {checkins.length} {checkins.length === 1 ? 'place' : 'places'}
      </Text>
      <Text style={{ marginTop: 4, color: COLORS.muted, fontSize: 15 }}>
        across {cities.length} {cities.length === 1 ? 'city' : 'cities'}
      </Text>

      <View style={{ marginTop: 22 }}>
        {cities.slice(0, 6).map(([city, count]) => (
          <View
            key={city}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(23,21,15,0.08)',
            }}
          >
            <Text style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 17, color: COLORS.ink }}>{city}</Text>
            <View style={{ flexDirection: 'row', gap: 5 }}>
              {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
                <View key={i} style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.accent }} />
              ))}
              {count > 8 && (
                <Text style={{ fontFamily: 'IBMPlexMono_400Regular', fontSize: 11, color: COLORS.muted }}> +{count - 8}</Text>
              )}
            </View>
          </View>
        ))}
        {cities.length > 6 && (
          <Text style={{ marginTop: 10, fontFamily: 'IBMPlexMono_400Regular', fontSize: 11, color: COLORS.muted }}>
            + {cities.length - 6} more {cities.length - 6 === 1 ? 'city' : 'cities'}
          </Text>
        )}
      </View>

      <Text style={{ marginTop: 20, fontFamily: 'IBMPlexMono_400Regular', fontSize: 11, color: 'rgba(23,21,15,0.4)' }}>
        stamped with Whim ✦ swipe. save. go.
      </Text>
    </View>
  );
}
