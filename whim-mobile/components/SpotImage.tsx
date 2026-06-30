import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

// Renders a spot's photo as an absolute-fill image behind whatever overlays the
// parent draws (tags, stamps). If there's no real URL yet, it renders nothing
// and the parent's `tone` background shows through as the placeholder.
export default function SpotImage({ uri }: { uri?: string | null }) {
  if (!uri || !uri.startsWith('http')) return null;
  return (
    <Image
      source={uri}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      transition={300}
      cachePolicy="memory-disk"
    />
  );
}
