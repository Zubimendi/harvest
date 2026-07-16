import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Camera } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@apollo/client';
import { CREATE_LISTING_MUTATION } from '../lib/graphql/queries';
import { useLocation } from '../hooks/useLocation';
import DateTimePicker from '@react-native-community/datetimepicker';

const CATEGORIES = ['PRODUCE', 'BAKED_GOODS', 'PANTRY', 'COOKED_MEAL', 'DAIRY_EGGS', 'OTHER'];

export default function PostScreen() {
  const router = useRouter();
  const { location } = useLocation();
  
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PRODUCE');
  const [quantity, setQuantity] = useState('');
  const [suggestedDonation, setSuggestedDonation] = useState('');
  const [pickupEnd, setPickupEnd] = useState<Date>(new Date(Date.now() + 4 * 60 * 60 * 1000)); // Default 4 hours
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [createListing, { loading }] = useMutation(CREATE_LISTING_MUTATION);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      // In a real app, upload this URI to Supabase Storage and get a public URL
      // For MVP without storage bucket set up, we'll just use a placeholder or local URI
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handlePublish = async () => {
    if (!title || photos.length === 0 || !location) {
      Alert.alert('Missing Info', 'Please add a photo, title, and ensure location is enabled.');
      return;
    }

    try {
      await createListing({
        variables: {
          input: {
            title,
            description,
            category,
            photos: photos.length > 0 ? photos : ['https://via.placeholder.com/400x300'],
            quantity,
            suggestedDonation,
            pickupWindowStart: new Date().toISOString(),
            pickupWindowEnd: pickupEnd.toISOString(),
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
        }
      });
      
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create listing');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface dark:bg-surface-dark">
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-border dark:border-border-dark">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <X size={24} color="#6B5F55" />
        </TouchableOpacity>
        <Text className="font-body font-bold text-lg text-text-primary dark:text-text-primary-dark">
          Share Food
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-6" keyboardShouldPersistTaps="handled">
        {/* Photos */}
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
              <Text className="font-body text-text-secondary dark:text-text-secondary-dark">Tap to add</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View className="mb-6">
          <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">Title</Text>
          <TextInput
            className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
            placeholder="e.g. Sourdough Loaf"
            placeholderTextColor="#B6A996"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View className="mb-6">
          <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">Description</Text>
          <TextInput
            className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark min-h-[100px]"
            placeholder="What food is it? When was it made?"
            placeholderTextColor="#B6A996"
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View className="flex-row mb-6">
          <View className="flex-1 mr-2">
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">Quantity (optional)</Text>
            <TextInput
              className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
              placeholder="e.g. 2 loaves"
              placeholderTextColor="#B6A996"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>
          <View className="flex-1 ml-2">
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">Donation (optional)</Text>
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
          <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} 
                onPress={() => setCategory(cat)}
                className={`border px-3 py-1.5 rounded-pill ${
                  category === cat 
                    ? 'bg-brand dark:bg-brand-dark border-brand dark:border-brand-dark' 
                    : 'bg-surface border-border dark:bg-surface-dark dark:border-border-dark'
                }`}
              >
                <Text className={`font-body text-sm ${
                  category === cat ? 'text-white' : 'text-text-secondary dark:text-text-secondary-dark'
                }`}>
                  {cat.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-8">
          <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">Available Until</Text>
          <TouchableOpacity 
            className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4"
            onPress={() => setShowDatePicker(true)}
          >
            <Text className="font-body text-text-primary dark:text-text-primary-dark">
              {pickupEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={pickupEnd}
              mode="time"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setPickupEnd(date);
              }}
            />
          )}
        </View>

        <View className="mb-8">
          <Button 
            label={loading ? "Publishing..." : "Publish Listing"} 
            onPress={handlePublish} 
            disabled={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
