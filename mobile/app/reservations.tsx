import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, ShoppingBag } from 'lucide-react-native';
import { useQuery } from '@apollo/client/react';
import { MY_RESERVATIONS_QUERY } from '../lib/graphql/queries';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../lib/theme';
import { getErrorMessage } from '../lib/errors';

type Reservation = {
  id: string;
  title: string;
  category: string;
  photos: string[];
  quantity?: string | null;
  status: 'ACTIVE' | 'RESERVED' | 'PICKED_UP' | 'EXPIRED' | 'CANCELLED';
  pickupWindowEnd: string;
  updatedAt: string;
  owner: { id: string; displayName: string };
};

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  RESERVED: { label: 'Reserved', variant: 'warning' },
  PICKED_UP: { label: 'Picked up', variant: 'success' },
  EXPIRED: { label: 'Expired', variant: 'error' },
  CANCELLED: { label: 'Cancelled', variant: 'error' },
  ACTIVE: { label: 'Active', variant: 'info' },
};

function formatPickupEnd(iso: string) {
  const end = new Date(iso);
  const now = new Date();
  const sameDay = end.toDateString() === now.toDateString();
  const time = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today ${time}`;
  return `${end.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
}

export default function ReservationsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  const { data, loading, error, refetch } = useQuery<{ myReservations: Reservation[] }>(
    MY_RESERVATIONS_QUERY,
    { fetchPolicy: 'cache-and-network' },
  );

  const reservations: Reservation[] = data?.myReservations || [];

  const activeCount = reservations.filter((r) => r.status === 'RESERVED').length;
  const pickedUpCount = reservations.filter((r) => r.status === 'PICKED_UP').length;
  const endingSoon = reservations.filter(
    (r) =>
      r.status === 'RESERVED' &&
      new Date(r.pickupWindowEnd).getTime() - Date.now() < 2 * 60 * 60 * 1000 &&
      new Date(r.pickupWindowEnd).getTime() > Date.now(),
  ).length;

  const metrics = [
    { label: 'Total', value: reservations.length },
    { label: 'To pick up', value: activeCount },
    { label: 'Completed', value: pickedUpCount },
    { label: 'Ending soon', value: endingSoon },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="flex-row items-center px-4 pt-2 pb-3 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <ArrowLeft size={24} color={tokens.textPrimary} />
        </TouchableOpacity>
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark">
          Your reservations
        </Text>
      </View>

      {loading && !data && !error ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C1502E" />
        </View>
      ) : error && !data ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="font-display text-xl text-accent-error mb-2">Couldn’t load reservations</Text>
          <Text className="font-body text-text-secondary text-center mb-4">{getErrorMessage(error)}</Text>
          <Pressable onPress={() => refetch()} className="bg-brand px-5 py-3 rounded-btn">
            <Text className="font-body font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 48, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
          ListHeaderComponent={
            <View className="flex-row gap-2 mb-4">
              {metrics.map((m) => (
                <View
                  key={m.label}
                  className="flex-1 bg-surface dark:bg-surface-dark rounded-card border border-border dark:border-border-dark items-center py-3"
                >
                  <Text className="font-display text-2xl text-brand dark:text-brand-dark">{m.value}</Text>
                  <Text className="font-body text-[11px] text-text-secondary dark:text-text-secondary-dark mt-0.5">
                    {m.label}
                  </Text>
                </View>
              ))}
            </View>
          }
          ListEmptyComponent={() => (
            <View className="items-center px-8 mt-16">
              <ShoppingBag size={40} color={tokens.textSecondary} />
              <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mt-4 mb-2 text-center">
                No reservations yet
              </Text>
              <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center mb-6">
                Reserve a listing near you and it will show up here with its pickup status.
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/browse')}
                className="bg-brand px-5 py-3 rounded-btn"
                accessibilityRole="button"
              >
                <Text className="font-body font-bold text-white">Browse listings</Text>
              </Pressable>
            </View>
          )}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.ACTIVE;
            return (
              <TouchableOpacity
                className="flex-row bg-surface dark:bg-surface-dark rounded-card border border-border dark:border-border-dark mb-3 overflow-hidden"
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <Image
                  source={{ uri: item.photos?.[0] || 'https://via.placeholder.com/200' }}
                  className="w-24 h-full bg-surface-alt"
                  resizeMode="cover"
                />
                <View className="flex-1 p-3">
                  <View className="flex-row justify-between items-start mb-1">
                    <Text
                      className="font-body font-bold text-text-primary dark:text-text-primary-dark flex-1 mr-2"
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Badge label={meta.label} variant={meta.variant} />
                  </View>
                  <Text className="font-body text-xs text-text-secondary dark:text-text-secondary-dark mb-2">
                    From {item.owner.displayName}
                    {item.quantity ? ` • ${item.quantity}` : ''}
                  </Text>
                  <View className="flex-row items-center">
                    <Clock size={14} color={tokens.textSecondary} />
                    <Text className="font-body text-xs text-text-secondary dark:text-text-secondary-dark ml-1">
                      {item.status === 'RESERVED'
                        ? `Pick up by ${formatPickupEnd(item.pickupWindowEnd)}`
                        : `Updated ${formatPickupEnd(item.updatedAt)}`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
