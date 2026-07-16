import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { CONVERSATION_MESSAGES_QUERY, SEND_MESSAGE_MUTATION, NEW_MESSAGE_SUBSCRIPTION } from '../../lib/graphql/queries';
import { useAuth } from '../../lib/auth';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data, loading, subscribeToMore } = useQuery(CONVERSATION_MESSAGES_QUERY, {
    variables: { conversationId: id },
    fetchPolicy: 'cache-and-network',
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION);

  // Set up real-time subscription
  useEffect(() => {
    let unsubscribe: () => void;
    if (subscribeToMore) {
      unsubscribe = subscribeToMore({
        document: NEW_MESSAGE_SUBSCRIPTION,
        variables: { conversationId: id },
        updateQuery: (prev, { subscriptionData }) => {
          if (!subscriptionData.data) return prev;
          const newMsg = subscriptionData.data.newMessage;
          
          // Avoid duplicates if we already added it via optimistic response
          if (prev.conversationMessages.some((m: any) => m.id === newMsg.id)) {
            return prev;
          }

          return {
            ...prev,
            conversationMessages: [...prev.conversationMessages, newMsg],
          };
        },
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [subscribeToMore, id]);

  const messages = data?.conversationMessages || [];

  const handleSend = () => {
    if (!inputText.trim() || sending) return;

    sendMessage({
      variables: {
        conversationId: id,
        body: inputText.trim(),
      },
      // Optimistic UI for immediate feedback
      optimisticResponse: {
        sendMessage: {
          __typename: 'Message',
          id: `temp-${Date.now()}`,
          body: inputText.trim(),
          createdAt: new Date().toISOString(),
          sender: {
            __typename: 'User',
            id: user?.id,
            displayName: user?.user_metadata?.display_name || 'Me',
            avatarUrl: null,
          },
        },
      },
      update: (cache, { data: { sendMessage } }) => {
        const existingData = cache.readQuery<any>({
          query: CONVERSATION_MESSAGES_QUERY,
          variables: { conversationId: id },
        });

        if (existingData) {
          cache.writeQuery({
            query: CONVERSATION_MESSAGES_QUERY,
            variables: { conversationId: id },
            data: {
              conversationMessages: [...existingData.conversationMessages, sendMessage],
            },
          });
        }
      },
    });

    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  if (loading && !data) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#C1502E" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-4 py-3 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 mr-2">
          <ArrowLeft size={24} color="#2B231D" />
        </TouchableOpacity>
        <Text className="font-body font-bold text-lg text-text-primary dark:text-text-primary-dark">
          Chat
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender.id === user?.id;
            
            return (
              <View className={`mb-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                {!isMe && (
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1 ml-1">
                    {item.sender.displayName}
                  </Text>
                )}
                <View className={`p-3 rounded-2xl ${
                  isMe 
                    ? 'bg-brand dark:bg-brand-dark rounded-br-none' 
                    : 'bg-surface-alt dark:bg-surface-alt-dark rounded-bl-none border border-border dark:border-border-dark'
                }`}>
                  <Text className={`font-body ${isMe ? 'text-white' : 'text-text-primary dark:text-text-primary-dark'}`}>
                    {item.body}
                  </Text>
                </View>
                <Text className={`text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
        />

        <View className="p-4 bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark flex-row items-end">
          <TextInput
            className="flex-1 bg-surface-alt dark:bg-surface-alt-dark rounded-input px-4 py-3 min-h-[44px] max-h-[100px] font-body text-text-primary dark:text-text-primary-dark"
            placeholder="Type a message..."
            placeholderTextColor="#B6A996"
            multiline
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity 
            className={`w-11 h-11 rounded-full items-center justify-center ml-2 ${
              inputText.trim() ? 'bg-brand dark:bg-brand-dark' : 'bg-surface-alt dark:bg-surface-alt-dark'
            }`}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <Send size={20} color={inputText.trim() ? 'white' : '#B6A996'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
