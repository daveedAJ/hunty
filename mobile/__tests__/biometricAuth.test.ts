import React from 'react';
import { Platform } from 'react-native';
import { View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';
import * as Random from 'expo-random';
import { render, waitFor, act } from '@testing-library/react-native';
import { ToastProvider } from '@providers/ToastProvider';
import { WalletSecurityProvider, useWalletSecurity } from '@providers/WalletSecurityProvider';
import {
  authenticateBiometric,
  authenticateWithFallback,
  createPin,
  getSupportedBiometricType,
  verifyPin,
  BiometricError,
  getBiometricStatus,
  storeWalletSecret,
  readWalletSecret,
  removeWalletSecret,
} from '@services/walletSecurity';
import { useBiometricAuth } from '@hooks/useBiometricAuth';
import { BiometricAuthModal } from '@components/BiometricAuthModal';
import { SecureView } from '@components/SecureView';
import { AuthGuard } from '@components/AuthGuard';

jest.mock('expo-secure-store');
jest.mock('expo-local-authentication');
jest.mock('expo-crypto');
jest.mock('expo-random');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockLocalAuth = LocalAuthentication as jest.Mocked<typeof LocalAuthentication>;
const mockCrypto = Crypto as jest.Mocked<typeof Crypto>;
const mockRandom = Random as jest.Mocked<typeof Random>;

function TestConsumer() {
  const { authenticate, verifyPinCode, isAuthenticated, lock } = useWalletSecurity();

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(View, { testID: 'auth-state' }, isAuthenticated ? 'authenticated' : 'locked'),
    React.createElement(
      View,
      { testID: 'trigger', onTouchEnd: async () => { await authenticate('Test'); } },
    ),
    React.createElement(
      View,
      { testID: 'pin-verify', onTouchEnd: async () => { await verifyPinCode('1234'); } },
    ),
    React.createElement(
      View,
      { testID: 'lock', onTouchEnd: () => { lock(); } },
    ),
  );
}

function TestBiometricConsumer() {
  const result = useBiometricAuth();
  return React.createElement(
    View,
    { testID: 'biometric-state' },
    React.createElement(View, { testID: 'available' }, String(result.available)),
    React.createElement(View, { testID: 'enrolled' }, String(result.enrolled)),
    React.createElement(View, { testID: 'type' }, String(result.type)),
    React.createElement(View, { testID: 'authenticating' }, String(result.isAuthenticating)),
    React.createElement(View, { testID: 'error' }, result.lastError ?? ''),
    React.createElement(
      View,
      { testID: 'auth-btn', onTouchEnd: () => result.authenticate('Test') },
    ),
    React.createElement(
      View,
      { testID: 'refresh-btn', onTouchEnd: () => result.refreshStatus() },
    ),
    React.createElement(
      View,
      { testID: 'clear-btn', onTouchEnd: () => result.clearError() },
    ),
  );
}

describe('walletSecurity service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });
    mockRandom.getRandomBytesAsync.mockResolvedValue(new Uint8Array([171, 205, 239]));
    mockCrypto.digestStringAsync.mockResolvedValue('EXPECTED_HASH');
  });

  describe('BiometricError', () => {
    it('provides user-friendly messages for each error code', () => {
      const errors: BiometricError[] = [
        new BiometricError('no_hardware', 'No hardware'),
        new BiometricError('not_enrolled', 'Not enrolled'),
        new BiometricError('permission_denied', 'Permission denied'),
        new BiometricError('authentication_failed', 'Auth failed'),
        new BiometricError('device_locked', 'Device locked'),
        new BiometricError('storage_error', 'Storage error'),
        new BiometricError('unknown', 'Unknown'),
      ];

      errors.forEach((err) => {
        expect(err.toUserMessage()).not.toBe('An unexpected biometric error occurred.');
      });
    });

    it('returns default message for unknown error code', () => {
      const error = new BiometricError('unknown' as any, 'test');
      expect(error.toUserMessage()).toBe('An unexpected biometric error occurred. Please try again.');
    });
  });

  describe('getSupportedBiometricType', () => {
    it('detects Face ID on iOS when facial recognition is supported', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const type = await getSupportedBiometricType();
      expect(type).toBe('Face ID');
    });

    it('detects Face Unlock on Android when facial recognition is supported', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const originalOS = Platform.OS;
      (Platform as any).OS = 'android';

      const type = await getSupportedBiometricType();
      expect(type).toBe('Face Unlock');

      (Platform as any).OS = originalOS;
    });

    it('detects Fingerprint when supported', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);

      const type = await getSupportedBiometricType();
      expect(type).toBe('Fingerprint');
    });

    it('returns null when no hardware is available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      const type = await getSupportedBiometricType();
      expect(type).toBeNull();
    });

    it('returns null when biometrics are not enrolled', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const type = await getSupportedBiometricType();
      expect(type).toBeNull();
    });

    it('throws BiometricError when hardware check fails', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Hardware check failed'));

      await expect(getSupportedBiometricType()).rejects.toThrow(BiometricError);
    });
  });

  describe('isBiometricAvailable', () => {
    it('returns true when biometrics are available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);

      const available = await isBiometricAvailable();
      expect(available).toBe(true);
    });

    it('returns false when biometrics are not available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      const available = await isBiometricAvailable();
      expect(available).toBe(false);
    });
  });

  describe('authenticateBiometric', () => {
    it('returns true on successful authentication', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

      const result = await authenticateBiometric('Test prompt');
      expect(result).toBe(true);
    });

    it('returns false when biometrics are unavailable', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);

      const result = await authenticateBiometric('Test prompt');
      expect(result).toBe(false);
    });

    it('throws BiometricError on authentication failure', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockLocalAuth.authenticateAsync.mockResolvedValue({
        success: false,
        error: 'device_locked',
      });

      await expect(authenticateBiometric('Test prompt')).rejects.toThrow(BiometricError);
    });

    it('throws BiometricError on unexpected error', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockLocalAuth.authenticateAsync.mockRejectedValue(new Error('Unexpected error'));

      await expect(authenticateBiometric('Test prompt')).rejects.toThrow(BiometricError);
    });
  });

  describe('PIN management', () => {
    it('creates and verifies a PIN correctly', async () => {
      const salt = 'abcdef0123456789';
      mockRandom.getRandomBytesAsync.mockResolvedValue(new Uint8Array([171, 205, 239]));
      mockCrypto.digestStringAsync.mockResolvedValue('EXPECTED_HASH');

      const created = await createPin('1234');
      expect(created).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_salt', expect.any(String));
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('hunty_pin_hash', 'EXPECTED_HASH');

      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'hunty_pin_salt') return salt;
        if (key === 'hunty_pin_hash') return 'EXPECTED_HASH';
        return null;
      });

      const verified = await verifyPin('1234');
      expect(verified).toBe(true);
    });

    it('rejects invalid PIN formats', async () => {
      expect(await createPin('abc')).toBe(false);
      expect(await createPin('12')).toBe(false);
      expect(await createPin('')).toBe(false);
      expect(await createPin('12345a')).toBe(false);
    });

    it('returns false for wrong PIN', async () => {
      mockRandom.getRandomBytesAsync.mockResolvedValue(new Uint8Array([171, 205, 239]));
      mockCrypto.digestStringAsync.mockResolvedValue('EXPECTED_HASH');
      await createPin('1234');

      mockCrypto.digestStringAsync.mockResolvedValue('WRONG_HASH');
      const verified = await verifyPin('1234');
      expect(verified).toBe(false);
    });
  });

  describe('authenticateWithFallback', () => {
    it('returns requiresPin when biometric fails but PIN exists', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'hunty_biometric_enabled') return 'true';
        if (key === 'hunty_pin_hash') return 'HASH';
        return null;
      });
      mockCrypto.digestStringAsync.mockResolvedValue('HASH');

      const result = await authenticateWithFallback();
      expect(result.requiresPin).toBe(true);
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('biometric_failed');
    });

    it('reports unavailable when biometrics unavailable and no PIN exists', async () => {
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        if (key === 'hunty_biometric_enabled') return 'true';
        return null;
      });
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);

      const result = await authenticateWithFallback();
      expect(result.authenticated).toBe(false);
      expect(result.requiresPin).toBe(false);
      expect(result.reason).toBe('biometrics_unavailable');
    });
  });

  describe('getBiometricStatus', () => {
    it('returns correct status when biometrics are available', async () => {
      mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
      mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
      mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      mockSecureStore.getItemAsync.mockResolvedValue('true');

      const status = await getBiometricStatus();
      expect(status.available).toBe(true);
      expect(status.enabled).toBe(true);
      expect(status.type).toBe('Face ID');
    });

    it('returns safe defaults on error', async () => {
      mockLocalAuth.hasHardwareAsync.mockRejectedValue(new Error('Error'));

      const status = await getBiometricStatus();
      expect(status.available).toBe(false);
      expect(status.enabled).toBe(false);
      expect(status.type).toBeNull();
    });
  });

  describe('secure wallet secret storage', () => {
    it('stores and retrieves wallet secrets', async () => {
      await storeWalletSecret('test_key', 'test_value');
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('test_key', 'test_value');

      mockSecureStore.getItemAsync.mockResolvedValue('test_value');
      const value = await readWalletSecret('test_key');
      expect(value).toBe('test_value');
    });

    it('returns null when reading non-existent secret', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      const value = await readWalletSecret('non_existent');
      expect(value).toBeNull();
    });

    it('removes wallet secrets', async () => {
      await removeWalletSecret('test_key');
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('test_key');
    });

    it('throws BiometricError on storage failure', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Storage full'));

      await expect(storeWalletSecret('key', 'value')).rejects.toThrow(BiometricError);
    });
  });
});

describe('WalletSecurityProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });
    mockRandom.getRandomBytesAsync.mockResolvedValue(new Uint8Array([171, 205, 239]));
    mockCrypto.digestStringAsync.mockResolvedValue('EXPECTED_HASH');
  });

  it('initializes with default state', async () => {
    const { getByTestId } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null, React.createElement(TestConsumer)),
      ),
    );

    await waitFor(() => expect(getByTestId('auth-state').props.children).toBe('locked'));
  });

  it('authenticates via biometric when available', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    const { getByTestId } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null, React.createElement(TestConsumer)),
      ),
    );

    await waitFor(() => getByTestId('trigger').props.onPress());

    await waitFor(() => expect(getByTestId('auth-state').props.children).toBe('authenticated'));
  });

  it('falls back to PIN when biometric fails', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });
    mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
      if (key === 'hunty_biometric_enabled') return 'true';
      if (key === 'hunty_pin_hash') return 'EXPECTED_HASH';
      if (key === 'hunty_pin_salt') return 'SALT';
      return null;
    });
    mockCrypto.digestStringAsync.mockResolvedValue('EXPECTED_HASH');

    const { getByTestId } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null, React.createElement(TestConsumer)),
      ),
    );

    await waitFor(() => getByTestId('trigger').props.onPress());

    // Should require PIN after biometric failure
    await waitFor(() => expect(getByTestId('auth-state').props.children).toBe('locked'));
  });

  it('locks wallet when lock is called', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    const { getByTestId } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null, React.createElement(TestConsumer)),
      ),
    );

    await waitFor(() => getByTestId('trigger').props.onPress());
    await waitFor(() => expect(getByTestId('auth-state').props.children).toBe('authenticated'));

    act(() => getByTestId('lock').props.onPress());
    await waitFor(() => expect(getByTestId('auth-state').props.children).toBe('locked'));
  });
});

describe('useBiometricAuth hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(false);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(false);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });
  });

  it('initializes with unavailable state', async () => {
    const { getByTestId } = render(
      React.createElement(ToastProvider, null, React.createElement(TestBiometricConsumer)),
    );

    await waitFor(() => {
      expect(getByTestId('available').props.children).toBe('false');
      expect(getByTestId('enrolled').props.children).toBe('false');
      expect(getByTestId('type').props.children).toBe('null');
    });
  });

  it('detects Face ID availability', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);

    const { getByTestId } = render(
      React.createElement(ToastProvider, null, React.createElement(TestBiometricConsumer)),
    );

    await waitFor(() => {
      expect(getByTestId('available').props.children).toBe('true');
      expect(getByTestId('enrolled').props.children).toBe('true');
      expect(getByTestId('type').props.children).toBe('Face ID');
    });
  });

  it('detects Fingerprint availability', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FINGERPRINT,
    ]);

    const { getByTestId } = render(
      React.createElement(ToastProvider, null, React.createElement(TestBiometricConsumer)),
    );

    await waitFor(() => {
      expect(getByTestId('available').props.children).toBe('true');
      expect(getByTestId('type').props.children).toBe('Fingerprint');
    });
  });

  it('sets authenticating state during auth', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100)),
    );

    const { getByTestId } = render(
      React.createElement(ToastProvider, null, React.createElement(TestBiometricConsumer)),
    );

    await waitFor(() => expect(getByTestId('available').props.children).toBe('true'));

    act(() => getByTestId('auth-btn').props.onTouchEnd());

    await waitFor(() => expect(getByTestId('authenticating').props.children).toBe('true'));
    await waitFor(() => expect(getByTestId('authenticating').props.children).toBe('false'));
  });

  it('clears error when clearError is called', async () => {
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'failed' });

    const { getByTestId } = render(
      React.createElement(ToastProvider, null, React.createElement(TestBiometricConsumer)),
    );

    await waitFor(() => expect(getByTestId('available').props.children).toBe('true'));

    act(() => getByTestId('auth-btn').props.onTouchEnd());
    await waitFor(() => expect(getByTestId('error').props.children).not.toBe(''));

    act(() => getByTestId('clear-btn').props.onTouchEnd());
    await waitFor(() => expect(getByTestId('error').props.children).toBe(''));
  });
});

describe('BiometricAuthModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
  });

  it('renders when visible', () => {
    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(BiometricAuthModal, {
          visible: true,
          onSuccess: jest.fn(),
          onCancel: jest.fn(),
        }),
      ),
    );

    expect(getByText('Biometric Authentication')).toBeTruthy();
  });

  it('calls onSuccess on successful authentication', async () => {
    const onSuccess = jest.fn();
    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(BiometricAuthModal, {
          visible: true,
          onSuccess,
          onCancel: jest.fn(),
        }),
      ),
    );

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('calls onCancel when cancel is pressed', async () => {
    const onCancel = jest.fn();
    mockLocalAuth.authenticateAsync.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: false, error: 'user_cancel' }), 50)),
    );

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(BiometricAuthModal, {
          visible: true,
          onSuccess: jest.fn(),
          onCancel,
        }),
      ),
    );

    await waitFor(() => getByText('Cancel').props.onPress());
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows retry button on auth failure', async () => {
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false, error: 'auth_failed' });

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(BiometricAuthModal, {
          visible: true,
          onSuccess: jest.fn(),
          onCancel: jest.fn(),
        }),
      ),
    );

    await waitFor(() => getByText('Retry'));
  });
});

describe('SecureView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
  });

  it('renders children when authenticated', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('true');

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(SecureView, null,
            React.createElement('Text', null, 'Secret Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Secret Content'));
  });

  it('shows lock screen when not authenticated', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(SecureView, null,
            React.createElement('Text', null, 'Secret Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Locked'));
  });

  it('renders custom fallback when provided', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(SecureView, { fallback: React.createElement('Text', null, 'Custom Fallback') },
            React.createElement('Text', null, 'Secret Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Custom Fallback'));
  });
});

describe('AuthGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalAuth.hasHardwareAsync.mockResolvedValue(true);
    mockLocalAuth.isEnrolledAsync.mockResolvedValue(true);
    mockLocalAuth.supportedAuthenticationTypesAsync.mockResolvedValue([
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    ]);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });
  });

  it('renders children when authenticated', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('true');

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(AuthGuard, null,
            React.createElement('Text', null, 'Protected Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Protected Content'));
  });

  it('shows lock screen when not authenticated', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(AuthGuard, null,
            React.createElement('Text', null, 'Protected Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Authentication Required'));
  });

  it('renders children when requireAuth is false', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(AuthGuard, { requireAuth: false },
            React.createElement('Text', null, 'Public Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Public Content'));
  });

  it('calls onAuthenticated callback when auth succeeds', async () => {
    const onAuthenticated = jest.fn();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: true });

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(AuthGuard, { onAuthenticated },
            React.createElement('Text', null, 'Protected Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Authentication Required'));
    act(() => getByText('Authenticate').props.onPress());
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalled());
  });

  it('calls onAuthFailed callback when auth fails', async () => {
    const onAuthFailed = jest.fn();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockLocalAuth.authenticateAsync.mockResolvedValue({ success: false });

    const { getByText } = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(WalletSecurityProvider, null,
          React.createElement(AuthGuard, { onAuthFailed },
            React.createElement('Text', null, 'Protected Content'),
          ),
        ),
      ),
    );

    await waitFor(() => getByText('Authentication Required'));
    act(() => getByText('Authenticate').props.onPress());
    await waitFor(() => expect(onAuthFailed).toHaveBeenCalled());
  });
});
