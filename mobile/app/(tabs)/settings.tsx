import { useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedInput, ThemedView } from '@components/themed';
import { SettingsRow } from '@components/settings/SettingsRow';
import { SettingsSection } from '@components/settings/SettingsSection';
import { DisconnectWalletModal } from '@components/settings/DisconnectWalletModal';
import { useNotifications } from '@hooks/useNotifications';
import { useTheme } from '@providers/ThemeProvider';
import { useToast } from '@providers/ToastProvider';
import { useWalletStore } from '@store/useStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { enabled: notificationsEnabled, toggle: toggleNotifications } = useNotifications();
  const { network, watchOnlyAddress, setWatchOnlyAddress, clearWatchOnlyAddress, clearWallet } = useWalletStore();
  const [inputAddress, setInputAddress] = useState(watchOnlyAddress);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isMainnet = network === 'mainnet';
  const isValidWatchAddress = useMemo(() => /^G[A-Z2-7]{55}$/.test(inputAddress.trim()), [inputAddress]);

  const handleSaveWatchAddress = () => {
    if (!isValidWatchAddress) {
      showToast({ message: 'Enter a valid Stellar public G-address.', type: 'warning' });
      return;
    }

    setWatchOnlyAddress(inputAddress.trim());
    showToast({ message: 'Watch-only mode enabled for profile history.', type: 'success' });
  };

  const handleClearWatchAddress = () => {
    clearWatchOnlyAddress();
    setInputAddress('');
    showToast({ message: 'Watch-only address removed.', type: 'info' });
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      clearWallet();
      setShowDisconnect(false);
      router.replace('/');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedCustomText variant="h2" weight="800">
          Settings
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.subtitle}>
          Configure theme, wallet safety, notifications, and profile lookup.
        </ThemedCustomText>

        <View style={[styles.networkCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <ThemedCustomText variant="label" weight="700">
            Wallet network
          </ThemedCustomText>
          <ThemedCustomText variant="body">
            {network === 'unknown' ? 'Unknown' : network === 'mainnet' ? 'Stellar Mainnet' : 'Stellar Testnet'}
          </ThemedCustomText>
          {isMainnet ? (
            <>
              <ThemedCustomText variant="caption" color="warning">
                Hunty transactions require Testnet. Switch networks before joining or completing hunts.
              </ThemedCustomText>
              <ThemedButton text="How to switch" variant="ghost" onPress={() => router.push('/network/switch')} />
            </>
          ) : null}
        </View>

        <View style={[styles.networkCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <ThemedCustomText variant="label" weight="700">
            Watch-only profile
          </ThemedCustomText>
          <ThemedCustomText variant="caption">
            Add a public Stellar G-address to view hunt history without connecting a signing wallet.
          </ThemedCustomText>
          <ThemedInput
            placeholder="G..."
            value={inputAddress}
            onChangeText={setInputAddress}
            autoCapitalize="characters"
            autoCorrect={false}
            error={inputAddress.length > 0 && !isValidWatchAddress ? 'Invalid Stellar public key format.' : undefined}
          />
          <ThemedButton text="Save watch address" onPress={handleSaveWatchAddress} disabled={!isValidWatchAddress} />
          {watchOnlyAddress ? (
            <ThemedButton text="Clear watch address" variant="ghost" onPress={handleClearWatchAddress} />
          ) : null}
        </View>

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
            type="toggle"
            value={notificationsEnabled}
            onToggle={toggleNotifications}
          />
        </SettingsSection>

        <SettingsSection title="Wallet">
          <SettingsRow
            icon="wallet-outline"
            label="Connected Wallet"
            description="View your linked address"
            type="navigate"
            onPress={() => router.push('/settings/wallet')}
          />
          <SettingsRow
            icon="log-out-outline"
            label="Disconnect Wallet"
            description="Sign out and unlink this device"
            type="destructive"
            onPress={() => setShowDisconnect(true)}
          />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow
            icon="document-text-outline"
            label="Documentation"
            type="link"
            onPress={() => Linking.openURL('https://docs.hunty.com')}
          />
          <SettingsRow
            icon="help-circle-outline"
            label="Help Center"
            type="link"
            onPress={() => Linking.openURL('https://support.hunty.com')}
          />
        </SettingsSection>

        <ThemedCustomText variant="caption" style={[styles.version, { color: colors.border }]}>
          Hunty v1.0.0 development build
        </ThemedCustomText>
      </ScrollView>

      <DisconnectWalletModal
        visible={showDisconnect}
        onCancel={() => setShowDisconnect(false)}
        onConfirm={handleDisconnect}
        isLoading={disconnecting}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  subtitle: { opacity: 0.75 },
  networkCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 4,
  },
  version: {
    textAlign: 'center',
    marginTop: 8,
  },
});
