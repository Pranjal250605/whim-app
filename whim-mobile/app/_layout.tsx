import '../global.css';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { AuthProvider, useAuth } from '@/lib/auth';
import ToastHost from '@/components/Toast';
import '@/lib/mapbox'; // sets the Mapbox access token once at startup

// Redirects between the app and the sign-in screen based on auth state.
function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Tapping a local reminder deep-links to the route it points at. Only routes
  // on this allowlist are followed — if we ever add remote push, a spoofed
  // payload must not be able to navigate anywhere else.
  useEffect(() => {
    const allowedRoutes = new Set(['/', '/swipe', '/hitlist', '/itinerary', '/passport', '/notifications']);
    const sub = Notifications.addNotificationResponseReceivedListener((res) => {
      const route = res.notification.request.content.data?.route;
      if (typeof route === 'string' && allowedRoutes.has(route)) router.push(route as never);
    });
    return () => sub.remove();
  }, []);

  // Where the user was headed when the gate intercepted them — so an invite
  // deep link (whim://room/…) survives the sign-in round-trip.
  const pendingRoute = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const inAuthScreen = segments[0] === 'sign-in';
    if (!session && !inAuthScreen) {
      pendingRoute.current = '/' + segments.join('/');
      router.replace('/sign-in'); // logged out → gate
    } else if (session && inAuthScreen) {
      const target = pendingRoute.current ?? '/';
      pendingRoute.current = null;
      router.replace(target as never); // resume where they were headed
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color="#2740E0" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F0EEE8' },
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    IBMPlexMono_400Regular,
  });

  // hold on the canvas colour until the editorial fonts are ready (no flash)
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#F0EEE8' }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <AuthProvider>
            <RootNavigator />
            <ToastHost />
          </AuthProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
