import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import { Platform } from 'react-native';

export type BiometricTypeName = 'Face ID' | 'Touch ID' | 'Face Unlock' | 'Fingerprint' | null;
export type WalletAuthReason = 'biometric_success' | 'biometric_failed' | 'pin_required' | 'biometrics_unavailable' | 'authentication_failed';

export type BiometricErrorCode =
  | 'no_hardware'
  | 'not_enrolled'
  | 'permission_denied'
  | 'authentication_failed'
  | 'device_locked'
  | 'storage_error'
  | 'unknown';

export class BiometricError extends Error {
  code: BiometricErrorCode;
  cause?: Error;

  constructor(code: BiometricErrorCode, message: string, cause?: Error) {
    super(message);
    this.code = code;
    this.cause = cause;
    this.name = 'BiometricError';
  }

  toUserMessage(): string {
    switch (this.code) {
      case 'no_hardware':
        return 'This device does not support biometric authentication.';
      case 'not_enrolled':
        return 'No biometric credentials are enrolled on this device. Please set up Face ID, Touch ID, or fingerprint in your device settings.';
      case 'permission_denied':
        return 'Biometric permission was denied. Please grant permission in your device settings.';
      case 'authentication_failed':
        return 'Biometric authentication failed. Please try again.';
      case 'device_locked':
        return 'Too many failed attempts. Your device is temporarily locked. Please try again later.';
      case 'storage_error':
        return 'Secure storage is unavailable. Please check your device settings.';
      default:
        return 'An unexpected biometric error occurred. Please try again.';
    }
  }
}

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
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware) {
      throw new BiometricError('no_hardware', 'Device does not have biometric hardware.');
    }

    if (!isEnrolled) {
      throw new BiometricError('not_enrolled', 'No biometric credentials are enrolled.');
    }

    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    }

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Fingerprint';
    }

    return null;
  } catch (error) {
    if (error instanceof BiometricError) {
      throw error;
    }
    throw new BiometricError('unknown', 'Failed to determine biometric type.', error instanceof Error ? error : undefined);
  }
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    return (await getSupportedBiometricType()) !== null;
  } catch {
    return false;
  }
}

export async function authenticateBiometric(promptMessage = 'Unlock Hunty Wallet'): Promise<boolean> {
  try {
    const isAvailable = await isBiometricAvailable();
    if (!isAvailable) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true,
    });

    if (!result.success && result.error) {
      const errorCode = mapAuthErrorToCode(result.error);
      throw new BiometricError(errorCode, result.error);
    }

    return result.success;
  } catch (error) {
    if (error instanceof BiometricError) {
      throw error;
    }
    throw new BiometricError('unknown', 'Biometric authentication encountered an unexpected error.', error instanceof Error ? error : undefined);
  }
}

function mapAuthErrorToCode(error: string): BiometricErrorCode {
  const lower = error.toLowerCase();
  if (lower.includes('lockout') || lower.includes('locked')) return 'device_locked';
  if (lower.includes('permission') || lower.includes('denied')) return 'permission_denied';
  if (lower.includes('enroll') || lower.includes('not set')) return 'not_enrolled';
  if (lower.includes('hardware') || lower.includes('not supported')) return 'no_hardware';
  return 'authentication_failed';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
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
  } catch (error) {
    if (error instanceof BiometricError) {
      throw error;
    }
    throw new BiometricError('storage_error', 'Failed to save biometric preference.', error instanceof Error ? error : undefined);
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

  try {
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
  } catch {
    throw new BiometricError('storage_error', 'Failed to save PIN securely.');
  }
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  return createPin(newPin);
}

export async function clearPin(): Promise<void> {
  try {
    await removeSecureItem(PIN_SALT_KEY);
    await removeSecureItem(PIN_HASH_KEY);
  } catch {
    throw new BiometricError('storage_error', 'Failed to remove PIN.');
  }
}

export async function getPinExists(): Promise<boolean> {
  try {
    const hash = await getSecureItem(PIN_HASH_KEY);
    return Boolean(hash);
  } catch {
    return false;
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const salt = await getSecureItem(PIN_SALT_KEY);
    const storedHash = await getSecureItem(PIN_HASH_KEY);
    if (!salt || !storedHash) return false;

    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${pin}`,
      { encoding: Crypto.CryptoEncoding.HEX },
    );

    return storedHash === hash;
  } catch {
    return false;
  }
}

export async function authenticateWithFallback(promptMessage = 'Unlock Hunty Wallet'): Promise<WalletAuthResult> {
  try {
    const biometricEnabled = await getBiometricEnabled();
    const biometricAvailable = await isBiometricAvailable();
    const pinExists = await getPinExists();

    if (biometricEnabled && biometricAvailable) {
      try {
        const success = await authenticateBiometric(promptMessage);
        if (success) {
          return { authenticated: true, requiresPin: false, reason: 'biometric_success' };
        }
      } catch (error) {
        // Biometric failed, fall through to PIN if available
        if (__DEV__) {
          console.warn('[WalletSecurity] Biometric auth failed:', error);
        }
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
  } catch (error) {
    if (error instanceof BiometricError) {
      return { authenticated: false, requiresPin: false, reason: 'biometrics_unavailable' };
    }
    return { authenticated: false, requiresPin: false, reason: 'authentication_failed' };
  }
}

export async function getBiometricStatus(): Promise<{ available: boolean; enabled: boolean; type: BiometricTypeName }> {
  try {
    const available = await isBiometricAvailable();
    const enabled = await getBiometricEnabled();
    const type = available ? await getSupportedBiometricType() : null;
    return { available, enabled, type };
  } catch {
    return { available: false, enabled: false, type: null };
  }
}

export async function storeWalletSecret(key: string, value: string): Promise<void> {
  try {
    await setSecureItem(key, value);
  } catch (error) {
    throw new BiometricError('storage_error', 'Failed to store wallet secret.', error instanceof Error ? error : undefined);
  }
}

export async function readWalletSecret(key: string): Promise<string | null> {
  try {
    return await getSecureItem(key);
  } catch {
    return null;
  }
}

export async function removeWalletSecret(key: string): Promise<void> {
  try {
    await removeSecureItem(key);
  } catch (error) {
    throw new BiometricError('storage_error', 'Failed to remove wallet secret.', error instanceof Error ? error : undefined);
  }
}
