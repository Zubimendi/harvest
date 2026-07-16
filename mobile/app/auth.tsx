import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui/Button';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signInAsDemo } = useAuth();

  const handleDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAsDemo();
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Could not start demo session');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!isSupabaseConfigured) {
      setError('Email sign-in isn’t configured. Use demo neighbor for now.');
      return;
    }
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) setError(error.message);
    else setStep('otp');
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
      type: 'email',
    });

    setLoading(false);
    if (error) setError(error.message);
    else if (data.session) router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
          <View className="mb-10">
            <View className="flex-row items-center mb-6">
              <Image
                source={require('../assets/logo.png')}
                accessibilityLabel="Harvest"
                className="w-12 h-12 mr-3"
                resizeMode="contain"
              />
              <Text className="font-display text-4xl text-brand dark:text-brand-dark">
                Harvest
              </Text>
            </View>
            <Text className="font-display text-2xl text-text-primary dark:text-text-primary-dark">
              {step === 'email' ? "Join your neighborhood" : 'Check your email'}
            </Text>
            <Text className="font-body text-text-secondary dark:text-text-secondary-dark mt-2 leading-6">
              {step === 'email'
                ? 'Share surplus food with people nearby. Continue as a demo neighbor to explore, or sign in with email.'
                : `We sent a 6-digit code to ${email}`}
            </Text>
          </View>

          {error && (
            <View className="bg-accent-error/10 p-3 rounded-input mb-6 border border-accent-error/30">
              <Text className="text-accent-error dark:text-accent-error-dark font-body">{error}</Text>
            </View>
          )}

          {step === 'email' ? (
            <View className="gap-y-4">
              <Button
                label={loading ? 'Starting…' : 'Continue as demo neighbor'}
                onPress={handleDemo}
                disabled={loading}
              />

              <View className="flex-row items-center my-2">
                <View className="flex-1 h-px bg-border dark:bg-border-dark" />
                <Text className="mx-3 font-body text-xs uppercase tracking-wider text-text-secondary">
                  or email
                </Text>
                <View className="flex-1 h-px bg-border dark:bg-border-dark" />
              </View>

              <View>
                <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
                  Email
                </Text>
                <TextInput
                  className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark"
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
                label={loading ? 'Sending…' : 'Continue with email'}
                variant="secondary"
                onPress={handleSendOtp}
                disabled={loading}
              />
              <TouchableOpacity onPress={() => router.back()} className="mt-2 items-center">
                <Text className="font-body text-text-secondary dark:text-text-secondary-dark">Back</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="gap-y-4">
              <View>
                <Text className="font-body font-bold text-text-primary dark:text-text-primary-dark mb-2">
                  Login code
                </Text>
                <TextInput
                  className="w-full bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-input p-4 font-body text-text-primary dark:text-text-primary-dark text-xl tracking-widest text-center"
                  placeholder="123456"
                  placeholderTextColor="#B6A996"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>
              <Button
                label={loading ? 'Verifying…' : 'Verify & sign in'}
                onPress={handleVerifyOtp}
                disabled={loading}
              />
              <TouchableOpacity onPress={() => setStep('email')} className="mt-2 items-center">
                <Text className="font-body text-brand dark:text-brand-dark">Use a different email</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
