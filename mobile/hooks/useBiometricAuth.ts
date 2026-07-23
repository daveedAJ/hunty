import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  authenticateBiometric,
  getBiometricStatus,
  getSupportedBiometricType,
  isBiometricAvailable,
  BiometricTypeName,
} from '@services/walletSecurity';

export type BiometricAuthState = {
  available: boolean;
  enrolled: boolean;
  type: BiometricTypeName;
  isAuthenticating: boolean;
  lastError: string | null;
};

export type BiometricAuthActions = {
  authenticate: (promptMessage?: string) => Promise<boolean>;
  refreshStatus: () => Promise<void>;
  clearError: () => void;
};

export type UseBiometricAuthReturn = BiometricAuthState & BiometricAuthActions;

const initialState: BiometricAuthState = {
  available: false,
  enrolled: false,
  type: null,
  isAuthenticating: false,
  lastError: null,
};

export function useBiometricAuth(): UseBiometricAuthReturn {
  const [state, setState] = useState<BiometricAuthState>(initialState);

  const refreshStatus = useCallback(async () => {
    try {
      const [hasHardware, isEnrolled, supportedTypes] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);

      const available = hasHardware && isEnrolled && supportedTypes.length > 0;
      let type: BiometricTypeName = null;

      if (available) {
        type = await getSupportedBiometricType();
      }

      setState((prev) => ({
        ...prev,
        available,
        enrolled: isEnrolled,
        type,
        lastError: null,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check biometric status.';
      setState((prev) => ({
        ...prev,
        available: false,
        enrolled: false,
        type: null,
        lastError: message,
      }));
    }
  }, []);

  const authenticate = useCallback(async (promptMessage = 'Unlock Hunty Wallet'): Promise<boolean> => {
    setState((prev) => ({ ...prev, isAuthenticating: true, lastError: null }));

    try {
      if (!state.available) {
        setState((prev) => ({
          ...prev,
          isAuthenticating: false,
          lastError: 'Biometric authentication is not available on this device.',
        }));
        return false;
      }

      const success = await authenticateBiometric(promptMessage);

      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        lastError: success ? null : 'Biometric authentication failed or was canceled.',
      }));

      return success;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Biometric authentication encountered an error.';
      setState((prev) => ({
        ...prev,
        isAuthenticating: false,
        lastError: message,
      }));
      return false;
    }
  }, [state.available]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, lastError: null }));
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  return {
    ...state,
    authenticate,
    refreshStatus,
    clearError,
  };
}
 
