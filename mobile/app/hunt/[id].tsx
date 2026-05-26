import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getHuntById } from '@store/huntStore';
import { ThemedCustomText, ThemedButton, ThemedView } from '@components/themed';
import { WalletConnectModal } from '@components/WalletConnectModal';
import { useWalletStore } from '@store/useStore';

export default function HuntDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const huntId = Number(id);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const { isConnected, setWallet } = useWalletStore();

  const { data: hunt, isLoading } = useQuery({
    queryKey: ['hunt', huntId],
    queryFn: () => getHuntById(huntId),
    enabled: Number.isFinite(huntId),
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.container} testID="hunt-detail-loading">
        <ThemedCustomText variant="body">Loading hunt…</ThemedCustomText>
      </ThemedView>
    );
  }

  if (!hunt) {
    return (
      <ThemedView style={styles.container} testID="hunt-detail-not-found">
        <ThemedCustomText variant="h2">Hunt not found</ThemedCustomText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container} testID="hunt-detail-screen">
      <ThemedCustomText variant="h2">{hunt.title}</ThemedCustomText>
      <ThemedCustomText variant="body">{hunt.description}</ThemedCustomText>
      <ThemedCustomText variant="caption">
        {hunt.cluesCount} clues · {hunt.rewardType} reward · {hunt.status}
      </ThemedCustomText>

      {!isConnected ? (
        <ThemedButton
          text="Connect wallet to join"
          onPress={() => setWalletModalVisible(true)}
          fullWidth
          testID="connect-wallet-button"
        />
      ) : (
        <ThemedCustomText variant="label" testID="wallet-connected-label">
          Wallet connected — ready to join
        </ThemedCustomText>
      )}

      <WalletConnectModal
        visible={walletModalVisible}
        onClose={() => setWalletModalVisible(false)}
        onConnect={(provider) => {
          setWallet(`G${provider.toUpperCase()}DEMO123456789012345678901234567`);
          setWalletModalVisible(false);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
});
