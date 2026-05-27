import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

export type PlayerLocation = {
  latitude: number;
  longitude: number;
};

export type LocationState = {
  location: PlayerLocation | null;
  error: string | null;
  loading: boolean;
};

export function usePlayerLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({ location: null, error: 'Location permission denied.', loading: false });
        return;
      }

      // Get a quick initial fix
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setState({
        location: { latitude: initial.coords.latitude, longitude: initial.coords.longitude },
        error: null,
        loading: false,
      });

      // Then watch for updates
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (pos) => {
          setState((prev) => ({
            ...prev,
            location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          }));
        }
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  return state;
}
