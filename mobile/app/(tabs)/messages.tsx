import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { useQuery } from '@apollo/client/react';
import { MY_CONVERSATIONS_QUERY } from '../../lib/graphql/queries';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../lib/auth';
import { getErrorMessage } from '../../lib/errors';
import { ensureAuthTokenLoaded } from '../../lib/apollo';
import { useEffect } from 'react';

export default function MessagesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    void ensureAuthTokenLoaded();
  }, []);

  const { data, loading, error, refetch } = useQuery(MY_CONVERSATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const conversations = data?.myConversations || [];
  const showInitialSpinner = loading && !data && !error;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="px-4 pt-2 pb-3 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark z-10">
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark">Inbox</Text>
      </View>

      {showInitialSpinner ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C1502E" />
        </View>
      ) : error && !data ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="font-display text-xl text-accent-error mb-2">Couldn’t load inbox</Text>
          <Text className="font-body text-text-secondary text-center mb-4">{getErrorMessage(error)}</Text>
          <Pressable onPress={() => refetch()} className="bg-brand px-5 py-3 rounded-btn">
            <Text className="font-body font-bold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
          ListEmptyComponent={() => (
            <EmptyState
              title="No messages yet"
              description="Reserve a listing or confirm a pickup to start chatting with neighbors."
              actionLabel="Browse listings"
              onAction={() => router.push('/(tabs)/browse')}
            />
          )}
          renderItem={({ item }) => {
            const lastMessage = item.messages?.[0];
            const otherParticipant =
              item.participants?.find((p: { id: string }) => p.id !== user?.id) ||
              item.participants?.[0];

            return (
              <TouchableOpacity
                className="flex-row items-center mx-4 mt-3 p-4 rounded-card border border-border dark:border-border-dark bg-surface dark:bg-surface-dark"
                onPress={() => router.push(`/conversation/${item.id}`)}
                style={{
                  shadowColor: '#2B231D',
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 3 },
                  elevation: 2,
                }}
              >
                <View className="w-12 h-12 rounded-full bg-surface-alt items-center justify-center mr-4 overflow-hidden">
                  {otherParticipant?.avatarUrl ? (
                    <Image source={{ uri: otherParticipant.avatarUrl }} className="w-full h-full" />
                  ) : (
                    <User size={24} color="#6B5F55" />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between mb-1 items-center">
                    <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark">
                      {otherParticipant?.displayName || 'Neighbor'}
                    </Text>
                    {lastMessage && (
                      <Text className="font-body text-text-secondary text-xs">
                        {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    )}
                  </View>
                  <Text className="font-body text-brand dark:text-brand-dark text-xs mb-1 uppercase tracking-wider font-bold">
                    {item.listing?.title || 'Listing'}
                  </Text>
                  <Text className="font-body text-text-secondary dark:text-text-secondary-dark" numberOfLines={1}>
                    {lastMessage
                      ? `${lastMessage.sender?.displayName || 'Neighbor'}: ${lastMessage.body}`
                      : 'No messages yet. Say hi!'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
