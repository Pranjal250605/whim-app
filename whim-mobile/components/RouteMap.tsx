import { Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Mapbox, { Camera, LineLayer, MapView, PointAnnotation, ShapeSource } from '@/lib/mapbox';
import type { RouteStop } from '@/lib/route';

// @rnmapbox/maps is a NATIVE module: it renders only in a custom dev build
// (expo run:ios) or a release build, NOT in Expo Go. We detect Expo Go and
// show a graceful placeholder there so the itinerary screen never red-screens.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface RouteMapProps {
  stops: RouteStop[];
  height?: number;
}

export default function RouteMap({ stops, height = 280 }: RouteMapProps) {
  if (stops.length === 0) {
    return (
      <View className="items-center justify-center bg-[#ECEBE7]" style={{ height }}>
        <Text className="text-[13px] text-muted">Save a few spots to see your route.</Text>
      </View>
    );
  }

  if (inExpoGo) {
    return (
      <View className="items-center justify-center gap-1 bg-[#ECEBE7]" style={{ height }}>
        <Text className="font-serif text-base text-ink">🗺️ Map preview</Text>
        <Text className="px-8 text-center text-[12px] text-muted">
          The live Mapbox map renders in the dev build (expo run:ios), not in Expo Go.
        </Text>
      </View>
    );
  }

  const coords = stops.map((s) => [s.lng, s.lat] as [number, number]);

  const routeLine = {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: coords },
    properties: {},
  };

  // bounds to frame all stops
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const bounds = {
    ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
    sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
    paddingTop: 60,
    paddingBottom: 60,
    paddingLeft: 60,
    paddingRight: 60,
  };

  return (
    <View style={{ height }}>
      <MapView style={{ flex: 1 }} styleURL={Mapbox.StyleURL.Light} scaleBarEnabled={false} logoEnabled={false}>
        <Camera
          defaultSettings={
            stops.length === 1
              ? { centerCoordinate: coords[0], zoomLevel: 13 }
              : { bounds }
          }
          animationDuration={0}
        />

        {stops.length > 1 && (
          <ShapeSource id="route" shape={routeLine}>
            <LineLayer
              id="routeLine"
              style={{
                lineColor: '#D97757',
                lineWidth: 3,
                lineCap: 'round',
                lineJoin: 'round',
                lineDasharray: [2, 2],
              }}
            />
          </ShapeSource>
        )}

        {stops.map((s) => (
          <PointAnnotation key={s.id} id={s.id} coordinate={[s.lng, s.lat]}>
            <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-accent shadow">
              <Text className="text-[12px] font-bold text-white">{s.order}</Text>
            </View>
          </PointAnnotation>
        ))}
      </MapView>
    </View>
  );
}
