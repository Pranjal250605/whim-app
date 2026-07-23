import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { sizedPhoto } from '@/lib/img';
import { placePhotoSource } from '@/lib/placePhoto';

// Renders a spot's photo behind the parent's overlays. Prefers the real Google
// place photo (via the cached proxy) when the spot has a place_id; otherwise
// falls back to the stock (Pexels) photo, downsized to the display width. If
// neither is available it renders nothing and the parent's `tone` shows through.
//
// `width` is the pixel width it's shown at, so we load a right-sized image.
export default function SpotImage({ uri, placeId, width = 400 }: { uri?: string | null; placeId?: string; width?: number }) {
  const google = placeId ? placePhotoSource({ placeId, w: width }) : null;
  const stock = sizedPhoto(uri, width);
  const source = google ?? (stock ? stock : null);
  if (!source) return null;
  return (
    <Image
      source={source}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
      recyclingKey={placeId ?? uri}
    />
  );
}
