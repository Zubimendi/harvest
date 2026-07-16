import { View, Text, ScrollView, TouchableOpacity, Switch, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User as UserIcon, LogOut, Trash2, Bell, MapPin, Moon } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../lib/auth';
import { useLocation } from '../../hooks/useLocation';
import { useTheme } from '../../lib/theme';

type AppearanceOption = 'light' | 'dark' | 'system';

const APPEARANCE: { value: AppearanceOption; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function ProfileTab() {
  const { user, isDemo, signOut } = useAuth();
  const { radiusKm, updateRadius } = useLocation();
  const { theme, setTheme, tokens } = useTheme();

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="px-4 pt-2 pb-3 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark">
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark">You</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="items-center px-6 py-8 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
          <View className="w-24 h-24 rounded-full bg-surface-alt items-center justify-center mb-4 overflow-hidden border-2 border-accent-sage/40">
            <UserIcon size={40} color={tokens.textSecondary} />
          </View>
          <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-1">
            {user?.displayName || 'Neighbor'}
          </Text>
          {isDemo && (
            <Text className="font-body text-xs uppercase tracking-wider text-accent-sage mb-2">
              Demo session
            </Text>
          )}
          <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center mt-1">
            {user?.email || 'Sharing surplus on Harvest'}
          </Text>
          <View className="mt-4 w-full">
            <Button label="Edit profile" variant="secondary" />
          </View>
        </View>

        <View className="py-6">
          <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mb-2 px-4">
            Preferences
          </Text>

          <View className="bg-surface dark:bg-surface-dark border-t border-b border-border dark:border-border-dark mx-4 rounded-card overflow-hidden border">
            <View className="p-4 border-b border-border dark:border-border-dark">
              <View className="flex-row items-center mb-3">
                <Moon size={20} color={tokens.textSecondary} />
                <Text className="font-body text-text-primary dark:text-text-primary-dark ml-3">
                  Appearance
                </Text>
              </View>
              <View className="flex-row gap-2">
                {APPEARANCE.map((opt) => {
                  const selected = theme === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setTheme(opt.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      className="flex-1 py-2.5 rounded-btn items-center border"
                      style={{
                        backgroundColor: selected ? tokens.brand : tokens.surfaceAlt,
                        borderColor: selected ? tokens.brand : tokens.border,
                      }}
                    >
                      <Text
                        className="font-body text-sm font-semibold"
                        style={{ color: selected ? '#FFFFFF' : tokens.textPrimary }}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="flex-row items-center justify-between p-4 border-b border-border dark:border-border-dark">
              <View className="flex-row items-center flex-1">
                <MapPin size={20} color={tokens.textSecondary} />
                <View className="ml-3">
                  <Text className="font-body text-text-primary dark:text-text-primary-dark">Search radius</Text>
                  <Text className="font-body text-text-secondary text-xs">{radiusKm} km</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => updateRadius(Math.max(1, radiusKm - 5))}
                  className="w-8 h-8 rounded-full bg-surface-alt items-center justify-center"
                >
                  <Text className="font-body font-bold text-text-primary">−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateRadius(radiusKm + 5)}
                  className="w-8 h-8 rounded-full bg-surface-alt items-center justify-center"
                >
                  <Text className="font-body font-bold text-text-primary">+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Bell size={20} color={tokens.textSecondary} />
                <Text className="font-body text-text-primary dark:text-text-primary-dark ml-3">
                  Push notifications
                </Text>
              </View>
              <Switch value trackColor={{ true: tokens.brand }} />
            </View>
          </View>
        </View>

        <View className="px-4 mb-8">
          <View className="bg-surface dark:bg-surface-dark rounded-card border border-border dark:border-border-dark overflow-hidden">
            <TouchableOpacity className="flex-row items-center p-4 border-b border-border dark:border-border-dark" onPress={handleSignOut}>
              <LogOut size={20} color={tokens.textSecondary} />
              <Text className="font-body text-text-primary dark:text-text-primary-dark ml-3">Sign out</Text>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center p-4">
              <Trash2 size={20} color={tokens.accentError} />
              <Text className="font-body text-accent-error dark:text-accent-error-dark ml-3">Delete account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
