import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, MapPin, User as UserIcon, Flag } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useQuery, useMutation } from '@apollo/client/react';
import { LISTING_DETAIL_QUERY, RESERVE_LISTING_MUTATION, CANCEL_RESERVATION_MUTATION, CONFIRM_PICKUP_MUTATION, SUBMIT_REVIEW_MUTATION } from '../../lib/graphql/queries';
import { useAuth } from '../../lib/auth';
import { useLocation } from '../../hooks/useLocation';
import { useMemo, useState } from 'react';
import { RatingPrompt } from '../../components/RatingPrompt';
import { showErrorAlert } from '../../lib/errors';
import { ensureAuthTokenLoaded, getAuthToken } from '../../lib/apollo';

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = useMemo(() => {
    const raw = params.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.id]);
  const router = useRouter();
  const { user } = useAuth();
  const { location } = useLocation();

  const [showRating, setShowRating] = useState(false);

  const { data, loading, error, refetch } = useQuery(LISTING_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const [reserveListing, { loading: reserving }] = useMutation(RESERVE_LISTING_MUTATION, {
    onCompleted: (result) => {
      refetch();
      const convId = (result as { reserveListing?: { conversation?: { id?: string } } })
        ?.reserveListing?.conversation?.id;
      if (convId) {
        Alert.alert('Reserved!', 'Chat with the neighbor to arrange pickup.', [
          { text: 'Later', style: 'cancel' },
          { text: 'Open chat', onPress: () => router.push(`/conversation/${convId}`) },
        ]);
      } else {
        Alert.alert('Reserved!', 'This listing is held for you.');
      }
    },
    onError: (err) => showErrorAlert('Couldn’t reserve', err, 'Listing may already be reserved or unavailable.'),
  });

  const [cancelReservation, { loading: canceling }] = useMutation(CANCEL_RESERVATION_MUTATION, {
    onCompleted: () => refetch(),
    onError: (err) => showErrorAlert('Couldn’t cancel', err),
  });

  const [confirmPickup, { loading: confirming }] = useMutation(CONFIRM_PICKUP_MUTATION, {
    onCompleted: () => setShowRating(true),
    onError: (err) => showErrorAlert('Couldn’t confirm pickup', err),
  });

  const [submitReview] = useMutation(SUBMIT_REVIEW_MUTATION, {
    onCompleted: () => {
      setShowRating(false);
      refetch();
    },
    onError: (err) => showErrorAlert('Couldn’t submit review', err),
  });

  if (loading && !data) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#C1502E" />
      </View>
    );
  }

  if (error || !data?.listing) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-4">
        <Text className="font-body text-text-secondary mb-4">Error loading listing</Text>
        <Button label="Go Back" onPress={() => router.back()} />
      </View>
    );
  }

  const listing = data.listing;
  const isOwner = user?.id === listing.owner.id;
  const isReserver = user?.id === listing.reservedBy?.id;

  const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1) return 'Unknown distance';
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
    const end = new Date(isoString);
    return end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReserve = () => {
    if (isOwner) {
      Alert.alert('Your listing', "You can’t reserve your own listing. Try one from Maya or Green Grocer.");
      return;
    }
    Alert.alert(
      'Confirm Reservation',
      'Are you sure you can pick this up before the window ends?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reserve',
          onPress: async () => {
            await ensureAuthTokenLoaded();
            if (!getAuthToken()) {
              showErrorAlert('Couldn’t reserve', 'You’re not signed in. Go back and continue as demo neighbor.');
              return;
            }
            reserveListing({ variables: { id } });
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView className="flex-1" bounces={false}>
        <View className="w-full h-72 relative">
          <Image 
            source={{ uri: listing.photos[0] || 'https://via.placeholder.com/800x600' }} 
            className="w-full h-full bg-surface-alt"
          />
          <SafeAreaView className="absolute top-0 left-0 right-0 px-4 py-2 flex-row justify-between">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-surface/80 items-center justify-center"
            >
              <ArrowLeft size={24} color="#2B231D" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => Alert.alert('Report', 'Open report sheet')}
              className="w-10 h-10 rounded-full bg-surface/80 items-center justify-center"
            >
              <Flag size={20} color="#B3462C" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View className="px-5 py-6">
          <View className="flex-row justify-between items-start mb-4">
            <Badge label={listing.category.replace('_', ' ')} variant="default" />
            <Badge label={listing.status} variant={listing.status === 'ACTIVE' ? 'success' : 'warning'} />
          </View>
          
          <Text className="font-display text-3xl text-text-primary dark:text-text-primary-dark mb-2">
            {listing.title}
          </Text>

          {listing.quantity && (
            <Text className="font-body text-text-secondary mb-4">Quantity: {listing.quantity}</Text>
          )}

          <View className="flex-row items-center mb-2">
            <Clock size={16} color="#6B5F55" className="mr-2" />
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark">
              Pick up today before {getRelativeTime(listing.pickupWindowEnd)}
            </Text>
          </View>
          
          <View className="flex-row items-center mb-6">
            <MapPin size={16} color="#6B5F55" className="mr-2" />
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark">
              {formatDistance(
                location?.coords.latitude || 0, location?.coords.longitude || 0,
                listing.displayLocation.latitude, listing.displayLocation.longitude
              )} 
              {listing.trueLocation ? ' • Exact location unlocked' : ' • Exact location hidden'}
            </Text>
          </View>

          {listing.description && (
            <Text className="font-body text-text-primary dark:text-text-primary-dark leading-6 mb-8">
              {listing.description}
            </Text>
          )}

          <TouchableOpacity 
            className="flex-row items-center bg-surface dark:bg-surface-dark p-4 rounded-card border border-border dark:border-border-dark mb-8"
            onPress={() => router.push(`/profile/${listing.owner.id}`)}
          >
            <View className="w-12 h-12 rounded-full bg-surface-alt items-center justify-center mr-4 overflow-hidden">
              {listing.owner.avatarUrl ? (
                <Image source={{ uri: listing.owner.avatarUrl }} className="w-full h-full" />
              ) : (
                <UserIcon size={24} color="#6B5F55" />
              )}
            </View>
            <View>
              <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark text-lg">
                {listing.owner.displayName} {listing.owner.id === user?.id ? '(You)' : ''}
              </Text>
              <Text className="font-body text-text-secondary dark:text-text-secondary-dark">
                ★ {listing.owner.ratingAvg?.toFixed(1) || 'New'} ({listing.owner.ratingCount} pickups)
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View className="px-5 py-4 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark pb-8">
        {listing.status === 'ACTIVE' && !isOwner && (
          <Button 
            label={reserving ? "Reserving..." : "Reserve for Pickup"} 
            onPress={handleReserve} 
            disabled={reserving}
          />
        )}
        
        {listing.status === 'ACTIVE' && isOwner && (
          <View>
            <Button label="You can’t reserve your own listing" variant="secondary" disabled />
            <Text className="font-body text-xs text-text-secondary text-center mt-2">
              Open a listing from Maya Baker or Green Grocer to try reserve + chat.
            </Text>
          </View>
        )}

        {listing.status === 'RESERVED' && isReserver && (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button 
                label={canceling ? "Canceling..." : "Cancel"} 
                variant="secondary" 
                onPress={() => cancelReservation({ variables: { id } })} 
                disabled={canceling}
              />
            </View>
            <View className="flex-1">
              <Button 
                label="Open Chat" 
                onPress={() => router.push(`/conversation/${listing.conversation?.id}`)} 
              />
            </View>
          </View>
        )}

        {listing.status === 'RESERVED' && isOwner && (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button 
                label={confirming ? "Confirming..." : "Confirm Pickup"} 
                onPress={() => confirmPickup({ variables: { id } })} 
                disabled={confirming}
              />
            </View>
            <View className="flex-1">
              <Button 
                label="Open Chat" 
                variant="secondary"
                onPress={() => router.push(`/conversation/${listing.conversation?.id}`)} 
              />
            </View>
          </View>
        )}

        {listing.status === 'RESERVED' && !isOwner && !isReserver && (
          <Button label="Currently Reserved" variant="secondary" disabled />
        )}

        {listing.status === 'PICKED_UP' && (
          <Button label="Pickup Completed ✓" variant="secondary" disabled />
        )}

        {(listing.status === 'EXPIRED' || listing.status === 'CANCELLED') && (
          <Button label={`Listing ${listing.status}`} variant="secondary" disabled />
        )}
      </View>

      {/* Rating Modal */}
      <Modal visible={showRating} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <RatingPrompt 
            onClose={() => setShowRating(false)}
            onSubmit={(rating, comment) => submitReview({ variables: { listingId: id, rating, comment } })}
          />
        </View>
      </Modal>
    </View>
  );
}
