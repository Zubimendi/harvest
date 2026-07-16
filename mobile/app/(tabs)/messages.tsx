import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User } from 'lucide-react-native';
import { useQuery } from '@apollo/client';
import { MY_CONVERSATIONS_QUERY } from '../../lib/graphql/queries';
import { EmptyState } from '../../components/ui/EmptyState';

export default function MessagesScreen() {
  const router = useRouter();

  const { data, loading, refetch } = useQuery(MY_CONVERSATIONS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const conversations = data?.myConversations || [];

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 py-2 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark z-10">
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark pb-2">Messages</Text>
      </View>
      
      {loading && !data ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#C1502E" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor="#C1502E" />}
          ListEmptyComponent={() => (
            <EmptyState 
              title="No messages yet" 
              description="Reserve a listing or confirm a pickup to start chatting with neighbors."
              actionLabel="Browse Listings"
              onAction={() => router.push('/(tabs)/browse')}
            />
          )}
          renderItem={({ item }) => {
            const lastMessage = item.messages?.[0];
            const otherParticipant = item.participants?.[0]; // Assuming query filters out the current user or returns counterpart
            
            return (
              <TouchableOpacity 
                className="flex-row items-center p-4 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark"
                onPress={() => router.push(`/conversation/${item.id}`)}
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
                      {otherParticipant?.displayName || 'Unknown User'}
                    </Text>
                    {lastMessage && (
                      <Text className="font-body text-text-secondary text-xs">
                        {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <Text className="font-body text-brand dark:text-brand-dark text-xs mb-1 uppercase tracking-wider font-bold">
                    {item.listing.title} • {item.listing.status}
                  </Text>
                  <Text className="font-body text-text-secondary dark:text-text-secondary-dark" numberOfLines={1}>
                    {lastMessage ? `${lastMessage.sender.displayName}: ${lastMessage.body}` : 'No messages yet. Say hi!'}
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
