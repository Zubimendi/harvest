import { View, Text } from 'react-native';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center px-8 py-12">
      <View className="w-24 h-24 mb-6 border-2 border-brand dark:border-brand-dark rounded-full items-center justify-center opacity-80">
        <Text className="font-display text-brand text-4xl">?</Text>
      </View>
      <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-3 text-center">
        {title}
      </Text>
      <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center leading-6 mb-8">
        {description}
      </Text>
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} />
      )}
    </View>
  );
}
