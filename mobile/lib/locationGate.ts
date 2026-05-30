import * as Location from 'expo-location';
import type { Clue } from '@lib/types';

const DEFAULT_GEOFENCE_RADIUS_METERS = 100;

export type GeofenceCheckResult =
  | { allowed: true; distanceMeters: number; radiusMeters: number }
  | { allowed: false; reason: string; distanceMeters?: number; radiusMeters?: number };

type GeofencedClue = Clue & {
  latitude: number;
  longitude: number;
  geofenceRadiusMeters?: number;
};

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function getDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(lonDelta / 2) *
      Math.sin(lonDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hasClueGeofence(clue: Clue): clue is GeofencedClue {
  const candidate = clue as GeofencedClue;
  return (
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude)
  );
}

export async function verifyClueGeofence(clue: Clue): Promise<GeofenceCheckResult> {
  if (!hasClueGeofence(clue)) {
    return {
      allowed: false,
      reason: 'This clue is missing geofence coordinates, so the answer cannot be submitted yet.',
    };
  }

  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') {
    return {
      allowed: false,
      reason: 'Location permission is required before submitting this clue answer.',
    };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });

    const radiusMeters =
      typeof clue.geofenceRadiusMeters === 'number' && clue.geofenceRadiusMeters > 0
        ? clue.geofenceRadiusMeters
        : DEFAULT_GEOFENCE_RADIUS_METERS;

    const distanceMeters = getDistanceMeters(
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      {
        latitude: clue.latitude,
        longitude: clue.longitude,
      },
    );

    if (distanceMeters > radiusMeters) {
      return {
        allowed: false,
        distanceMeters,
        radiusMeters,
        reason: `You need to be within ${Math.round(radiusMeters)} m of this clue before submitting.`,
      };
    }

    return {
      allowed: true,
      distanceMeters,
      radiusMeters,
    };
  } catch {
    return {
      allowed: false,
      reason: 'Unable to confirm your GPS location. Check location services and try again.',
    };
  }
}
