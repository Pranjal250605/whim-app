import { useCallback, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Mapbox, { Camera, LineLayer, MapView, PointAnnotation, ShapeSource } from '@/lib/mapbox';
import type { RouteStop } from '@/lib/route';

// @rnmapbox/maps is a NATIVE module: it renders only in a custom dev build, not
// in Expo Go. We detect Expo Go and show a graceful placeholder there.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface RouteMapProps {
  stops: RouteStop[];
  height?: number;
}

export default function RouteMap({ stops, height = 280 }: RouteMapProps) {
  const cameraRef = useRef<any>(null);

  const coords = stops.map((s) => [s.lng, s.lat] as [number, number]);
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);

  // Frame the route: a single stop centers + zooms; multiple stops fit the
  // bounding box with padding (extra at the bottom so pins clear the timeline).
  const fitCamera = useCallback(() => {
    if (!cameraRef.current || coords.length === 0) return;
    if (coords.length === 1) {
      cameraRef.current.setCamera({ centerCoordinate: coords[0], zoomLevel: 14, animationDuration: 600 });
      return;
    }
    cameraRef.current.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      [50, 40, 90, 40], // [top, right, bottom, left]
      600,
    );
  }, [coords, lngs, lats]);

  useEffect(() => {
    fitCamera();
  }, [fitCamera]);

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

  const routeLine = {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: coords },
    properties: {},
  };

  return (
    <View style={{ height }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={Mapbox.StyleURL.Light}
        scaleBarEnabled={false}
        logoEnabled={false}
        onDidFinishLoadingMap={fitCamera}
      >
        <Camera ref={cameraRef} defaultSettings={{ centerCoordinate: coords[0], zoomLevel: 11 }} />

        {stops.length > 1 && (
          <ShapeSource id="route" shape={routeLine}>
            <LineLayer
              id="routeLine"
              style={{ lineColor: '#D97757', lineWidth: 3, lineCap: 'round', lineJoin: 'round', lineDasharray: [2, 2] }}
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
