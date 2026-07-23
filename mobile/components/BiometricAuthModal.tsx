import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ThemedButton, ThemedCustomText } from '@components/themed';
import { useTheme } from '@providers/ThemeProvider';
import { useBiometricAuth } from '@hooks/useBiometricAuth';
import { Ionicons } from '@expo/vector-icons';

interface BiometricAuthModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  promptMessage?: string;
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (error: string) => void;
}

export function BiometricAuthModal({
  visible,
  title = 'Biometric Authentication',
  subtitle = 'Use your biometric to unlock this action.',
  promptMessage = 'Unlock Hunty Wallet',
  onSuccess,
  onCancel,
  onError,
}: BiometricAuthModalProps) {
  const { colors } = useTheme();
  const { available, enrolled, type, isAuthenticating, lastError, authenticate, clearError } = useBiometricAuth();
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (visible) {
      setHasAttempted(false);
      clearError();
    }
  }, [visible, clearError]);

  useEffect(() => {
    if (visible && !hasAttempted && !isAuthenticating) {
      setHasAttempted(true);
      void handleAuthenticate();
    }
  }, [visible, hasAttempted, isAuthenticating]);

  useEffect(() => {
    if (lastError && !isAuthenticating) {
      onError?.(lastError);
    }
  }, [lastError, isAuthenticating, onError]);

  const handleAuthenticate = async () => {
    const success = await authenticate(promptMessage);
    if (success) {
      onSuccess();
    } else if (!lastError?.toLowerCase().includes('cancel')) {
      // Don't call onCancel for user cancellation - let the user retry or dismiss
    }
  };

  const handleRetry = async () => {
    clearError();
    await handleAuthenticate();
  };

  const getBiometricIcon = (): keyof typeof Ionicons.glyphMap => {
    if (type === 'Face ID' || type === 'Face Unlock') return 'scan-outline';
    if (type === 'Touch ID' || type === 'Fingerprint') return 'finger-print-outline';
    return 'lock-closed-outline';
  };

  const getBiometricLabel = (): string => {
    if (!available) return 'Biometric authentication';
    if (!enrolled) return 'Biometric not enrolled';
    return type ?? 'Biometric authentication';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name={getBiometricIcon()} size={48} color={colors.primary} />
          </View>

          <ThemedCustomText variant="h2" style={styles.title}>
            {title}
          </ThemedCustomText>
          <ThemedCustomText variant="body" color="text" style={styles.subtitle}>
            {subtitle}
          </ThemedCustomText>

          <View style={[styles.statusBadge, { backgroundColor: colors.border + '40' }]}>
            <ThemedCustomText variant="caption" color="text">
              {getBiometricLabel()}
            </ThemedCustomText>
          </View>

          {lastError ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.error + '15', borderColor: colors.error + '30' }]}>
              <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
                {lastError}
              </ThemedCustomText>
            </View>
          ) : null}

          {isAuthenticating ? (
            <View style={styles.loadingContainer}>
              <ThemedCustomText variant="caption" color="text">
                Waiting for biometric...
              </ThemedCustomText>
            </View>
          ) : (
            <View style={styles.buttonRow}>
              {lastError && !lastError.toLowerCase().includes('cancel') ? (
                <ThemedButton
                  text="Retry"
                  onPress={handleRetry}
                  fullWidth
                  style={styles.retryButton}
                />
              ) : null}
              <ThemedButton
                text="Cancel"
                variant="ghost"
                onPress={onCancel}
                fullWidth
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 24,
  },
  sheet: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
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
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
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
  loadingContainer: {
    paddingVertical: 8,
  },
  buttonRow: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  retryButton: {
    marginBottom: 4,
  },
});
