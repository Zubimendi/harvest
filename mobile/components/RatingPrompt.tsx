import { View, Text, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Star } from 'lucide-react-native';
import { useState } from 'react';
import { Button } from './ui/Button';

interface RatingPromptProps {
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}

export function RatingPrompt({ onClose, onSubmit }: RatingPromptProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        bounces={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      >
        <View className="p-6 bg-surface dark:bg-surface-dark rounded-t-3xl border-t border-border dark:border-border-dark">
          <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-2 text-center">
            How was your pickup?
          </Text>
          <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center mb-6">
            Rate your experience to help build trust in the Harvest community.
          </Text>

          <View className="flex-row justify-center mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)} className="p-2 mx-1">
                <Star
                  size={40}
                  color={rating >= star ? '#D68C2A' : '#E8DFD3'}
                  fill={rating >= star ? '#D68C2A' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark mb-6 min-h-[100px]"
            placeholder="Add an optional comment..."
            placeholderTextColor="#B6A996"
            multiline
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
          />

          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Button label="Skip" variant="secondary" onPress={onClose} />
            </View>
            <View className="flex-1 ml-2">
              <Button
                label="Submit"
                variant="primary"
                onPress={() => onSubmit(rating, comment)}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
