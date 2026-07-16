import { useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { useQuery } from '@apollo/client';
import { NEARBY_LISTINGS_QUERY } from '../../lib/graphql/queries';
import { useLocation } from '../../hooks/useLocation';

const CATEGORIES = ['All', 'PRODUCE', 'BAKED_GOODS', 'PANTRY', 'COOKED_MEAL', 'DAIRY_EGGS', 'OTHER'];

export default function BrowseScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const router = useRouter();
  const { location, radiusKm } = useLocation();

  const { data, loading, refetch } = useQuery(NEARBY_LISTINGS_QUERY, {
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
    const d = R * c;
    return `${d.toFixed(1)} km`;
  };

  const getRelativeTime = (isoString: string) => {
    const end = new Date(isoString).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.floor((end - now) / (1000 * 60 * 60)));
    if (diffHours === 0) return 'Ends soon';
    return `Ends in ${diffHours}h`;
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 py-2 bg-bg dark:bg-bg-dark z-10 border-b border-border dark:border-border-dark">
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-4">Browse</Text>
        
        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              className={`mr-2 px-4 py-2 rounded-pill ${
                activeCategory === cat 
                  ? 'bg-brand dark:bg-brand-dark border border-brand dark:border-brand-dark' 
                  : 'bg-surface border border-border dark:bg-surface-dark dark:border-border-dark'
              }`}
            >
              <Text className={`font-body ${
                activeCategory === cat 
                  ? 'text-white font-bold' 
                  : 'text-text-secondary dark:text-text-secondary-dark'
              }`}>
                {cat.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!location ? (
        <View className="flex-1 justify-center items-center px-8">
          <ActivityIndicator size="large" color="#C1502E" className="mb-4" />
          <Text className="font-body text-text-secondary text-center">Finding your location...</Text>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
          ListEmptyComponent={() => (
            !loading ? (
              <View className="flex-1 justify-center items-center px-8 mt-20">
                <View className="w-24 h-24 mb-6 border-2 border-brand/50 rounded-full items-center justify-center opacity-80">
                  <Text className="font-display text-brand text-4xl">?</Text>
                </View>
                <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mb-2 text-center">
                  No listings found
                </Text>
                <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center">
                  There are no active listings matching "{activeCategory}" right now. Check back later or adjust your radius.
                </Text>
              </View>
            ) : null
          )}
          renderItem={({ item }) => (
            <ListingCard 
              title={item.title}
              category={item.category}
              distance={formatDistance(location.coords.latitude, location.coords.longitude, item.displayLocation.latitude, item.displayLocation.longitude)}
              pickupWindow={getRelativeTime(item.pickupWindowEnd)}
              imageUrl={item.photos?.[0]}
              onPress={() => router.push(`/listing/${item.id}`)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
