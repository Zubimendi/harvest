import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { colors } from './tokens';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  tokens: typeof colors.light | typeof colors.dark;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
  tokens: colors.light,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem('harvest_theme').then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeState(stored as Theme);
      }
    });
  }, []);

  useEffect(() => {
    const nextDark =
      theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark';
    setIsDark(nextDark);

    // Drive NativeWind `dark:` variants (requires darkMode: 'class' in tailwind.config)
    try {
      colorScheme.set(theme);
    } catch (e) {
      console.warn('[theme] setColorScheme failed', e);
    }

    // Keep RN Appearance in sync for StatusBar / system components
    if (theme === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(theme);
    }
  }, [theme, systemColorScheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    AsyncStorage.setItem('harvest_theme', newTheme);
  };

  const tokens = isDark ? colors.dark : colors.light;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
