import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Badge } from './ui/Badge';

interface ListingCardProps {
  title: string;
  category: string;
  distance: string;
  pickupWindow: string;
  imageUrl?: string;
  onPress?: () => void;
}

export function ListingCard({ title, category, distance, pickupWindow, imageUrl, onPress }: ListingCardProps) {
  return (
    <TouchableOpacity 
      className="bg-surface dark:bg-surface-dark rounded-card overflow-hidden border border-border dark:border-border-dark mb-4"
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image 
        source={{ uri: imageUrl || 'https://via.placeholder.com/400x300' }} 
        className="w-full h-40 bg-surface-alt dark:bg-surface-alt-dark"
      />
      <View className="p-4">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-text-secondary dark:text-text-secondary-dark text-[11px] font-body uppercase tracking-wider mb-1">
            {category}
          </Text>
          <Badge label="Free" variant="success" />
        </View>
        <Text className="text-text-primary dark:text-text-primary-dark font-display text-xl mb-2" numberOfLines={2}>
          {title}
        </Text>
        <Text className="text-text-secondary dark:text-text-secondary-dark font-body text-sm">
          {distance} • {pickupWindow}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
