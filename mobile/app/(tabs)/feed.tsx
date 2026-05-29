import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { HuntyRefreshControl } from '@components/HuntyRefreshControl';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { EmptyState } from '@components/EmptyState';
import { useRefreshByUser } from '@hooks/useRefreshByUser';
import { useTheme } from '@providers/ThemeProvider';
import { getActiveHuntsForFeed } from '@store/huntStore';
import type { StoredHunt } from '@lib/types';

const fetchHunts = async () => getActiveHuntsForFeed();

function scoreHunt(hunt: StoredHunt) {
  const now = Math.floor(Date.now() / 1000);
  const startsIn = Math.abs((hunt.startTime ?? now) - now);
  const recencyScore = Math.max(0, 86_400 * 7 - startsIn);
  const rewardScore = hunt.rewardType === 'Both' ? 20 : hunt.rewardType === 'XLM' ? 12 : 8;
  return hunt.cluesCount * 5 + rewardScore + recencyScore / 10_000;
}

function estimatedPrize(hunt: StoredHunt) {
  const xlmPool = Math.max(12, hunt.cluesCount * 4);
  const nftCount =
    hunt.rewardType === 'NFT' || hunt.rewardType === 'Both'
      ? Math.max(1, Math.floor(hunt.cluesCount / 3))
      : 0;

  return { xlmPool, nftCount };
}

export default function HomeFeed() {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: hunts, refetch } = useQuery({
    queryKey: ['feed-hunts'],
    queryFn: fetchHunts,
  });
  const { isRefreshing, onRefresh } = useRefreshByUser(refetch);

  const sections = useMemo(() => {
    const active = hunts ?? [];
    return [
      {
        key: 'trending',
        title: 'Trending Hunts',
        subtitle: 'Most active around the map',
        data: [...active].sort((a, b) => scoreHunt(b) - scoreHunt(a)).slice(0, 4),
      },
      {
        key: 'new',
        title: 'Newly Created',
        subtitle: 'Fresh hunts launched recently',
        data: [...active].sort((a, b) => (b.startTime ?? 0) - (a.startTime ?? 0)).slice(0, 4),
      },
      {
        key: 'prize',
        title: 'Highest Prize',
        subtitle: 'Top XLM reward pools',
        data: [...active]
          .sort((a, b) => estimatedPrize(b).xlmPool - estimatedPrize(a).xlmPool)
          .slice(0, 4),
      },
    ];
  }, [hunts]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<HuntyRefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <ThemedCustomText variant="h2" weight="800" style={styles.headerTitle}>
          Home Feed
        </ThemedCustomText>
        <ThemedCustomText variant="body" style={styles.headerSubtitle}>
          Explore active Soroban hunts by momentum, freshness, and reward size.
        </ThemedCustomText>

        {sections.map((section) => (
          <View key={section.key} style={styles.section}>
            <ThemedCustomText variant="h3" weight="700">
              {section.title}
            </ThemedCustomText>
            <ThemedCustomText variant="caption" style={styles.sectionSubtitle}>
              {section.subtitle}
            </ThemedCustomText>

            {section.data.length === 0 ? (
              <EmptyState
                icon="🗺️"
                title="No active hunts found"
                description="There are currently no hunts available in this category. Check back later or explore other sections."
                action={{
                  label: 'Browse Hunts',
                  onPress: () => router.push('/(tabs)/hunts'),
                }}
              />
            ) : (
              section.data.map((hunt) => {
                const prize = estimatedPrize(hunt);
                return (
                  <Pressable
                    key={`${section.key}-${hunt.id}`}
                    style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
                    onPress={() => router.push(`/details?huntId=${hunt.id}`)}
                  >
                    <View style={styles.cardTopRow}>
                      <ThemedCustomText variant="label" weight="700" style={styles.cardTitle} numberOfLines={1}>
                        {hunt.title}
                      </ThemedCustomText>
                      <ThemedCustomText variant="caption" color="primary" weight="700">
                        {hunt.rewardType}
                      </ThemedCustomText>
                    </View>
                    <ThemedCustomText variant="caption" numberOfLines={2}>
                      {hunt.description}
                    </ThemedCustomText>
                    <View style={styles.metricsRow}>
                      <ThemedCustomText variant="caption">{hunt.cluesCount} clues</ThemedCustomText>
                      <ThemedCustomText variant="caption">{prize.xlmPool} XLM</ThemedCustomText>
                      <ThemedCustomText variant="caption">{prize.nftCount} NFT</ThemedCustomText>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 28,
    gap: 12,
  },
  headerTitle: { marginBottom: 2 },
  headerSubtitle: { opacity: 0.75, marginBottom: 4 },
  section: { marginTop: 10 },
  sectionSubtitle: { marginTop: 2, marginBottom: 8, opacity: 0.8 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8, gap: 6 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyCard: { borderWidth: 1, borderRadius: 10, padding: 16 },
});
