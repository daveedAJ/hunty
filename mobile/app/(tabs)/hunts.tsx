import { StyleSheet } from 'react-native';
import { ThemedView } from '@components/themed';
import { GraphQLHuntsFeed } from '@components/GraphQLHuntsFeed';
import { HuntsList } from '@components/HuntsList';
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ThemedView, ThemedCustomText, ThemedButton } from '@components/themed';
import { useHaptics } from '@/hooks/useHaptics';
import { usePlayerStore } from '@store/useStore';
import { useTheme } from '@providers/ThemeProvider';

interface HuntItem {
  id: number;
  title: string;
  description: string;
  cluesCount: number;
  rewardType: 'XLM' | 'NFT' | 'Both';
  rewardAmount: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

const FEATURED_HUNTS: HuntItem[] = [
  {
    id: 1,
    title: 'City Secrets',
    description: 'Race across town to uncover hidden murals and landmarks.',
    cluesCount: 5,
    rewardType: 'Both',
    rewardAmount: '100 XLM + Rare NFT',
    difficulty: 'Medium',
  },
  {
    id: 2,
    title: 'Campus Quest',
    description: 'Solve riddles scattered around campus before the timer ends.',
    cluesCount: 7,
    rewardType: 'NFT',
    rewardAmount: 'Exclusive Student NFT',
    difficulty: 'Easy',
  },
  {
    id: 3,
    title: 'Cyberpunk Odyssey',
    description: 'Decipher futuristic encrypted codes in the downtown core.',
    cluesCount: 10,
    rewardType: 'XLM',
    rewardAmount: '250 XLM',
    difficulty: 'Hard',
  },
];

export default function HuntsScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { currentProgress, setProgress } = usePlayerStore();
  
  // Track loading and joined status for each hunt
  const [loadingHuntId, setLoadingHuntId] = useState<number | null>(null);

  const handleJoinHunt = async (hunt: HuntItem) => {
    if (loadingHuntId !== null) return;
    
    // Trigger subtle haptic for initiation
    haptics.triggerImpact('light');
    setLoadingHuntId(hunt.id);

    // Simulate real-world Stellar transaction / server request
    setTimeout(() => {
      // Set global player progress in Zustand
      setProgress({
        hunt_id: hunt.id,
        player: 'GD72...3W9A',
        current_clue_index: 0,
        completed: false,
        reward_claimed: false,
      });

      setLoadingHuntId(null);
      
      // Trigger tactile success haptic feedback (Success Notification)
      haptics.joinSuccess();

      // Show beautiful feedback
      Alert.alert(
        'Successfully Joined!',
        `You have successfully registered for "${hunt.title}". Start solving the clues in the Play tab!`,
        [{ text: 'Let\'s Go!' }]
      );
    }, 1200);
  };

  return (
    <ThemedView style={styles.container}>
      <GraphQLHuntsFeed />
      <HuntsList />
    </ThemedView>
    <ScrollView 
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header and Stats */}
      <View style={styles.header}>
        <ThemedCustomText variant="h1" color="primary" weight="800">
          Game Arcade
        </ThemedCustomText>
        <ThemedCustomText variant="body" color="text" style={styles.subtitle}>
          Embark on real-world treasure hunts, solve clues, and claim crypto rewards.
        </ThemedCustomText>
      </View>

      {/* Stats Board */}
      <View style={[styles.statsBoard, { backgroundColor: colors.border + '30', borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <ThemedCustomText variant="h2" color="primary" weight="700">
            3
          </ThemedCustomText>
          <ThemedCustomText variant="caption" color="text" style={{ opacity: 0.7 }}>
            Active Hunts
          </ThemedCustomText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <ThemedCustomText variant="h2" color="secondary" weight="700">
            350+
          </ThemedCustomText>
          <ThemedCustomText variant="caption" color="text" style={{ opacity: 0.7 }}>
            XLM Pooled
          </ThemedCustomText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <ThemedCustomText variant="h2" color="success" weight="700">
            1.2k
          </ThemedCustomText>
          <ThemedCustomText variant="caption" color="text" style={{ opacity: 0.7 }}>
            Active Players
          </ThemedCustomText>
        </View>
      </View>

      <ThemedCustomText variant="h3" color="text" weight="700" style={styles.sectionTitle}>
        Featured Hunts
      </ThemedCustomText>

      {/* Hunts List */}
      <View style={styles.listContainer}>
        {FEATURED_HUNTS.map((hunt) => {
          const isCurrent = currentProgress?.hunt_id === hunt.id;
          const isLoading = loadingHuntId === hunt.id;

          return (
            <View 
              key={hunt.id} 
              style={[
                styles.card, 
                { 
                  backgroundColor: colors.background, 
                  borderColor: isCurrent ? colors.success : colors.border,
                  shadowColor: isCurrent ? colors.success : '#000',
                }
              ]}
            >
              {/* Badge Indicators */}
              <View style={styles.badgeRow}>
                <View 
                  style={[
                    styles.difficultyBadge, 
                    { 
                      backgroundColor: 
                        hunt.difficulty === 'Easy' ? colors.success + '20' : 
                        hunt.difficulty === 'Medium' ? colors.warning + '20' : 
                        colors.error + '20'
                    }
                  ]}
                >
                  <ThemedCustomText 
                    variant="caption" 
                    color={
                      hunt.difficulty === 'Easy' ? 'success' : 
                      hunt.difficulty === 'Medium' ? 'warning' : 
                      'error'
                    }
                    weight="700"
                  >
                    {hunt.difficulty}
                  </ThemedCustomText>
                </View>

                <View style={[styles.rewardBadge, { backgroundColor: colors.secondary + '20' }]}>
                  <ThemedCustomText variant="caption" color="secondary" weight="700">
                    💰 {hunt.rewardType}
                  </ThemedCustomText>
                </View>
              </View>

              {/* Title & Description */}
              <ThemedCustomText variant="h3" color="text" weight="700" style={styles.cardTitle}>
                {hunt.title}
              </ThemedCustomText>
              
              <ThemedCustomText variant="body" color="text" style={styles.cardDesc}>
                {hunt.description}
              </ThemedCustomText>

              {/* Info Row */}
              <View style={[styles.cardInfoRow, { borderTopColor: colors.border }]}>
                <View style={styles.infoCol}>
                  <ThemedCustomText variant="caption" color="text" style={{ opacity: 0.6 }}>
                    Clues / Tasks
                  </ThemedCustomText>
                  <ThemedCustomText variant="body" color="text" weight="600">
                    📍 {hunt.cluesCount} checkpoints
                  </ThemedCustomText>
                </View>

                <View style={styles.infoCol}>
                  <ThemedCustomText variant="caption" color="text" style={{ opacity: 0.6 }}>
                    Potential Reward
                  </ThemedCustomText>
                  <ThemedCustomText variant="body" color="primary" weight="700">
                    {hunt.rewardAmount}
                  </ThemedCustomText>
                </View>
              </View>

              {/* Join Action Button */}
              <View style={styles.buttonContainer}>
                {isCurrent ? (
                  <ThemedButton
                    text="Resume Hunt ⚡"
                    variant="success"
                    size="md"
                    fullWidth
                    onPress={() => {
                      haptics.triggerImpact('medium');
                      Alert.alert('Active Hunt', `You are currently doing this hunt! Switch to the Play tab to solve clues.`);
                    }}
                  />
                ) : (
                  <ThemedButton
                    text={isLoading ? 'Joining...' : 'Join Hunt'}
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={isLoading || loadingHuntId !== null}
                    loading={isLoading}
                    onPress={() => handleJoinHunt(hunt)}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  subtitle: {
    marginTop: 6,
    opacity: 0.8,
    fontSize: 15,
  },
  statsBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 28,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    opacity: 0.5,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  listContainer: {
    gap: 20,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  difficultyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  rewardBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  cardTitle: {
    marginBottom: 8,
  },
  cardDesc: {
    opacity: 0.7,
    marginBottom: 16,
    fontSize: 14,
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  infoCol: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
  },
});
