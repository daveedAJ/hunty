import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedButton, ThemedCustomText } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';
import { Ionicons } from '@expo/vector-icons';

interface SecureViewProps {
  children: ReactNode;
  fallback?: ReactNode;
  blurAmount?: number;
  style?: ViewStyle;
  authPromptMessage?: string;
  lockOnBlur?: boolean;
}

export function SecureView({
  children,
  fallback,
  blurAmount = 10,
  style,
  authPromptMessage = 'Authentication required to view this content',
  lockOnBlur = true,
}: SecureViewProps) {
  const { colors } = useTheme();
  const { isAuthenticated, authenticate, lock } = useWalletSecurity();

  const handleUnlock = async () => {
    const result = await authenticate(authPromptMessage);
    if (!result.authenticated && result.requiresPin) {
      // PIN fallback will be handled by the provider's authenticate flow
      // The UI will show the PIN prompt modal if configured
    }
  };

  if (isAuthenticated) {
    return (
      <View style={[styles.container, style]}>
        {children}
      </View>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <View style={[styles.container, styles.lockedContainer, style]}>
      <View style={[styles.lockOverlay, { backgroundColor: colors.background + 'CC' }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
        </View>
        <ThemedCustomText variant="h3" style={styles.lockTitle}>
          Locked
        </ThemedCustomText>
        <ThemedCustomText variant="caption" color="text" style={styles.lockSubtitle}>
          {authPromptMessage}
        </ThemedCustomText>
        <ThemedButton
          text="Unlock"
          onPress={handleUnlock}
          size="sm"
          style={styles.unlockButton}
        />
      </View>
      {/* Render children blurred in background */}
      <View style={[styles.blurredContent, { opacity: 0.1 }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  lockedContainer: {
    minHeight: 120,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  lockOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
    borderRadius: 12,
    zIndex: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockTitle: {
    textAlign: 'center',
  },
  lockSubtitle: {
    textAlign: 'center',
    opacity: 0.8,
    maxWidth: 240,
  },
  unlockButton: {
    marginTop: 8,
    minWidth: 120,
  },
  blurredContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
});
