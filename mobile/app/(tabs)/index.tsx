import { useState } from 'react';
import { View, Text, Image, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { Map, List } from 'lucide-react-native';
import { useQuery } from '@apollo/client/react';
import { NEARBY_LISTINGS_QUERY } from '../../lib/graphql/queries';
import { useLocation } from '../../hooks/useLocation';
import { getMapbox, mapUnavailableReason } from '../../lib/mapbox';
import { useAuth } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { useTheme } from '../../lib/theme';

export default function HomeScreen() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('list');
  const router = useRouter();
  const { location, radiusKm } = useLocation();
  const { isDemo } = useAuth();
  const { tokens } = useTheme();
  const Mapbox = getMapbox();

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
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return `${(R * c).toFixed(1)} km`;
  };

  const getRelativeTime = (isoString: string) => {
    const end = new Date(isoString).getTime();
    const now = Date.now();
    const diffHours = Math.max(0, Math.floor((end - now) / (1000 * 60 * 60)));
    if (diffHours === 0) return 'Ends soon';
    return `Ends in ${diffHours}h`;
  };

  const showMap = viewMode === 'map' && !!Mapbox?.MapView;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="flex-row justify-between items-center px-4 py-2 border-b border-border dark:border-border-dark z-10 bg-bg dark:bg-bg-dark">
        <View className="flex-row items-center">
          <Image
            source={require('../../assets/logo.png')}
            accessibilityLabel="Harvest"
            className="w-8 h-8 mr-2"
            resizeMode="contain"
          />
          <Text className="font-display text-2xl text-brand dark:text-brand-dark">Harvest</Text>
        </View>
        <View className="flex-row bg-surface-alt dark:bg-surface-alt-dark rounded-pill p-1">
          {/*
            Avoid conditional NativeWind shadow-* / className toggles on Pressable —
            they race React Navigation and throw "Couldn't find a navigation context".
          */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Map view"
            className="p-2 rounded-pill"
            onPress={() => setViewMode('map')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: viewMode === 'map' ? tokens.surface : 'transparent',
            })}
          >
            <Map size={20} color={viewMode === 'map' ? tokens.brand : tokens.textSecondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="List view"
            className="p-2 rounded-pill"
            onPress={() => setViewMode('list')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: viewMode === 'list' ? tokens.surface : 'transparent',
            })}
          >
            <List size={20} color={viewMode === 'list' ? tokens.brand : tokens.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View className="flex-1">
        {!location ? (
          <View className="flex-1 justify-center items-center px-8">
            <ActivityIndicator size="large" color="#C1502E" className="mb-4" />
            <Text className="font-body text-text-secondary text-center">Finding your location...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-8">
            <Text className="font-display text-xl text-accent-error mb-2">Oops</Text>
            <Text className="font-body text-text-secondary text-center mb-4">{getErrorMessage(error)}</Text>
            <Pressable onPress={() => refetch()} className="bg-surface-alt px-4 py-2 rounded-btn">
              <Text className="font-body font-bold text-text-primary">Retry</Text>
            </Pressable>
          </View>
        ) : viewMode === 'map' && !showMap ? (
          <View className="flex-1 justify-center items-center px-8">
            <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mb-2 text-center">
              Map needs a development build
            </Text>
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center mb-6">
              {mapUnavailableReason} Use the list view for now.
            </Text>
            <Pressable
              onPress={() => setViewMode('list')}
              className="bg-brand px-5 py-3 rounded-btn"
              accessibilityRole="button"
            >
              <Text className="font-body font-bold text-white">Show list</Text>
            </Pressable>
          </View>
        ) : showMap && Mapbox ? (
          <View className="flex-1">
            <Mapbox.MapView style={{ flex: 1 }} logoEnabled={false} compassEnabled={false}>
              <Mapbox.Camera
                zoomLevel={12}
                centerCoordinate={[location.coords.longitude, location.coords.latitude]}
                animationMode="flyTo"
                animationDuration={2000}
              />
              <Mapbox.PointAnnotation
                id="user-location"
                coordinate={[location.coords.longitude, location.coords.latitude]}
              >
                <View className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
              </Mapbox.PointAnnotation>

              {listings.map((item: any) => (
                <Mapbox.PointAnnotation
                  key={item.id}
                  id={`pin-${item.id}`}
                  coordinate={[item.displayLocation.longitude, item.displayLocation.latitude]}
                  onSelected={() => router.push(`/listing/${item.id}`)}
                >
                  <View className="bg-brand rounded-full w-8 h-8 items-center justify-center border-2 border-white">
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
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
            ListHeaderComponent={
              isDemo ? (
                <View className="mb-4 px-1">
                  <Text className="font-body text-sm text-text-secondary dark:text-text-secondary-dark leading-5">
                    Demo tip: reserve a listing from Maya or Green Grocer — your own seeded posts can’t be reserved.
                  </Text>
                </View>
              ) : null
            }
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
                suggestedDonation={item.suggestedDonation}
                onPress={() => router.push(`/listing/${item.id}`)}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
