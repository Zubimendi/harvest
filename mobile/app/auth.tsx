import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'profile'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSendOtp = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'magiclink',
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      // Check if user has a profile record. If new, they might need to set one up.
      // For MVP, we'll route to tabs if successful, or we could add a profile step here.
      // We will assume that if we get here, we are good to go to tabs, and users can edit profile later.
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          
          <View className="mb-12">
            <Text className="font-display text-4xl text-brand dark:text-brand-dark mb-2">
              Harvest
            </Text>
            <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark">
              {step === 'email' ? "Let's get started" : "Check your email"}
            </Text>
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark mt-2">
              {step === 'email' 
                ? "Enter your email to sign in or create an account. No passwords needed." 
                : `We sent a 6-digit code to ${email}`}
            </Text>
          </View>

          {error && (
            <View className="bg-accent-error/20 p-3 rounded-lg mb-6 border border-accent-error/30">
              <Text className="text-accent-error dark:text-accent-error-dark font-body">{error}</Text>
            </View>
          )}

          {step === 'email' ? (
            <View className="gap-y-4">
              <View>
                <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
                  Email
                </Text>
                <TextInput
                  className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
                  placeholder="hello@example.com"
                  placeholderTextColor="#B6A996"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
              <Button 
                label={loading ? "Sending..." : "Continue"} 
                onPress={handleSendOtp} 
                disabled={loading}
              />
              <TouchableOpacity onPress={() => router.back()} className="mt-4 items-center">
                 <Text className="font-body text-text-secondary dark:text-text-secondary-dark">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-4">
              <View>
                <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
                  Login Code
                </Text>
                <TextInput
                  className="w-full bg-surface-alt dark:bg-surface-alt-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark text-xl tracking-widest text-center"
                  placeholder="123456"
                  placeholderTextColor="#B6A996"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>
              <Button 
                label={loading ? "Verifying..." : "Verify & Sign In"} 
                onPress={handleVerifyOtp} 
                disabled={loading}
              />
              <TouchableOpacity onPress={() => setStep('email')} className="mt-4 items-center">
                 <Text className="font-body text-brand dark:text-brand-dark">Use a different email</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
