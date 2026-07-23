import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { SettingsSection } from '@components/settings/SettingsSection';
import { SettingsRow } from '@components/settings/SettingsRow';
import { useTheme } from '@providers/ThemeProvider';
import { useToast } from '@providers/ToastProvider';
import { useWalletStore } from '@store/useStore';
import { useWalletSecurity } from '@providers/WalletSecurityProvider';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { network, walletAddress, isConnected, clearWallet } = useWalletStore();
  const { biometricAvailable, biometricEnabled, pinSet, isAuthenticated, lock } = useWalletSecurity();

  const walletStatus = useMemo(() => {
    if (!isConnected) return 'Not connected';
    if (network === 'mainnet') return 'Mainnet';
    return 'Testnet';
  }, [isConnected, network]);

  const handleDisconnect = async () => {
    await clearWallet();
    showToast({ message: 'Wallet disconnected.', type: 'info' });
    router.back();
  };

  const handleLockWallet = () => {
    lock();
    showToast({ message: 'Wallet locked.', type: 'info' });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedCustomText variant="h2" weight="800">
          Settings
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.subtitle}>
          Manage your app preferences and wallet security.
        </ThemedCustomText>

        <SettingsSection title="Wallet">
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Wallet Security"
            description="Protect wallet actions with biometrics and PIN fallback"
            type="navigate"
            onPress={() => router.push('/settings/wallet')}
          />
          <SettingsRow
            icon="log-out-outline"
            label="Disconnect Wallet"
            description="Sign out and unlink this device"
            type="destructive"
            onPress={handleDisconnect}
          />
        </SettingsSection>

        <SettingsSection title="Security Status">
          <View style={[styles.statusCard, { backgroundColor: colors.border + '20', borderColor: colors.border }]}>
            <View style={styles.statusRow}>
              <ThemedCustomText variant="caption" color="text">
                Connection
              </ThemedCustomText>
              <ThemedCustomText variant="caption" weight="600" color={isConnected ? 'success' : 'error'}>
                {walletStatus}
              </ThemedCustomText>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statusRow}>
              <ThemedCustomText variant="caption" color="text">
                Biometric Auth
              </ThemedCustomText>
              <ThemedCustomText variant="caption" weight="600" color={biometricEnabled ? 'success' : 'text'}>
                {biometricEnabled ? 'Enabled' : 'Disabled'}
              </ThemedCustomText>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statusRow}>
              <ThemedCustomText variant="caption" color="text">
                PIN Fallback
              </ThemedCustomText>
              <ThemedCustomText variant="caption" weight="600" color={pinSet ? 'success' : 'text'}>
                {pinSet ? 'Set' : 'Not set'}
              </ThemedCustomText>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.statusRow}>
              <ThemedCustomText variant="caption" color="text">
                Session
              </ThemedCustomText>
              <ThemedCustomText variant="caption" weight="600" color={isAuthenticated ? 'success' : 'warning'}>
                {isAuthenticated ? 'Active' : 'Locked'}
              </ThemedCustomText>
            </View>
          </View>
          <ThemedButton
            text="Lock Wallet Now"
            variant="ghost"
            onPress={handleLockWallet}
            fullWidth
            disabled={!isAuthenticated}
          />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <SettingsRow
            icon="color-palette-outline"
            label="Theme"
            description="Light, Dark, or System default"
            type="navigate"
            onPress={() => router.push('/settings/theme')}
          />
        </SettingsSection>

        <SettingsSection title="Notifications">
          <SettingsRow
            icon="notifications-outline"
            label="Push Notifications"
            description="Job alerts, messages, and updates"
            type="navigate"
            onPress={() => router.push('/settings/notifications')}
          />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow
            icon="document-text-outline"
            label="Documentation"
            type="link"
            onPress={() => router.push('/help')}
          />
          <SettingsRow
            icon="help-circle-outline"
            label="Help Center"
            type="link"
            onPress={() => router.push('/help')}
          />
        </SettingsSection>

        <ThemedCustomText variant="caption" style={[styles.version, { color: colors.border }]}>
          Hunty v1.0.0 development build
        </ThemedCustomText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  subtitle: { opacity: 0.75, marginBottom: 8 },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    opacity: 0.5,
  },
  version: {
    textAlign: 'center',
    marginTop: 16,
  },
});
