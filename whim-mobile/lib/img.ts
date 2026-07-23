import { PixelRatio } from 'react-native';

// Downsize a stored photo URL to the size it's actually shown at — but at the
// device's real pixel density, so it stays crisp (never pixelated) while still
// loading far less than a full-res image. A 130px thumb on a 3× phone loads a
// 390px image, not the original ~940px: sharp, and ~6× less memory.
//
// Pexels serves any width via query params; other hosts pass through unchanged.
export function sizedPhoto(url: string | null | undefined, displayWidth: number): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  if (!url.includes('pexels.com')) return url;
  const dpr = Math.min(PixelRatio.get(), 3); // match the screen (2× / 3×), capped
  const w = Math.round(displayWidth * dpr);
  const base = url.split('?')[0];
  return `${base}?auto=compress&cs=tinysrgb&w=${w}`;
}
