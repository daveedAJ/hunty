import { useCallback } from 'react';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';

export function useWalletSecurityGate() {
  const { authenticate, verifyPinCode, isAuthenticated, pinSet } = useWalletSecurity();

  const requireWalletAccess = useCallback(async (reason = 'Access wallet details') => {
    const result = await authenticate(reason);
    if (result.authenticated) return true;

    if (result.requiresPin && pinSet) {
      return false;
    }

    return false;
  }, [authenticate, pinSet]);

  const authorizeSensitiveAction = useCallback(async (reason: string, pin?: string) => {
    if (isAuthenticated) return true;

    if (pin) {
      return verifyPinCode(pin);
    }

    return requireWalletAccess(reason);
  }, [isAuthenticated, requireWalletAccess, verifyPinCode]);

  return {
    requireWalletAccess,
    authorizeSensitiveAction,
    isAuthenticated,
    pinSet,
  };
}
