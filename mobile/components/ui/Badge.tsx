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
      bgClass = 'bg-[#6B8F71]/20';
      textClass = 'text-accent-sage dark:text-accent-sage-dark';
      break;
    case 'warning':
      bgClass = 'bg-[#D68C2A]/20';
      textClass = 'text-accent-amber dark:text-accent-amber-dark';
      break;
    case 'error':
      bgClass = 'bg-[#B3462C]/20';
      textClass = 'text-accent-error dark:text-accent-error-dark';
      break;
    case 'info':
      bgClass = 'bg-[#7A93A3]/20';
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
