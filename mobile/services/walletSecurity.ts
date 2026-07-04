import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import { Platform } from 'react-native';

export type BiometricTypeName = 'Face ID' | 'Touch ID' | 'Face Unlock' | 'Fingerprint' | null;
export type WalletAuthReason = 'biometric_success' | 'biometric_failed' | 'pin_required' | 'biometrics_unavailable' | 'authentication_failed';

const BIOMETRIC_ENABLED_KEY = 'hunty_biometric_enabled';
const BIOMETRIC_TYPE_KEY = 'hunty_biometric_type';
const PIN_HASH_KEY = 'hunty_pin_hash';
const PIN_SALT_KEY = 'hunty_pin_salt';

export type WalletAuthResult = {
  authenticated: boolean;
  requiresPin: boolean;
  reason?: WalletAuthReason;
};

const PIN_MIN_LENGTH = 4;

function normalizeBoolean(value: string | null): boolean {
  return value === 'true';
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function getSecureItem(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

async function removeSecureItem(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

export async function getSupportedBiometricType(): Promise<BiometricTypeName> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !isEnrolled) {
    return null;
  }

  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
  }

  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }

  return null;
}

export async function isBiometricAvailable(): Promise<boolean> {
  return (await getSupportedBiometricType()) !== null;
}

export async function authenticateBiometric(promptMessage = 'Unlock Hunty Wallet'): Promise<boolean> {
  const isAvailable = await isBiometricAvailable();
  if (!isAvailable) return false;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });

    return result.success;
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setSecureItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');

  if (enabled) {
    const currentType = await getSupportedBiometricType();
    if (currentType) {
      await setSecureItem(BIOMETRIC_TYPE_KEY, currentType);
    } else {
      await removeSecureItem(BIOMETRIC_TYPE_KEY);
    }
  } else {
    await removeSecureItem(BIOMETRIC_TYPE_KEY);
  }
}

export async function getBiometricEnabled(): Promise<boolean> {
  const value = await getSecureItem(BIOMETRIC_ENABLED_KEY);
  return normalizeBoolean(value);
}

export async function getStoredBiometricType(): Promise<BiometricTypeName> {
  const stored = await getSecureItem(BIOMETRIC_TYPE_KEY);
  return stored ? (stored as BiometricTypeName) : null;
}

export async function createPin(pin: string): Promise<boolean> {
  if (typeof pin !== 'string' || !/^\d+$/.test(pin) || pin.length < PIN_MIN_LENGTH) {
    return false;
  }

  const saltBytes = await Random.getRandomBytesAsync(16);
  const salt = toHex(saltBytes);
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  await setSecureItem(PIN_SALT_KEY, salt);
  await setSecureItem(PIN_HASH_KEY, hash);
  return true;
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  return createPin(newPin);
}

export async function clearPin(): Promise<void> {
  await removeSecureItem(PIN_SALT_KEY);
  await removeSecureItem(PIN_HASH_KEY);
}

export async function getPinExists(): Promise<boolean> {
  const hash = await getSecureItem(PIN_HASH_KEY);
  return Boolean(hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await getSecureItem(PIN_SALT_KEY);
  const storedHash = await getSecureItem(PIN_HASH_KEY);
  if (!salt || !storedHash) return false;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
    { encoding: Crypto.CryptoEncoding.HEX },
  );

  return storedHash === hash;
}

export async function authenticateWithFallback(promptMessage = 'Unlock Hunty Wallet'): Promise<WalletAuthResult> {
  const biometricEnabled = await getBiometricEnabled();
  const biometricAvailable = await isBiometricAvailable();
  const pinExists = await getPinExists();

  if (biometricEnabled && biometricAvailable) {
    const success = await authenticateBiometric(promptMessage);
    if (success) {
      return { authenticated: true, requiresPin: false, reason: 'biometric_success' };
    }

    return {
      authenticated: false,
      requiresPin: pinExists,
      reason: pinExists ? 'biometric_failed' : 'authentication_failed',
    };
  }

  if (pinExists) {
    return { authenticated: false, requiresPin: true, reason: 'pin_required' };
  }

  return { authenticated: false, requiresPin: false, reason: 'biometrics_unavailable' };
}

export async function getBiometricStatus(): Promise<{ available: boolean; enabled: boolean; type: BiometricTypeName }> {
  const available = await isBiometricAvailable();
  const enabled = await getBiometricEnabled();
  const type = available ? await getSupportedBiometricType() : null;
  return { available, enabled, type };
}

export async function storeWalletSecret(key: string, value: string): Promise<void> {
  await setSecureItem(key, value);
}

export async function readWalletSecret(key: string): Promise<string | null> {
  return getSecureItem(key);
}

export async function removeWalletSecret(key: string): Promise<void> {
  await removeSecureItem(key);
}
