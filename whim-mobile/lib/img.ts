// Downsize a stored photo URL to the size it's actually shown at. Loading a
// ~940px Pexels image into a 100px thumbnail wastes ~10× the memory — the main
// RAM drain on older iPhones. Pexels serves any width via query params, so we
// rewrite them; other hosts pass through unchanged.
export function sizedPhoto(url: string | null | undefined, displayWidth: number): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  if (!url.includes('pexels.com')) return url;
  const w = Math.round(displayWidth * 2); // 2× for retina
  const base = url.split('?')[0];
  return `${base}?auto=compress&cs=tinysrgb&dpr=1&w=${w}`;
}
