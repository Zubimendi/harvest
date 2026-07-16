import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, User as UserIcon, Star, Flag } from 'lucide-react-native';
import { Badge } from '../../components/ui/Badge';
import { useQuery, useMutation } from '@apollo/client/react';
import { PUBLIC_PROFILE_QUERY, REPORT_USER_MUTATION } from '../../lib/graphql/queries';
import { useState } from 'react';
import { ReportSheet } from '../../components/ReportSheet';
import { useAuth } from '../../lib/auth';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [showReport, setShowReport] = useState(false);

  const { data, loading, error } = useQuery(PUBLIC_PROFILE_QUERY, {
    variables: { id },
  });

  const [reportUser] = useMutation(REPORT_USER_MUTATION, {
    onCompleted: () => {
      setShowReport(false);
      Alert.alert('Report Submitted', 'Thank you. Our team will review this user.');
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator size="large" color="#C1502E" />
      </View>
    );
  }

  if (error || !data?.publicProfile) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-4">
        <Text className="font-body text-text-secondary mb-4">User not found</Text>
      </View>
    );
  }

  const profile = data.publicProfile;
  const isMe = user?.id === profile.id;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-row justify-between items-center px-4 py-2 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="#2B231D" />
        </TouchableOpacity>
        {!isMe && (
          <TouchableOpacity onPress={() => setShowReport(true)} className="p-2 -mr-2">
            <Flag size={20} color="#B3462C" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1">
        <View className="items-center px-6 py-8 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
          <View className={`w-24 h-24 rounded-full bg-surface-alt items-center justify-center mb-4 overflow-hidden ${profile.ratingAvg >= 4.5 ? 'border-2 border-accent-sage' : ''}`}>
             {profile.avatarUrl ? (
               <Image source={{ uri: profile.avatarUrl }} className="w-full h-full" />
             ) : (
               <UserIcon size={40} color="#6B5F55" />
             )}
          </View>
          <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-1">
            {profile.displayName} {isMe ? '(You)' : ''}
          </Text>
          {profile.isBusiness && <Badge label="Verified Business" variant="info" />}
          
          <View className="flex-row items-center mt-3 mb-4">
            <Star size={16} color="#D68C2A" fill="#D68C2A" className="mr-1" />
            <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark text-lg">
              {profile.ratingAvg?.toFixed(1) || 'New'}
            </Text>
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark ml-2">
              ({profile.ratingCount} pickups)
            </Text>
          </View>

          {profile.bio && (
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center leading-6">
              {profile.bio}
            </Text>
          )}
        </View>
        
        {/* Active listings would go here, queried separately */}
        <View className="px-4 py-8 items-center">
           <Text className="font-body text-text-secondary">
             Active listings query not yet implemented in UI.
           </Text>
        </View>
      </ScrollView>

      {/* Report Modal */}
      <Modal visible={showReport} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <ReportSheet 
            onClose={() => setShowReport(false)}
            onSubmit={(reason) => reportUser({ variables: { userId: id, reason } })}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
