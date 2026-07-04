import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedInput, ThemedView } from '@components/themed';
import { SettingsSection } from '@components/settings/SettingsSection';
import { SettingsRow } from '@components/settings/SettingsRow';
import { PinPromptModal } from '@components/PinPromptModal';
import { useTheme } from '@providers/ThemeProvider';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';

export default function WalletSecurityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    initialized,
    biometricAvailable,
    biometricType,
    biometricEnabled,
    pinSet,
    authError,
    authenticate,
    verifyPinCode,
    enableBiometrics,
    disableBiometrics,
    setPin,
    updatePin,
    removePin,
    lock,
  } = useWalletSecurity();

  const [pin, setPinValue] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [pinPromptVisible, setPinPromptVisible] = useState(false);
  const [pendingSecurityAction, setPendingSecurityAction] = useState<(() => Promise<void>) | null>(null);

  const biometricLabel = biometricAvailable ? biometricType ?? 'Biometric authentication' : 'Biometric authentication is unavailable';

  const canSavePin = pin.length >= 4 && pin === confirmPin;
  const canChangePin = !!currentPin && newPin.length >= 4;

  const runProtectedAction = async (action: () => Promise<void>, reason = 'Authorize wallet security change') => {
    const auth = await authenticate(reason);
    if (auth.authenticated) {
      await action();
      return true;
    }

    if (auth.requiresPin && pinSet) {
      setPendingSecurityAction(() => action);
      setPinPromptVisible(true);
      return false;
    }

    Alert.alert('Authentication required', 'Complete wallet authentication to continue.');
    return false;
  };

  const handleToggleBiometrics = async () => {
    setIsSubmitting(true);
    try {
      if (biometricEnabled) {
        await runProtectedAction(async () => {
          await disableBiometrics();
        }, 'Disable biometric authentication');
      } else {
        const enabled = await runProtectedAction(async () => {
          const success = await enableBiometrics();
          if (!success) {
            Alert.alert('Biometric setup', 'Biometric authentication could not be enabled.');
          }
        }, 'Enable biometric authentication');

        if (!enabled) {
          setOperationMessage('Biometric authentication could not be enabled.');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePin = async () => {
    setIsSubmitting(true);
    setOperationMessage(null);
    try {
      if (pin !== confirmPin) {
        setOperationMessage('PIN entries must match.');
        return;
      }

      const created = await runProtectedAction(async () => {
        const success = await setPin(pin);
        if (success) {
          setPinValue('');
          setConfirmPin('');
          setOperationMessage('PIN saved securely.');
        }
      }, 'Create wallet PIN');

      if (!created) {
        setOperationMessage('Authentication is required to save the PIN.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePin = async () => {
    setIsSubmitting(true);
    setOperationMessage(null);
    try {
      const changed = await runProtectedAction(async () => {
        const success = await updatePin(currentPin, newPin);
        if (success) {
          setCurrentPin('');
          setNewPin('');
          setOperationMessage('PIN updated successfully.');
        }
      }, 'Change wallet PIN');

      if (!changed) {
        setOperationMessage('Authentication is required to change the PIN.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePin = async () => {
    setIsSubmitting(true);
    setOperationMessage(null);
    try {
      await runProtectedAction(async () => {
        await removePin();
      }, 'Remove wallet PIN');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinSubmit = async (pinValue: string) => {
    const verified = await verifyPinCode(pinValue);
    if (!verified) {
      return false;
    }

    const action = pendingSecurityAction;
    setPendingSecurityAction(null);
    setPinPromptVisible(false);

    if (action) {
      await action();
    }

    return true;
  };

  const description = useMemo(() => {
    if (!initialized) return 'Loading security settings…';
    if (!biometricAvailable) return 'Biometric authentication is not supported on this device.';
    if (!biometricEnabled) return `Use ${biometricLabel} to protect sensitive wallet actions.`;
    return `Enabled: ${biometricLabel}`;
  }, [initialized, biometricAvailable, biometricEnabled, biometricLabel]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedCustomText variant="h2" weight="800">
          Wallet Security
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.subtitle}>
          Protect your wallet actions with secure biometric unlock and a PIN fallback.
        </ThemedCustomText>

        <SettingsSection title="Biometric Authentication">
          <SettingsRow
            icon="finger-print-outline"
            label="Enable Biometric Authentication"
            description={description}
            type="toggle"
            value={biometricEnabled}
            onToggle={handleToggleBiometrics}
          />
          {biometricEnabled && biometricAvailable ? (
            <ThemedCustomText variant="caption">Detected biometric type: {biometricLabel}</ThemedCustomText>
          ) : null}
        </SettingsSection>

        <SettingsSection title="PIN Code Fallback">
          {pinSet ? (
            <>
              <ThemedCustomText variant="caption" style={styles.sectionCaption}>
                A PIN is available as a fallback when biometrics are unavailable or fail.
              </ThemedCustomText>
              <ThemedInput
                placeholder="Current PIN"
                secureTextEntry
                value={currentPin}
                onChangeText={setCurrentPin}
              />
              <ThemedInput
                placeholder="New PIN"
                secureTextEntry
                value={newPin}
                onChangeText={setNewPin}
              />
              <ThemedButton
                text="Change PIN"
                onPress={handleChangePin}
                disabled={!canChangePin}
                isLoading={isSubmitting}
              />
              <ThemedButton
                text="Remove PIN"
                variant="destructive"
                onPress={handleRemovePin}
                isLoading={isSubmitting}
              />
            </>
          ) : (
            <>
              <ThemedCustomText variant="caption" style={styles.sectionCaption}>
                Create a secure PIN for fallback access when biometrics are unavailable.
              </ThemedCustomText>
              <ThemedInput
                placeholder="New PIN"
                secureTextEntry
                value={pin}
                onChangeText={setPinValue}
              />
              <ThemedInput
                placeholder="Confirm PIN"
                secureTextEntry
                value={confirmPin}
                onChangeText={setConfirmPin}
              />
              <ThemedButton
                text="Save PIN"
                onPress={handleCreatePin}
                disabled={!canSavePin}
                isLoading={isSubmitting}
              />
            </>
          )}
          {operationMessage ? (
            <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
              {operationMessage}
            </ThemedCustomText>
          ) : null}
          {authError ? (
            <ThemedCustomText variant="caption" color="error" style={styles.errorText}>
              {authError}
            </ThemedCustomText>
          ) : null}
        </SettingsSection>

        <SettingsSection title="Active Protection">
          <ThemedButton text="Lock wallet now" variant="ghost" onPress={lock} fullWidth />
          <ThemedButton text="Back to Settings" variant="ghost" onPress={() => router.back()} fullWidth />
        </SettingsSection>
      </ScrollView>

      <PinPromptModal
        visible={pinPromptVisible}
        title="Verify your PIN"
        error={authError}
        onCancel={() => {
          setPinPromptVisible(false);
          setPendingSecurityAction(null);
        }}
        onSubmit={handlePinSubmit}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  subtitle: { opacity: 0.75 },
  sectionCaption: { opacity: 0.8, marginBottom: 12 },
  errorText: { marginTop: 8 },
});
