import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { sizedPhoto } from '@/lib/img';

// Renders a spot's photo as an absolute-fill image behind whatever overlays the
// parent draws (tags, stamps). If there's no real URL yet, it renders nothing
// and the parent's `tone` background shows through as the placeholder.
//
// `width` is the pixel width the image is displayed at — pass it so we can load
// a right-sized image instead of a full-res one (big memory win on old iPhones).
export default function SpotImage({ uri, width = 400 }: { uri?: string | null; width?: number }) {
  const src = sizedPhoto(uri, width);
  if (!src) return null;
  return (
    <Image
      source={src}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
      recyclingKey={uri}
    />
  );
}
