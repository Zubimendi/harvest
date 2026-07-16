import { View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, className = '' }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View 
      style={[{ opacity, width, height, borderRadius }]} 
      className={`bg-surface-alt dark:bg-surface-alt-dark ${className}`} 
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <View className="bg-surface dark:bg-surface-dark rounded-card overflow-hidden border border-border dark:border-border-dark mb-4">
      <Skeleton height={160} borderRadius={0} />
      <View className="p-4">
        <View className="flex-row justify-between mb-3">
          <Skeleton width={80} height={16} />
          <Skeleton width={40} height={16} />
        </View>
        <Skeleton height={24} className="mb-3" />
        <Skeleton width="60%" height={16} />
      </View>
    </View>
  );
}
