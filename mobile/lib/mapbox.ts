/**
 * @rnmapbox/maps requires a custom native build — it does not work in Expo Go.
 * Never mount MapView unless native modules are confirmed present.
 */
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

type MapboxModule = typeof import('@rnmapbox/maps').default;

let cached: MapboxModule | null | undefined;

function hasNativeMapbox(): boolean {
  // Expo Go never ships Mapbox native code
  if (Constants.appOwnership === 'expo') return false;

  const mods = NativeModules as Record<string, unknown>;
  return Boolean(
    mods.RNMBXModule ||
      mods.RNMapbox ||
      mods.Mapbox ||
      mods.RNMBXMapView,
  );
}

export function getMapbox(): MapboxModule | null {
  if (cached !== undefined) return cached;

  if (!hasNativeMapbox()) {
    cached = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Mapbox = require('@rnmapbox/maps').default as MapboxModule;
    if (!Mapbox?.MapView) {
      cached = null;
      return null;
    }
    Mapbox.setAccessToken(
      process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.ey...mock_token_for_mvp',
    );
    cached = Mapbox;
    return cached;
  } catch {
    cached = null;
    return null;
  }
}

export const isMapboxAvailable = () => getMapbox() !== null;

export const mapUnavailableReason =
  Constants.appOwnership === 'expo' || Platform.OS === 'web'
    ? 'Map view needs a development build (not available in Expo Go).'
    : 'Map native module is not linked in this build.';
