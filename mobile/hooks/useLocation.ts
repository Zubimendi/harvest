import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(10); // default 10km

  useEffect(() => {
    loadRadius();
  }, []);

  const loadRadius = async () => {
    try {
      const stored = await AsyncStorage.getItem('harvest_radius');
      if (stored) {
        setRadiusKm(parseFloat(stored));
      }
    } catch (e) {
      // ignore
    }
  };

  const requestPermissionAndGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return false;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(loc);
      return true;
    } catch (e: any) {
      setErrorMsg(e.message);
      return false;
    }
  };

  const updateRadius = async (newRadius: number) => {
    setRadiusKm(newRadius);
    try {
      await AsyncStorage.setItem('harvest_radius', newRadius.toString());
    } catch (e) {
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
