import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';

type Props = { children: ReactNode; onReset?: () => void };
type State = { hasError: boolean; message: string };

/**
 * Industry-standard safety net: catch render crashes (e.g. missing native modules)
 * so the app shows a recovery UI instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, message: '' });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="font-display text-2xl text-text-primary mb-2 text-center">
          Something went wrong
        </Text>
        <Text className="font-body text-text-secondary text-center mb-6 leading-6">
          {this.state.message}
        </Text>
        <Pressable
          onPress={this.reset}
          className="bg-brand px-6 py-3 rounded-btn"
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text className="font-body font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }
}
