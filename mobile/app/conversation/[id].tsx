import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import { CONVERSATION_MESSAGES_QUERY, SEND_MESSAGE_MUTATION } from '../../lib/graphql/queries';
import { useAuth } from '../../lib/auth';
import { getErrorMessage, showErrorAlert } from '../../lib/errors';
import { ensureAuthTokenLoaded } from '../../lib/apollo';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Poll instead of GraphQL WS — HTTP handler does not serve subscriptions yet.
  const { data, loading, error, refetch } = useQuery(CONVERSATION_MESSAGES_QUERY, {
    variables: { conversationId: id },
    fetchPolicy: 'cache-and-network',
    pollInterval: 4000,
  });

  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE_MUTATION, {
    onError: (err) => showErrorAlert('Couldn’t send', err),
  });

  const messages = data?.conversationMessages || [];

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;
    const body = inputText.trim();
    setInputText('');
    await ensureAuthTokenLoaded();

    try {
      await sendMessage({
        variables: {
          conversationId: id,
          body,
        },
        optimisticResponse: {
          sendMessage: {
            __typename: 'Message',
            id: `temp-${Date.now()}`,
            body,
            createdAt: new Date().toISOString(),
            sender: {
              __typename: 'User',
              id: user?.id,
              displayName: user?.displayName || 'Me',
              avatarUrl: null,
            },
          },
        },
        update: (cache, result) => {
          const sent = (result.data as { sendMessage?: unknown } | null | undefined)?.sendMessage;
          if (!sent) return;

          const existingData = cache.readQuery<{ conversationMessages: unknown[] }>({
            query: CONVERSATION_MESSAGES_QUERY,
            variables: { conversationId: id },
          });

          if (existingData) {
            const already = existingData.conversationMessages.some(
              (m: any) => m.id === (sent as { id: string }).id,
            );
            if (already) return;
            cache.writeQuery({
              query: CONVERSATION_MESSAGES_QUERY,
              variables: { conversationId: id },
              data: {
                conversationMessages: [...existingData.conversationMessages, sent],
              },
            });
          }
        },
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      // onError alert handles it
    }
  };

  if (loading && !data && !error) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#C1502E" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="font-display text-xl text-accent-error mb-2">Couldn’t open chat</Text>
        <Text className="font-body text-text-secondary text-center mb-4">{getErrorMessage(error)}</Text>
        <Pressable onPress={() => refetch()} className="bg-brand px-5 py-3 rounded-btn mb-3">
          <Text className="font-body font-bold text-white">Retry</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text className="font-body text-text-secondary">Go back</Text>
        </Pressable>
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, flexGrow: 1 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={() => (
            <View className="items-center mt-16 px-6">
              <Text className="font-body text-text-secondary text-center">
                No messages yet. Say hi to coordinate pickup.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isMe = item.sender?.id === user?.id;

            return (
              <View className={`mb-4 max-w-[80%] ${isMe ? 'self-end' : 'self-start'}`}>
                {!isMe && (
                  <Text className="text-xs text-text-secondary dark:text-text-secondary-dark mb-1 ml-1">
                    {item.sender?.displayName}
                  </Text>
                )}
                <View
                  className={`p-3 rounded-2xl ${
                    isMe
                      ? 'bg-brand dark:bg-brand-dark rounded-br-none'
                      : 'bg-surface-alt dark:bg-surface-alt-dark rounded-bl-none border border-border dark:border-border-dark'
                  }`}
                >
                  <Text
                    className={`font-body ${
                      isMe ? 'text-white' : 'text-text-primary dark:text-text-primary-dark'
                    }`}
                  >
                    {item.body}
                  </Text>
                </View>
                <Text
                  className={`text-[10px] text-text-secondary dark:text-text-secondary-dark mt-1 ${
                    isMe ? 'text-right mr-1' : 'ml-1'
                  }`}
                >
                  {new Date(item.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
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
