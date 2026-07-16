import { View, Text, Image, Pressable } from 'react-native';
import { Badge } from './ui/Badge';

interface ListingCardProps {
  title: string;
  category: string;
  distance: string;
  pickupWindow: string;
  imageUrl?: string;
  suggestedDonation?: string | null;
  onPress?: () => void;
}

function formatCategory(category: string) {
  return category.replace(/_/g, ' ').toLowerCase();
}

export function ListingCard({
  title,
  category,
  distance,
  pickupWindow,
  imageUrl,
  suggestedDonation,
  onPress,
}: ListingCardProps) {
  const isExpiringSoon = /soon|1h|2h|Ends in [12]h/i.test(pickupWindow);
  const isFree = !suggestedDonation;

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface dark:bg-surface-dark rounded-card overflow-hidden border border-border dark:border-border-dark mb-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.96 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: '#2B231D',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      })}
    >
      <View className="relative">
        <Image
          source={{ uri: imageUrl || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80' }}
          className="w-full h-44 bg-surface-alt dark:bg-surface-alt-dark"
        />
        <View className="absolute top-3 left-3 right-3 flex-row justify-between">
          <Badge label={isFree ? 'Free' : 'Donation'} variant={isFree ? 'success' : 'info'} />
          {isExpiringSoon && <Badge label="Ending soon" variant="warning" />}
        </View>
      </View>
      <View className="p-4">
        <Text className="text-text-secondary dark:text-text-secondary-dark text-[11px] font-body font-semibold uppercase tracking-[0.06em] mb-1">
          {formatCategory(category)}
        </Text>
        <Text
          className="text-text-primary dark:text-text-primary-dark font-display text-xl mb-2 leading-[26px]"
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text className="text-text-secondary dark:text-text-secondary-dark font-body text-sm">
          {distance} · {pickupWindow}
        </Text>
      </View>
    </Pressable>
  );
}
