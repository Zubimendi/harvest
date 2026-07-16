import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  let bgClass = 'bg-surface-alt dark:bg-surface-alt-dark';
  let textClass = 'text-text-primary dark:text-text-primary-dark';

  switch (variant) {
    case 'success':
      bgClass = 'bg-accent-sage dark:bg-accent-sage-dark opacity-20';
      textClass = 'text-accent-sage dark:text-accent-sage-dark';
      break;
    case 'warning':
      bgClass = 'bg-accent-amber dark:bg-accent-amber-dark opacity-20';
      textClass = 'text-accent-amber dark:text-accent-amber-dark';
      break;
    case 'error':
      bgClass = 'bg-accent-error dark:bg-accent-error-dark opacity-20';
      textClass = 'text-accent-error dark:text-accent-error-dark';
      break;
    case 'info':
      bgClass = 'bg-accent-info opacity-20';
      textClass = 'text-accent-info';
      break;
  }

  return (
    <View className={`px-2 py-1 rounded-pill ${bgClass}`}>
      <Text className={`text-xs font-body font-bold uppercase tracking-wider ${textClass}`}>
        {label}
      </Text>
    </View>
  );
}
