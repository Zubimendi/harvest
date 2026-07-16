import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const seedLat = process.env.EXPO_PUBLIC_SEED_LAT
  ? parseFloat(process.env.EXPO_PUBLIC_SEED_LAT)
  : null;
const seedLng = process.env.EXPO_PUBLIC_SEED_LNG
  ? parseFloat(process.env.EXPO_PUBLIC_SEED_LNG)
  : null;

function seedLocationObject(): Location.LocationObject | null {
  if (seedLat == null || seedLng == null || Number.isNaN(seedLat) || Number.isNaN(seedLng)) {
    return null;
  }
  return {
    coords: {
      latitude: seedLat,
      longitude: seedLng,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };
}

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(seedLocationObject());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10);

  useEffect(() => {
    loadRadius();
    // Prefer seeded neighborhood for demo feed; still request GPS for later.
    const seeded = seedLocationObject();
    if (seeded) {
      setLocation(seeded);
    } else {
      requestPermissionAndGetLocation();
    }
  }, []);

  const loadRadius = async () => {
    try {
      const stored = await AsyncStorage.getItem('harvest_radius');
      if (stored) setRadiusKm(parseFloat(stored));
    } catch {
      // ignore
    }
  };

  const requestPermissionAndGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        const seeded = seedLocationObject();
        if (seeded) setLocation(seeded);
        return false;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      // If seed coords are set, keep using them for nearby queries so demo data shows.
      if (!seedLocationObject()) {
        setLocation(loc);
      }
      return true;
    } catch (e: any) {
      setErrorMsg(e.message);
      const seeded = seedLocationObject();
      if (seeded) setLocation(seeded);
      return false;
    }
  };

  const updateRadius = async (newRadius: number) => {
    setRadiusKm(newRadius);
    try {
      await AsyncStorage.setItem('harvest_radius', newRadius.toString());
    } catch {
      // ignore
    }
  };

  return {
    location,
    errorMsg,
    radiusKm,
    updateRadius,
    requestPermissionAndGetLocation,
  };
}
