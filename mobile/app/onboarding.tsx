import { View, Text, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../components/ui/Button';
import { useLocation } from '../hooks/useLocation';

export default function OnboardingScreen() {
  const router = useRouter();
  const { requestPermissionAndGetLocation } = useLocation();

  const handleContinue = async () => {
    await requestPermissionAndGetLocation();
    router.push('/auth');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-1 justify-center items-center px-6">
        <Image
          source={require('../assets/logo.png')}
          accessibilityLabel="Harvest"
          className="w-40 h-40 mb-12"
          resizeMode="contain"
        />
        <Text className="font-display text-4xl text-text-primary dark:text-text-primary-dark text-center leading-[44px] mb-4">
          Share more, waste less.
        </Text>
        <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center text-lg px-4 mb-12">
          Discover surplus food from neighbors and local businesses nearby.
        </Text>
      </View>

      <View className="px-6 pb-12">
        <Button
          label="Enable Location & Continue"
          onPress={handleContinue}
        />
        <Button
          label="Already have an account? Sign In"
          variant="ghost"
          className="mt-2"
          onPress={() => router.push('/auth')}
        />
      </View>
    </SafeAreaView>
  );
}
