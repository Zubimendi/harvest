import 'react-native-gesture-handler';
import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider } from '@apollo/client/react';
import { useFonts, Fraunces_600SemiBold, Fraunces_500Medium } from '@expo-google-fonts/fraunces';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { client } from '../lib/apollo';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider, useTheme } from '../lib/theme';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useEffect } from 'react';

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { isDark, tokens } = useTheme();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/onboarding');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: tokens.bg },
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="post" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="conversation/[id]" />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF6EF' }}>
        <ActivityIndicator size="large" color="#C1502E" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ApolloProvider client={client}>
            <RootNavigation />
          </ApolloProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
