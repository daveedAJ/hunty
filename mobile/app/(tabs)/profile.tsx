import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { ThemedView, ThemedCustomText, ThemedButton } from "@components/themed";
import { useTheme } from "@providers/ThemeProvider";
import { useWalletStore } from "@store/useStore";
import { formatISOString } from "@lib/dateUtils";
import type {
  PlayerHuntProgress,
  NftRewardDetail,
  ProfileSummary,
} from "@lib/types";

function shortenAddress(address: string, chars = 6): string {
  if (!address || address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

async function fetchPlayerHunts(_address: string): Promise<PlayerHuntProgress[]> {
  if (!_address) return [];

  return [
    {
      id: 1,
      title: "City Secrets",
      description: "Race across town to uncover hidden murals and landmarks.",
      totalClues: 5,
      status: "Completed",
      pointsEarned: 12,
      startedAt: "2026-02-10T14:32:00Z",
      completedAt: "2026-02-10T15:12:00Z",
    },
    {
      id: 2,
      title: "Campus Quest",
      description: "Solve riddles scattered around campus before the timer ends.",
      totalClues: 7,
      status: "In-Progress",
      pointsEarned: 4,
      startedAt: "2026-02-18T17:05:00Z",
    },
    {
      id: 3,
      title: "Office Onboarding Hunt",
      description: "A playful intro game for new teammates around the office.",
      totalClues: 4,
      status: "Completed",
      pointsEarned: 9,
      startedAt: "2026-02-20T11:00:00Z",
      completedAt: "2026-02-20T11:25:00Z",
    },
  ];
}

async function fetchPlayerRewards(_address: string): Promise<NftRewardDetail[]> {
  if (!_address) return [];

  return [
    {
      id: 1,
      name: "Golden Compass",
      description: "A legendary artifact awarded to those who uncover all secret murals in the City Secrets hunt.",
      imageUri: "/static-images/nft1.png",
      earnedAt: "2026-02-10T15:16:00Z",
      claimed: true,
      huntName: "City Secrets",
      attributes: [
        { trait_type: "Rarity", value: "Legendary" },
        { trait_type: "Type", value: "Utility" },
      ],
    },
    {
      id: 2,
      name: "Explorer Trophy",
      description: "Granted for successfully completing the Office Onboarding challenge within the time limit.",
      imageUri: "/static-images/nft2.png",
      earnedAt: "2026-02-20T11:26:00Z",
      claimed: false,
      huntName: "Office Onboarding",
      attributes: [
        { trait_type: "Rarity", value: "Rare" },
        { trait_type: "Level", value: 5 },
      ],
    },
    {
      id: 3,
      name: "Soroban Sage",
      description: "Awarded to players who demonstrate exceptional knowledge of smart contract riddles.",
      imageUri: "ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
      earnedAt: "2026-03-05T09:45:00Z",
      claimed: true,
      huntName: "Stellar Developer Hunt",
      attributes: [
        { trait_type: "Rarity", value: "Epic" },
        { trait_type: "Skill", value: "Contracting" },
      ],
    },
  ];
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { walletAddress, isConnected } = useWalletStore();
  const [hunts, setHunts] = useState<PlayerHuntProgress[]>([]);
  const [nftRewards, setNftRewards] = useState<NftRewardDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAddress = walletAddress ? shortenAddress(walletAddress) : "Not connected";

  const loadProfileData = async () => {
    if (!isConnected || !walletAddress) {
      setHunts([]);
      setNftRewards([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [huntsData, rewardsData] = await Promise.all([
        fetchPlayerHunts(walletAddress),
        fetchPlayerRewards(walletAddress),
      ]);
      setHunts(huntsData);
      setNftRewards(rewardsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
  }, [isConnected, walletAddress]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const summary = useMemo((): ProfileSummary => {
    if (!hunts.length) {
      return {
        totalHunts: 0,
        completedHunts: 0,
        inProgressHunts: 0,
        totalPoints: 0,
        completionRate: 0,
        totalNftRewards: 0,
        claimedNftRewards: 0,
        unclaimedNftRewards: 0,
      };
    }

    const completedHunts = hunts.filter((h) => h.status === "Completed").length;
    const inProgressHunts = hunts.filter((h) => h.status === "In-Progress").length;
    const totalPoints = hunts.reduce((sum, h) => sum + h.pointsEarned, 0);
    const completionRate = Math.round((completedHunts / hunts.length) * 100);

    return {
      totalHunts: hunts.length,
      completedHunts,
      inProgressHunts,
      totalPoints,
      completionRate,
      totalNftRewards: nftRewards.length,
      claimedNftRewards: nftRewards.filter((nft) => nft.claimed).length,
      unclaimedNftRewards: nftRewards.filter((nft) => !nft.claimed).length,
    };
  }, [hunts, nftRewards]);

  const completedHuntsList = hunts.filter((h) => h.status === "Completed");
  const inProgressHuntsList = hunts.filter((h) => h.status === "In-Progress");

  if (!isConnected || !walletAddress) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.emptyContainer}>
          <ThemedCustomText variant="h2" style={styles.emptyTitle}>Connect your wallet</ThemedCustomText>
          <ThemedCustomText variant="body" style={styles.emptyText}>
            Your profile uses the connected Stellar address to load hunts you've played and aggregate your points across games.
          </ThemedCustomText>
          <ThemedCustomText variant="caption" style={styles.emptyHint}>
            Use the Connect Wallet button in the Settings tab to get started.
          </ThemedCustomText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.header}>
          <ThemedCustomText variant="h2" style={styles.title}>Player Profile</ThemedCustomText>
          <ThemedCustomText variant="caption" style={styles.subtitle}>
            View your hunt history, progress, and total points earned.
          </ThemedCustomText>
          <View style={[styles.walletCard, { backgroundColor: colors.primary + "10", borderColor: colors.border }]}>
            <ThemedCustomText variant="caption" style={styles.walletLabel}>Connected Wallet</ThemedCustomText>
            <ThemedCustomText variant="label" weight="600" style={styles.walletAddress}>
              {displayAddress}
            </ThemedCustomText>
          </View>
        </View>

        {isLoading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {!isLoading && (
          <>
            <View style={styles.section}>
              <ThemedCustomText variant="h3" style={styles.sectionTitle}>Summary Statistics</ThemedCustomText>
              <ThemedCustomText variant="caption" style={styles.sectionDescription}>
                Aggregated from all hunts where you have progress via get_player_progress.
              </ThemedCustomText>

              <View style={styles.statsGrid}>
                <StatPill label="Total Hunts Played" value={summary.totalHunts} colors={colors} />
                <StatPill label="Completed Hunts" value={summary.completedHunts} colors={colors} />
                <StatPill label="In-Progress Hunts" value={summary.inProgressHunts} colors={colors} />
                <StatPill label="Total Points Earned" value={summary.totalPoints} colors={colors} highlight="success" />
              </View>

              <View style={styles.statsGrid}>
                <StatPill label="NFT Rewards" value={summary.totalNftRewards} colors={colors} />
                <StatPill label="NFTs Claimed" value={summary.claimedNftRewards} colors={colors} />
                <StatPill label="NFTs Unclaimed" value={summary.unclaimedNftRewards} colors={colors} />
              </View>

              <View style={styles.completionRow}>
                <ThemedCustomText variant="caption">Completion rate:</ThemedCustomText>
                <View style={{ flexDirection: "row" }}>
                  <ThemedCustomText variant="body" weight="600" style={{ color: colors.text }}>
                    {summary.completionRate}%
                  </ThemedCustomText>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <ThemedCustomText variant="h3" style={styles.sectionTitle}>Digital Trophies</ThemedCustomText>
                  <ThemedCustomText variant="caption" style={styles.sectionDescription}>
                    Collectible rewards earned through your achievements
                  </ThemedCustomText>
                </View>
                <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
                  <ThemedCustomText variant="caption" weight="600" style={{ color: colors.primary }}>
                    {nftRewards.length} Unlocked
                  </ThemedCustomText>
                </View>
              </View>

              <NftGallery nfts={nftRewards} colors={colors} />
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedCustomText variant="h3" style={styles.sectionTitle}>Hunt History</ThemedCustomText>
                {refreshing && (
                  <ThemedCustomText variant="caption" style={styles.refreshingText}>
                    Refreshing...
                  </ThemedCustomText>
                )}
              </View>

              {error && (
                <View style={[styles.errorCard, { backgroundColor: colors.error + "20", borderColor: colors.error }]}>
                  <ThemedCustomText variant="body" style={{ color: colors.error }}>{error}</ThemedCustomText>
                </View>
              )}

              {!isLoading && !hunts.length && !error && (
                <View style={[styles.emptyHuntsCard, { backgroundColor: colors.background + "80", borderColor: colors.border }]}>
                  <ThemedCustomText variant="body" style={{ color: colors.text }}>
                    You haven't played any hunts yet. Join a game from the arcade to see your history here.
                  </ThemedCustomText>
                </View>
              )}

              {hunts.length > 0 && (
                <View style={styles.historyGrid}>
                  <View style={styles.historyColumn}>
                    <ThemedCustomText variant="h3" style={styles.columnTitle}>In-Progress Hunts</ThemedCustomText>
                    {inProgressHuntsList.length === 0 ? (
                      <ThemedCustomText variant="body" style={styles.emptyColumnText}>
                        No hunts currently in progress. Jump into a new game from the arcade.
                      </ThemedCustomText>
                    ) : (
                      <View style={styles.list}>
                        {inProgressHuntsList.map((hunt) => (
                          <HuntCard key={hunt.id} hunt={hunt} colors={colors} />
                        ))}
                      </View>
                    )}
                  </View>

                  <View style={styles.historyColumn}>
                    <ThemedCustomText variant="h3" style={styles.columnTitle}>Completed Hunts</ThemedCustomText>
                    {completedHuntsList.length === 0 ? (
                      <ThemedCustomText variant="body" style={styles.emptyColumnText}>
                        You haven't completed any hunts yet. Finish a game to see it here.
                      </ThemedCustomText>
                    ) : (
                      <View style={styles.list}>
                        {completedHuntsList.map((hunt) => (
                          <HuntCard key={hunt.id} hunt={hunt} colors={colors} />
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

function StatPill({
  label,
  value,
  highlight,
  colors,
}: {
  label: string;
  value: number;
  highlight?: "success";
  colors: any;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <ThemedCustomText variant="caption" style={styles.statLabel}>
        {label}
      </ThemedCustomText>
      <ThemedCustomText
        variant="body"
        weight="600"
        color={highlight === "success" ? "success" : "text"}
        style={styles.statValue}
      >
        {value}
      </ThemedCustomText>
    </View>
  );
}

function HuntCard({ hunt, colors }: { hunt: PlayerHuntProgress; colors: any }) {
  const isCompleted = hunt.status === "Completed";

  return (
    <View style={[styles.huntCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.huntCardHeader}>
        <View style={styles.huntCardTitleContainer}>
          <ThemedCustomText variant="body" weight="600" style={styles.huntCardTitle}>
            {hunt.title}
          </ThemedCustomText>
          <ThemedCustomText variant="caption" style={styles.huntCardDescription}>
            {hunt.description}
          </ThemedCustomText>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isCompleted ? colors.success + "20" : colors.warning + "20",
              borderColor: isCompleted ? colors.success : colors.warning,
            },
          ]}
        >
          <ThemedCustomText
            variant="caption"
            weight="500"
            style={{ color: isCompleted ? colors.success : colors.warning }}
          >
            {isCompleted ? "Completed" : "In Progress"}
          </ThemedCustomText>
        </View>
      </View>

      <View style={styles.huntCardContent}>
        <View style={{ flexDirection: "row" }}>
          <ThemedCustomText variant="caption">Clues: </ThemedCustomText>
          <ThemedCustomText variant="body" weight="500">{hunt.pointsEarned}/{hunt.totalClues}</ThemedCustomText>
        </View>
        <View style={{ flexDirection: "row" }}>
          <ThemedCustomText variant="caption">Points: </ThemedCustomText>
          <ThemedCustomText variant="body" weight="500" style={{ color: colors.success }}>{hunt.pointsEarned}</ThemedCustomText>
        </View>
        {hunt.startedAt && (
          <View style={{ flexDirection: "row" }}>
            <ThemedCustomText variant="caption">Started: </ThemedCustomText>
            <ThemedCustomText variant="body" weight="500">{formatISOString(hunt.startedAt)}</ThemedCustomText>
          </View>
        )}
        {hunt.completedAt && (
          <View style={{ flexDirection: "row" }}>
            <ThemedCustomText variant="caption">Finished: </ThemedCustomText>
            <ThemedCustomText variant="body" weight="500">{formatISOString(hunt.completedAt)}</ThemedCustomText>
          </View>
        )}
      </View>

      <ThemedButton text="View details" variant="ghost" size="sm" fullWidth />
    </View>
  );
}

function NftGallery({ nfts, colors }: { nfts: NftRewardDetail[]; colors: any }) {
  if (nfts.length === 0) {
    return (
      <View style={[styles.emptyNftCard, { backgroundColor: colors.background + "40", borderColor: colors.border }]}>
        <ThemedCustomText variant="h3" style={styles.emptyNftTitle}>No trophies yet</ThemedCustomText>
        <ThemedCustomText variant="caption" style={styles.emptyNftText}>
          Complete hunts to earn exclusive NFT rewards and build your collection!
        </ThemedCustomText>
      </View>
    );
  }

  return (
    <View style={styles.nftGrid}>
      {nfts.map((nft) => (
        <NftCard key={nft.id} nft={nft} colors={colors} />
      ))}
    </View>
  );
}

function NftCard({ nft, colors }: { nft: NftRewardDetail; colors: any }) {
  return (
    <View style={[styles.nftCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.nftImageContainer}>
        <View style={[styles.nftBadge, { backgroundColor: nft.claimed ? colors.success : colors.warning }]} />
      </View>

      <View style={styles.nftContent}>
        <ThemedCustomText variant="caption" style={[styles.nftHuntName, { color: colors.primary }]}>
          {nft.huntName || "Scavenger Hunt"}
        </ThemedCustomText>
        <ThemedCustomText variant="body" weight="600" style={styles.nftName}>
          {nft.name}
        </ThemedCustomText>
        <ThemedCustomText variant="caption" style={styles.nftId}>
          #{nft.id.toString().padStart(4, "0")}
        </ThemedCustomText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 24,
  },
  header: {
    gap: 12,
  },
  title: {
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 4,
  },
  walletCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  walletLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  walletAddress: {
    fontFamily: "monospace",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionDescription: {
    marginTop: 4,
    opacity: 0.7,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  refreshingText: {
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statPill: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyHuntsCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  historyGrid: {
    gap: 24,
  },
  historyColumn: {
    gap: 12,
  },
  columnTitle: {
    fontWeight: "600",
  },
  emptyColumnText: {
    opacity: 0.6,
  },
  list: {
    gap: 12,
  },
  huntCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  huntCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  huntCardTitleContainer: {
    flex: 1,
    gap: 4,
  },
  huntCardTitle: {
    fontSize: 16,
  },
  huntCardDescription: {
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  huntCardContent: {
    gap: 4,
  },
  nftGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nftCard: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  nftImageContainer: {
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  nftBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nftContent: {
    padding: 12,
    gap: 4,
  },
  nftHuntName: {
    opacity: 0.7,
    fontWeight: "400",
  },
  nftName: {
    fontSize: 14,
  },
  nftId: {
    opacity: 0.5,
  },
  emptyNftCard: {
    padding: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
  },
  emptyNftTitle: {
    fontWeight: "700",
    textAlign: "center",
  },
  emptyNftText: {
    textAlign: "center",
    marginTop: 8,
    maxWidth: 280,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    textAlign: "center",
    fontWeight: "700",
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 300,
  },
  emptyHint: {
    marginTop: 8,
    opacity: 0.7,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
  },
});