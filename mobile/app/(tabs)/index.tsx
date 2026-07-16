import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { Map, List } from 'lucide-react-native';
import { useQuery } from '@apollo/client';
import { NEARBY_LISTINGS_QUERY } from '../../lib/graphql/queries';
import { useLocation } from '../../hooks/useLocation';
import Mapbox from '@rnmapbox/maps';

// Set access token if available in env, otherwise map will show a warning/error or not render tiles.
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.ey...mock_token_for_mvp');

export default function HomeScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const router = useRouter();
  const { location, radiusKm } = useLocation();

  const { data, loading, error, refetch } = useQuery(NEARBY_LISTINGS_QUERY, {
    variables: {
      latitude: location?.coords.latitude || 0,
      longitude: location?.coords.longitude || 0,
      radiusKm,
    },
    skip: !location,
    fetchPolicy: 'cache-and-network',
  });

  const listings = data?.nearbyListings || [];

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Haversine formula
    const R = 6371; // km
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
      {/* Header & Toggle */}
      <View className="flex-row justify-between items-center px-4 py-2 border-b border-border dark:border-border-dark z-10 bg-bg dark:bg-bg-dark">
        <Text className="font-display text-2xl text-brand dark:text-brand-dark">Harvest</Text>
        <View className="flex-row bg-surface-alt dark:bg-surface-alt-dark rounded-pill p-1">
          <TouchableOpacity 
            className={`p-2 rounded-pill ${viewMode === 'map' ? 'bg-surface dark:bg-surface-dark shadow-sm' : ''}`}
            onPress={() => setViewMode('map')}
          >
            <Map size={20} color={viewMode === 'map' ? '#C1502E' : '#6B5F55'} />
          </TouchableOpacity>
          <TouchableOpacity 
            className={`p-2 rounded-pill ${viewMode === 'list' ? 'bg-surface dark:bg-surface-dark shadow-sm' : ''}`}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? '#C1502E' : '#6B5F55'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1">
        {!location ? (
          <View className="flex-1 justify-center items-center px-8">
            <ActivityIndicator size="large" color="#C1502E" className="mb-4" />
            <Text className="font-body text-text-secondary text-center">Finding your location...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-8">
            <Text className="font-display text-xl text-accent-error mb-2">Oops</Text>
            <Text className="font-body text-text-secondary text-center mb-4">{error.message}</Text>
            <TouchableOpacity onPress={() => refetch()} className="bg-surface-alt px-4 py-2 rounded-btn">
              <Text className="font-body font-bold text-text-primary">Retry</Text>
            </TouchableOpacity>
          </View>
        ) : viewMode === 'map' ? (
          <View className="flex-1">
            <Mapbox.MapView style={{ flex: 1 }} logoEnabled={false} compassEnabled={false}>
              <Mapbox.Camera
                zoomLevel={12}
                centerCoordinate={[location.coords.longitude, location.coords.latitude]}
                animationMode="flyTo"
                animationDuration={2000}
              />
              {/* User location dot */}
              <Mapbox.PointAnnotation
                id="user-location"
                coordinate={[location.coords.longitude, location.coords.latitude]}
              >
                <View className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
              </Mapbox.PointAnnotation>
              
              {/* Listing pins */}
              {listings.map((item: any) => (
                <Mapbox.PointAnnotation
                  key={item.id}
                  id={`pin-${item.id}`}
                  coordinate={[item.displayLocation.longitude, item.displayLocation.latitude]}
                  onSelected={() => router.push(`/listing/${item.id}`)}
                >
                  <View className="bg-brand rounded-full w-8 h-8 items-center justify-center border-2 border-white shadow-sm">
                    <Text className="text-white text-xs font-bold">{item.photos?.length > 0 ? '1' : '+'}</Text>
                  </View>
                </Mapbox.PointAnnotation>
              ))}
            </Mapbox.MapView>
          </View>
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
            ListEmptyComponent={() => (
              !loading ? (
                <View className="py-20 items-center">
                  <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mb-2">No listings nearby</Text>
                  <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center">Be the first to share something in your area!</Text>
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
      </View>

      {/* FAB */}
      <TouchableOpacity 
        className="absolute bottom-6 right-6 w-14 h-14 bg-brand rounded-full items-center justify-center shadow-lg shadow-brand"
        onPress={() => router.push('/post')}
      >
        <Text className="text-white text-3xl leading-[32px] mt-[-2px]">+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
