import { Tabs } from 'expo-router';
import GlassNav from '@/components/GlassNav';

// The five main screens are a Tabs navigator (not a Stack). Tab screens mount
// ONCE and stay alive — switching tabs shows/hides them instead of tearing each
// screen (and its native Mapbox map) down and rebuilding it on every switch,
// which was leaking GL contexts and freezing the app over time.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <GlassNav {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="hitlist" />
      <Tabs.Screen name="itinerary" />
      <Tabs.Screen name="community" />
      <Tabs.Screen name="passport" />
    </Tabs>
  );
}
