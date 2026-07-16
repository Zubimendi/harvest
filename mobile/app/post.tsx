import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Camera } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@apollo/client/react';
import { CREATE_LISTING_MUTATION } from '../lib/graphql/queries';
import { useLocation } from '../hooks/useLocation';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showErrorAlert } from '../lib/errors';
import { ensureAuthTokenLoaded } from '../lib/apollo';
import { useTheme } from '../lib/theme';

const CATEGORIES = ['PRODUCE', 'BAKED_GOODS', 'PANTRY', 'COOKED_MEAL', 'DAIRY_EGGS', 'OTHER'];

export default function PostScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const { tokens } = useTheme();

  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PRODUCE');
  const [quantity, setQuantity] = useState('');
  const [suggestedDonation, setSuggestedDonation] = useState('');
  const [pickupEnd, setPickupEnd] = useState<Date>(new Date(Date.now() + 4 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [createListing, { loading }] = useMutation(CREATE_LISTING_MUTATION);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      // MVP: store local URI; production would upload to object storage first
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const ensureFuturePickupEnd = (date: Date) => {
    const next = new Date(date);
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your listing a short name.');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Add a photo', 'Neighbors need to see what you’re sharing.');
      return;
    }
    if (!location) {
      Alert.alert('Location needed', 'Enable location so neighbors nearby can find this.');
      return;
    }

    const end = ensureFuturePickupEnd(pickupEnd);

    try {
      await ensureAuthTokenLoaded();
      const result = await createListing({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim() || null,
            category,
            photos,
            quantity: quantity.trim() || null,
            suggestedDonation: suggestedDonation.trim() || null,
            pickupWindowStart: new Date().toISOString(),
            pickupWindowEnd: end.toISOString(),
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
        },
      });

      const listingId = (result.data as { createListing?: { id?: string } } | undefined)?.createListing
        ?.id;

      Alert.alert('Listing published!', 'Neighbors nearby can now find and reserve it.', [
        {
          text: 'View listing',
          onPress: () => {
            if (listingId) router.replace(`/listing/${listingId}`);
            else router.back();
          },
        },
        {
          text: 'Done',
          style: 'cancel',
          onPress: () => router.back(),
        },
      ]);
    } catch (err: unknown) {
      showErrorAlert('Couldn’t publish', err, 'Failed to create listing');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-border dark:border-border-dark">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <X size={24} color={tokens.textSecondary} />
        </TouchableOpacity>
        <Text className="font-body font-bold text-lg text-text-primary dark:text-text-primary-dark">
          Share Food
        </Text>
        <View className="w-10" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          className="flex-1 px-4 py-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row">
            {photos.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                className="w-40 h-40 rounded-card mr-4 bg-surface-alt"
              />
            ))}
            {photos.length < 4 && (
              <TouchableOpacity
                onPress={pickImage}
                className="w-40 h-40 bg-surface-alt dark:bg-surface-alt-dark rounded-card items-center justify-center border border-dashed border-border dark:border-border-dark mr-4"
              >
                <Camera size={32} color="#C1502E" className="mb-2" />
                <Text className="font-body text-text-secondary dark:text-text-secondary-dark">
                  Tap to add
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View className="mb-6">
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
              Title
            </Text>
            <TextInput
              className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
              placeholder="e.g. Sourdough Loaf"
              placeholderTextColor="#B6A996"
              value={title}
              onChangeText={setTitle}
              returnKeyType="next"
            />
          </View>

          <View className="mb-6">
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
              Description
            </Text>
            <TextInput
              className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark min-h-[100px]"
              placeholder="What food is it? When was it made?"
              placeholderTextColor="#B6A996"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View className="flex-row mb-6">
            <View className="flex-1 mr-2">
              <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
                Quantity (optional)
              </Text>
              <TextInput
                className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
                placeholder="e.g. 2 loaves"
                placeholderTextColor="#B6A996"
                value={quantity}
                onChangeText={setQuantity}
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
                Donation (optional)
              </Text>
              <TextInput
                className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
                placeholder="e.g. $2 or free"
                placeholderTextColor="#B6A996"
                value={suggestedDonation}
                onChangeText={setSuggestedDonation}
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
              Category
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const selected = category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    className="border px-3 py-1.5 rounded-pill"
                    style={{
                      backgroundColor: selected ? tokens.brand : tokens.surface,
                      borderColor: selected ? tokens.brand : tokens.border,
                    }}
                  >
                    <Text
                      className="font-body text-sm"
                      style={{ color: selected ? '#FFFFFF' : tokens.textSecondary }}
                    >
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View className="mb-8">
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
              Available Until
            </Text>
            <TouchableOpacity
              className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="font-body text-text-primary dark:text-text-primary-dark">
                {pickupEnd.toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={pickupEnd}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (event.type === 'dismissed') {
                    setShowDatePicker(false);
                    return;
                  }
                  if (date) setPickupEnd(ensureFuturePickupEnd(date));
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                }}
              />
            )}
          </View>

          <View className="mb-8">
            <Button
              label={loading ? 'Publishing...' : 'Publish Listing'}
              onPress={handlePublish}
              disabled={loading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
