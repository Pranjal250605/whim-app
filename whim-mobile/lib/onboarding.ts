import AsyncStorage from '@react-native-async-storage/async-storage';

// First-run flag. Lives outside auth so existing signed-in users never see
// the intro, and a signed-out fresh install sees it exactly once.
const KEY = 'whim.onboarded';

export async function getOnboarded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY)) === '1';
  } catch {
    return true; // storage broken → don't trap the user in onboarding
  }
}

export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, '1');
  } catch {
    // non-fatal — worst case the intro shows again next launch
  }
}
