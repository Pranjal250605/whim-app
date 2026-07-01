import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Fraunces_600SemiBold, Fraunces_700Bold, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { AuthProvider, useAuth } from '@/lib/auth';
import '@/lib/mapbox'; // sets the Mapbox access token once at startup

// Redirects between the app and the sign-in screen based on auth state.
function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthScreen = segments[0] === 'sign-in';
    if (!session && !inAuthScreen) {
      router.replace('/sign-in'); // logged out → gate
    } else if (session && inAuthScreen) {
      router.replace('/'); // logged in but on sign-in → home
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#D97757" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F9F8F6' },
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Fraunces_900Black,
    IBMPlexMono_400Regular,
  });

  // hold on the canvas colour until the editorial fonts are ready (no flash)
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F9F8F6' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
