import Constants, { ExecutionEnvironment } from 'expo-constants';
import Mapbox from '@rnmapbox/maps';

// @rnmapbox/maps is a native module — calling into it inside Expo Go (which
// doesn't include the native side) crashes the app. We only set the token in a
// real dev/release build. The pk.… token is safe to ship; it just renders maps.
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!inExpoGo) {
  Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? null);
}

export default Mapbox;
export const { MapView, Camera, ShapeSource, LineLayer, PointAnnotation } = Mapbox;
