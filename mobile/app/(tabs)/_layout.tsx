import { View, Text, Pressable, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, Search, MessageSquare, User, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '../../lib/theme';

const ICONS: Record<string, typeof Home> = {
  index: Home,
  browse: Search,
  messages: MessageSquare,
  profile: User,
};

function HarvestTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tokens } = useTheme();
  const bottom = Math.max(insets.bottom, 12);

  return (
    <View style={{ position: 'absolute', left: 16, right: 16, bottom }} pointerEvents="box-none">
      <View
        className="flex-row items-end bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-[22px] px-1 pt-2 pb-2"
        style={{
          shadowColor: '#2B231D',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = options.title ?? route.name;
          const color = focused ? tokens.brand : tokens.textSecondary;
          const Icon = ICONS[route.name] ?? Home;

          const tabButton = (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              className="flex-1 items-center justify-center py-1"
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              style={({ pressed }) => ({
                opacity: pressed ? 0.75 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Icon size={22} color={color} strokeWidth={focused ? 2.25 : 1.75} />
              <Text
                className="font-body text-[10px] mt-1"
                style={{ color, fontWeight: focused ? '600' : '500' }}
              >
                {label}
              </Text>
            </Pressable>
          );

          if (route.name === 'browse') {
            return (
              <View key={route.key} className="flex-[2] flex-row items-end">
                {tabButton}
                <Pressable
                  onPress={() => router.push('/post')}
                  className="w-14 h-14 rounded-full bg-brand items-center justify-center mx-1 mb-0.5"
                  style={{
                    shadowColor: '#C1502E',
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 6,
                    transform: [{ translateY: -10 }],
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Post listing"
                >
                  <Plus size={28} color="#FFFFFF" strokeWidth={2.25} />
                </Pressable>
              </View>
            );
          }

          return tabButton;
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { tokens } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <HarvestTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: tokens.bg,
          paddingBottom: Platform.OS === 'ios' ? 100 : 92,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="messages" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="profile" options={{ title: 'You' }} />
    </Tabs>
  );
}
