import { View, Text, ScrollView, TouchableOpacity, Switch, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User as UserIcon, LogOut, Trash2, Bell, MapPin } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../lib/auth';
import { useLocation } from '../../hooks/useLocation';

export default function ProfileTab() {
  const { user, signOut } = useAuth();
  const { radiusKm, updateRadius } = useLocation();

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="px-4 py-2 border-b border-border dark:border-border-dark bg-bg dark:bg-bg-dark">
        <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark pb-2">Profile</Text>
      </View>

      <ScrollView className="flex-1">
        <View className="items-center px-6 py-8 border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark">
          <View className="w-24 h-24 rounded-full bg-surface-alt items-center justify-center mb-4 overflow-hidden border-2 border-border dark:border-border-dark">
             {user?.user_metadata?.avatar_url ? (
               <Image source={{ uri: user.user_metadata.avatar_url }} className="w-full h-full" />
             ) : (
               <UserIcon size={40} color="#6B5F55" />
             )}
          </View>
          <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark mb-1">
            {user?.user_metadata?.display_name || user?.email || 'User'}
          </Text>
          <Text className="font-body text-text-secondary dark:text-text-secondary-dark text-center mt-2">
            Joined {new Date(user?.created_at || Date.now()).toLocaleDateString()}
          </Text>
          <View className="mt-4 w-full">
             <Button label="Edit Profile" variant="secondary" />
          </View>
        </View>

        <View className="py-6">
          <Text className="font-display text-xl text-text-primary dark:text-text-primary-dark mb-2 px-4">
            Preferences
          </Text>
          
          <View className="bg-surface dark:bg-surface-dark border-t border-b border-border dark:border-border-dark">
            <View className="flex-row items-center justify-between p-4 border-b border-border dark:border-border-dark">
              <View className="flex-row items-center">
                <MapPin size={20} color="#6B5F55" className="mr-3" />
                <View>
                  <Text className="font-body text-text-primary dark:text-text-primary-dark">Search Radius</Text>
                  <Text className="font-body text-text-secondary text-xs">{radiusKm} km</Text>
                </View>
              </View>
              <View className="flex-row gap-2">
                 <TouchableOpacity onPress={() => updateRadius(Math.max(1, radiusKm - 5))} className="w-8 h-8 rounded-full bg-surface-alt items-center justify-center">
                    <Text className="font-body font-bold text-text-primary">-</Text>
                 </TouchableOpacity>
                 <TouchableOpacity onPress={() => updateRadius(radiusKm + 5)} className="w-8 h-8 rounded-full bg-surface-alt items-center justify-center">
                    <Text className="font-body font-bold text-text-primary">+</Text>
                 </TouchableOpacity>
              </View>
            </View>
            
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Bell size={20} color="#6B5F55" className="mr-3" />
                <Text className="font-body text-text-primary dark:text-text-primary-dark">Push Notifications</Text>
              </View>
              <Switch value={true} trackColor={{ true: '#C1502E' }} />
            </View>
          </View>
        </View>

        <View className="py-2 mb-8">
          <View className="bg-surface dark:bg-surface-dark border-t border-b border-border dark:border-border-dark">
            <TouchableOpacity 
              className="flex-row items-center p-4 border-b border-border dark:border-border-dark"
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#6B5F55" className="mr-3" />
              <Text className="font-body text-text-primary dark:text-text-primary-dark">Sign Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity className="flex-row items-center p-4">
              <Trash2 size={20} color="#B3462C" className="mr-3" />
              <Text className="font-body text-accent-error dark:text-accent-error-dark">Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
