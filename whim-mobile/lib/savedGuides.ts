import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (userId: string) => `bewhim:saved-guides:v1:${userId}`;
const pending = new Map<string, Promise<unknown>>();

export async function readSavedGuides(userId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string')) throw new Error('Couldn’t read saved guides.');
  return [...new Set(value as string[])];
}

// Serialize writes per account so saving two guides cannot lose one of them.
export async function toggleSavedGuide(userId: string, guideId: string): Promise<string[]> {
  if (!userId || !guideId) throw new Error('Sign in to save a guide.');
  const previous = pending.get(userId) ?? Promise.resolve();
  const write = previous.catch(() => {}).then(async () => {
    const ids = await readSavedGuides(userId);
    const next = ids.includes(guideId) ? ids.filter(id => id !== guideId) : [...ids, guideId];
    await AsyncStorage.setItem(key(userId), JSON.stringify(next));
    return next;
  });
  pending.set(userId, write);
  try { return await write; }
  finally { if (pending.get(userId) === write) pending.delete(userId); }
}
