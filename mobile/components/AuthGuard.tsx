import React, { ReactNode, useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedButton, ThemedCustomText } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';
import { Ionicons } from '@expo/vector-icons';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  authPromptMessage?: string;
  onAuthenticated?: () => void;
  onAuthFailed?: () => void;
  style?: ViewStyle;
  showLockScreen?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  authPromptMessage = 'Authentication required to access this feature',
  onAuthenticated,
  onAuthFailed,
  style,
  showLockScreen = true,
}: AuthGuardProps) {
  const { colors } = useTheme();
  const { isAuthenticated, authenticate, authError, lock } = useWalletSecurity();
  const [isChecking, setIsChecking] = useState(!isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      setIsChecking(false);
      onAuthenticated?.();
    }
  }, [isAuthenticated, onAuthenticated]);

  const handleAuthenticate = async () => {
    setIsChecking(true);
    try {
      const result = await authenticate(authPromptMessage);
      if (!result.authenticated) {
        onAuthFailed?.();
      }
    } finally {
      setIsChecking(false);
    }
  };

  // If auth is not required, render children directly
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If already authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If custom fallback is provided, render it
  if (fallback) {
    return <>{fallback}</>;
  }

  // If we shouldn't show the lock screen, render nothing or children
  if (!showLockScreen) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.lockScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
        </View>

        <ThemedCustomText variant="h2" style={styles.title}>
          Authentication Required
        </ThemedCustomText>
        <ThemedCustomText variant="body" color="text" style={styles.subtitle}>
          {authPromptMessage}
        </ThemedCustomText>

        {authError ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
            <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
              {authError}
            </ThemedCustomText>
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <ThemedButton
            text="Authenticate"
            onPress={handleAuthenticate}
            loading={isChecking}
            fullWidth
            style={styles.authButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.8,
    maxWidth: 280,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  errorText: {
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    marginTop: 8,
  },
  authButton: {
    minHeight: 48,
  },
});
