import { Text, View } from 'react-native';
import type { RouteStop } from '@/lib/route';

// A branded, screenshot-ready card of a day plan. Rendered off-screen and
// captured with react-native-view-shot, then shared.
export default function ShareCard({ city, vibeLabel, stops }: { city: string; vibeLabel: string; stops: RouteStop[] }) {
  return (
    <View style={{ width: 380, backgroundColor: '#F0EEE8', paddingHorizontal: 30, paddingVertical: 34 }}>
      <Text style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 24, color: '#17150F', letterSpacing: -0.5 }}>Whim</Text>

      <Text style={{ marginTop: 22, fontFamily: 'IBMPlexMono_400Regular', color: '#2740E0', fontSize: 11.5, letterSpacing: 2.4 }}>MY DAY IN</Text>
      <Text style={{ fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 46, color: '#17150F', lineHeight: 48, marginTop: 2, letterSpacing: -1 }}>{city}</Text>
      <Text style={{ marginTop: 6, color: '#7C766A', fontSize: 15 }}>
        {vibeLabel} · {stops.length} stops
      </Text>

      <View style={{ marginTop: 24 }}>
        {stops.map((s) => (
          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#2740E0', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{s.order}</Text>
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={{ fontFamily: 'BricolageGrotesque_700Bold', fontSize: 18, color: '#17150F' }}>{s.title}</Text>
              <Text style={{ color: '#7C766A', fontSize: 12.5, marginTop: 1 }}>
                {s.kind}
                {s.bestTime ? ` · ${s.bestTime}` : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={{ marginTop: 14, fontFamily: 'IBMPlexMono_400Regular', fontSize: 11, color: 'rgba(23,21,15,0.4)' }}>
        planned with Whim ✦ swipe. save. go.
      </Text>
    </View>
  );
}
