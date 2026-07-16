import { Stack, useRouter, useSegments } from 'expo-router';
import { ApolloProvider } from '@apollo/client';
import { client } from '../lib/apollo';
import { AuthProvider, useAuth } from '../lib/auth';
import { ThemeProvider } from '../lib/theme';
import { useEffect } from 'react';

function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth' || segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      // Redirect to onboarding if not signed in and not in auth group
      // For MVP, we go to onboarding first
      router.replace('/onboarding');
    } else if (session && inAuthGroup) {
      // Redirect to tabs if signed in and in auth group
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="post" options={{ presentation: 'modal' }} />
      <Stack.Screen name="listing/[id]" />
      <Stack.Screen name="profile/[id]" />
      <Stack.Screen name="conversation/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ApolloProvider client={client}>
          <RootNavigation />
        </ApolloProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
