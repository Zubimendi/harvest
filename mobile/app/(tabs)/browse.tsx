import { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { useQuery } from '@apollo/client/react';
import { NEARBY_LISTINGS_QUERY } from '../../lib/graphql/queries';
import { useLocation } from '../../hooks/useLocation';
import { useTheme } from '../../lib/theme';
import { getErrorMessage } from '../../lib/errors';

const CATEGORIES = ['All', 'PRODUCE', 'BAKED_GOODS', 'PANTRY', 'COOKED_MEAL', 'DAIRY_EGGS', 'OTHER'];

export default function BrowseScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const router = useRouter();
  const { location, radiusKm, errorMsg, requestPermissionAndGetLocation } = useLocation();
  const { tokens } = useTheme();

  const { data, loading, error, refetch } = useQuery(NEARBY_LISTINGS_QUERY, {
    variables: {
      latitude: location?.coords.latitude || 0,
      longitude: location?.coords.longitude || 0,
      radiusKm,
      category: activeCategory === 'All' ? null : activeCategory,
    },
    skip: !location,
    fetchPolicy: 'cache-and-network',
  });

  const listings = data?.nearbyListings || [];

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return `${(R * c).toFixed(1)} km`;
  };

  const getRelativeTime = (isoString: string) => {
    const end = new Date(isoString).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.floor((end - now) / (1000 * 60 * 60)));
    if (diffHours === 0) return 'Ends soon';
    return `Ends in ${diffHours}h`;
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="px-4 pt-2 pb-3 bg-bg dark:bg-bg-dark z-10 border-b border-border dark:border-border-dark">
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-3">Browse</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className="mr-2 px-4 py-2 rounded-pill border"
              style={{
                backgroundColor: activeCategory === cat ? tokens.brand : tokens.surface,
                borderColor: activeCategory === cat ? tokens.brand : tokens.border,
              }}
            >
              <Text
                className="font-body text-sm"
                style={{
                  color: activeCategory === cat ? '#FFFFFF' : tokens.textSecondary,
                  fontWeight: activeCategory === cat ? '700' : '400',
                }}
              >
                {cat === 'All' ? 'All' : cat.replace(/_/g, ' ').toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!location ? (
        <View className="flex-1 justify-center items-center px-8">
          <ActivityIndicator size="large" color="#C1502E" className="mb-4" />
          <Text className="font-body text-text-secondary text-center mb-2">Finding your location...</Text>
          {errorMsg ? (
            <>
              <Text className="font-body text-accent-error text-center mb-4">{errorMsg}</Text>
              <Pressable
                onPress={() => requestPermissionAndGetLocation()}
                className="bg-brand px-5 py-3 rounded-btn"
              >
                <Text className="font-body font-bold text-white">Try again</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : error && !data ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="font-display text-xl text-accent-error mb-2">Couldn’t load listings</Text>
          <Text className="font-body text-text-secondary text-center mb-4">{getErrorMessage(error)}</Text>
          <Pressable onPress={() => refetch()} className="bg-brand px-5 py-3 rounded-btn">
            <Text className="font-body font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
          ListEmptyComponent={() =>
            !loading ? (
              <View className="items-center px-8 mt-20">
                <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mb-2 text-center">
                  No listings found
                </Text>
                <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center">
                  Nothing matches this filter right now. Try another category or widen your radius.
                </Text>
              </View>
            ) : (
              <View className="items-center mt-20">
                <ActivityIndicator size="large" color="#C1502E" />
              </View>
            )
          }
          renderItem={({ item }) => (
            <ListingCard
              title={item.title}
              category={item.category}
              distance={formatDistance(
                location.coords.latitude,
                location.coords.longitude,
                item.displayLocation.latitude,
                item.displayLocation.longitude,
              )}
              pickupWindow={getRelativeTime(item.pickupWindowEnd)}
              imageUrl={item.photos?.[0]}
              suggestedDonation={item.suggestedDonation}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
