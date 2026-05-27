/**
 * Play screen — mobile clue list with Reanimated unlock animation.
 *
 * Flow:
 *   1. Clues are shown as a vertical list.
 *   2. Only the current clue (current_clue_index) is active; solved ones are
 *      unlocked; future ones are locked.
 *   3. When the player submits a correct answer the tx is confirmed, then
 *      `unlockedUpTo` advances by 1 — triggering the ClueListItem animation
 *      on the newly revealed card.
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClueListItem } from '@components/ClueListItem';
import { usePlayerStore } from '@store/useStore';
import type { ClueInfo } from '@lib/types';

// ─── Demo clues (replace with real contract fetch) ───────────────────────────

const DEMO_CLUES: ClueInfo[] = [
  { id: 0, question: 'I have cities, but no houses live there. I have mountains, but no trees grow there. What am I?', points: 10 },
  { id: 1, question: 'The more you take, the more you leave behind. What am I?', points: 15 },
  { id: 2, question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?', points: 20 },
  { id: 3, question: 'I have hands but cannot clap. What am I?', points: 10 },
  { id: 4, question: 'What has keys but no locks, space but no room, and you can enter but can\'t go inside?', points: 25 },
];

const DEMO_ANSWERS = ['map', 'footsteps', 'echo', 'clock', 'keyboard'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlayScreen() {
  const { currentProgress, updateClueIndex } = usePlayerStore();

  // unlockedUpTo: index of the highest clue that has been solved.
  // Starts at current_clue_index - 1 (all previously solved clues are already unlocked).
  const initialUnlocked = (currentProgress?.current_clue_index ?? 0) - 1;
  const [unlockedUpTo, setUnlockedUpTo] = useState(initialUnlocked);
  const activeIndex = unlockedUpTo + 1;

  const [answer, setAnswer] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (isPending || !answer.trim()) return;
    const clue = DEMO_CLUES[activeIndex];
    if (!clue) return;

    setIsPending(true);
    setError('');

    try {
      // ── Simulate tx confirmation (replace with real submitAnswer call) ──
      await new Promise<void>((resolve, reject) =>
        setTimeout(() => {
          const correct =
            answer.trim().toLowerCase() === DEMO_ANSWERS[activeIndex];
          correct ? resolve() : reject(new Error('incorrect'));
        }, 900),
      );

      // Tx confirmed — unlock the next clue with animation
      setUnlockedUpTo(activeIndex);
      updateClueIndex(activeIndex + 1);
      setAnswer('');
    } catch {
      setError('Incorrect answer — try again!');
    } finally {
      setIsPending(false);
    }
  }, [activeIndex, answer, isPending, updateClueIndex]);

  const allSolved = activeIndex >= DEMO_CLUES.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🗺 Active Hunt</Text>
          <Text style={styles.subtitle}>
            {allSolved
              ? '🎉 All clues solved!'
              : `Clue ${activeIndex + 1} of ${DEMO_CLUES.length}`}
          </Text>
        </View>

        {/* Clue list */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {DEMO_CLUES.map((clue, i) => (
            <ClueListItem
              key={clue.id}
              clue={clue}
              index={i}
              isActive={i === activeIndex && !allSolved}
              isUnlocked={i <= unlockedUpTo}
            />
          ))}
        </ScrollView>

        {/* Answer input — only shown while there are unsolved clues */}
        {!allSolved && (
          <View style={styles.inputArea}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Type your answer…"
                placeholderTextColor="#9999BB"
                value={answer}
                onChangeText={(t) => { setAnswer(t); setError(''); }}
                onSubmitEditing={handleSubmit}
                returnKeyType="done"
                editable={!isPending}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={[styles.submitBtn, isPending && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isPending}
                accessibilityRole="button"
                accessibilityLabel="Submit answer"
              >
                {isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>→</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { ThemedView, ThemedCustomText, ThemedButton } from '@components/themed';
import { useHaptics } from '@/hooks/useHaptics';
import { usePlayerStore } from '@store/useStore';
import { useTheme } from '@providers/ThemeProvider';

interface ClueData {
  question: string;
  hint: string;
  answer: string;
}

const CLUES_BY_HUNT: Record<number, ClueData[]> = {
  1: [
    { question: 'Find the historical blue mural painted on the brick wall beside the old clock tower.', hint: 'Look near the city square fountain.', answer: 'clocktower' },
    { question: 'Locate the bronze statue of the town founder near the library.', hint: 'He is holding an open book.', answer: 'founder' },
    { question: 'Find the hidden micro-brewery courtyard with the neon hop sign.', hint: 'It is inside an alleyway off 5th Avenue.', answer: 'hops' },
  ],
  2: [
    { question: 'Go to the oldest oak tree on the main campus lawn.', hint: 'Near the science building.', answer: 'oaktree' },
    { question: 'Decipher the inscription on the stone sundial near the observatory.', hint: 'It mentions "Time Flies".', answer: 'sundial' },
  ],
  3: [
    { question: 'Scan the cybernetic terminal code near the tech-district archway.', hint: 'Under the blinking purple light.', answer: 'terminal' },
  ]
};

const HUNT_NAMES: Record<number, string> = {
  1: 'City Secrets',
  2: 'Campus Quest',
  3: 'Cyberpunk Odyssey',
};

export default function PlayScreen() {
  const { colors } = useTheme();
  const haptics = useHaptics();
  const { currentProgress, updateClueIndex, markCompleted, clearProgress } = usePlayerStore();

  // Component UI States
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [solving, setSolving] = useState(false);
  const [answerInput, setAnswerInput] = useState('');
  const [showHint, setShowHint] = useState(false);

  const activeHuntId = currentProgress?.hunt_id;
  const clues = activeHuntId ? CLUES_BY_HUNT[activeHuntId] || [] : [];
  const currentClueIndex = currentProgress?.current_clue_index ?? 0;
  const currentClue = clues[currentClueIndex];
  const isCompleted = currentProgress?.completed;

  const handleScanBeacon = () => {
    if (scanning) return;
    
    // Trigger subtle click
    haptics.scanSubtle();
    setScanning(true);

    // Simulate scanning camera focus and code detection
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
      
      // Trigger Medium Impact haptic for scan success
      haptics.scanSuccess();
      
      Alert.alert(
        'Beacon Connected! 📡',
        'Your device detected the checkpoint signal. You can now submit your answer.',
        [{ text: 'Great' }]
      );
    }, 1500);
  };

  const handleSubmitAnswer = () => {
    if (!answerInput.trim()) {
      haptics.triggerNotification('error');
      Alert.alert('Error', 'Please enter your answer.');
      return;
    }

    setSolving(true);

    setTimeout(() => {
      setSolving(false);
      
      const isCorrect = answerInput.trim().toLowerCase() === currentClue.answer.toLowerCase();

      if (isCorrect) {
        setAnswerInput('');
        setScanned(false);
        setShowHint(false);

        const isLastClue = currentClueIndex === clues.length - 1;

        if (isLastClue) {
          // Final Clue Completed! Trigger completion states
          markCompleted();
          
          // Heavy Success & Reward vibration
          haptics.taskSuccess();
          setTimeout(() => haptics.rewardHeavy(), 300);

          Alert.alert(
            'Congratulations! 🏆',
            'You solved the final clue! Your proof-of-completion transaction has been submitted to the Stellar Network and your rewards are being dispatched.',
            [{ text: 'Claim Reward!' }]
          );
        } else {
          // Progress to next checkpoint
          updateClueIndex(currentClueIndex + 1);
          
          // Clear success sound/vibe
          haptics.taskSuccess();
          
          Alert.alert(
            'Correct Answer! 🎉',
            'Checkpoint solved successfully. Proceed to the next coordinate!',
            [{ text: 'Next Clue' }]
          );
        }
      } else {
        // Wrong answer: trigger warning haptic
        haptics.triggerNotification('warning');
        Alert.alert(
          'Incorrect Answer ❌',
          'That answer does not match the checkpoint archives. Check your hint or try again!',
          [{ text: 'Try Again' }]
        );
      }
    }, 1000);
  };

  const handleAbandon = () => {
    haptics.triggerNotification('warning');
    Alert.alert(
      'Abandon Hunt?',
      'Are you sure you want to stop playing this hunt? Your current session progress will be cleared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Abandon', 
          style: 'destructive',
          onPress: () => {
            clearProgress();
            setAnswerInput('');
            setScanned(false);
            setShowHint(false);
            haptics.triggerImpact('light');
          }
        }
      ]
    );
  };

  // State: No active hunt
  if (!activeHuntId) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <ThemedCustomText variant="h2" color="primary" weight="800" style={styles.emptyTitle}>
          Play Interface
        </ThemedCustomText>
        <ThemedCustomText variant="body" color="text" style={styles.emptyText}>
          No active hunt session found. Visit the **Hunts** tab to join an active arcade game!
        </ThemedCustomText>
      </View>
    );
  }

  // State: Hunt Completed
  if (isCompleted) {
    return (
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.centerContent}
      >
        <View style={[styles.victoryCard, { backgroundColor: colors.success + '15', borderColor: colors.success }]}>
          <ThemedCustomText variant="h1" color="success" weight="800" style={styles.victoryTitle}>
            VICTORY! 🏆
          </ThemedCustomText>
          <ThemedCustomText variant="body" color="text" style={styles.victoryText}>
            You successfully completed the "{HUNT_NAMES[activeHuntId]}" hunt!
          </ThemedCustomText>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <ThemedCustomText variant="caption" color="text" style={{ opacity: 0.6 }}>
            Rewards Dispatched:
          </ThemedCustomText>
          <ThemedCustomText variant="h2" color="secondary" weight="700" style={styles.rewardText}>
            ✓ 150 XLM Transferred
          </ThemedCustomText>
          <ThemedCustomText variant="h3" color="primary" weight="600" style={styles.rewardSub}>
            ✓ Stellar NFT Minted
          </ThemedCustomText>
        </View>

        <ThemedButton
          text="Back to Arcade"
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => {
            haptics.triggerImpact('medium');
            clearProgress();
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Active Hunt Title */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <ThemedCustomText variant="caption" color="primary" weight="700">
              ACTIVE SESSION
            </ThemedCustomText>
            <ThemedCustomText variant="h2" color="text" weight="800">
              {HUNT_NAMES[activeHuntId]}
            </ThemedCustomText>
          </View>
          <ThemedButton 
            text="Abandon"
            variant="ghost"
            size="sm"
            onPress={handleAbandon}
          />
        </View>

        {/* Progress Tracker */}
        <View style={styles.progressTracker}>
          <ThemedCustomText variant="label" color="text" weight="600">
            Progress: Clue {currentClueIndex + 1} of {clues.length}
          </ThemedCustomText>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: colors.primary, 
                  width: `${((currentClueIndex) / clues.length) * 100}%` 
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Clue Prompt Card */}
      <View style={[styles.clueCard, { backgroundColor: colors.border + '25', borderColor: colors.border }]}>
        <ThemedCustomText variant="h3" color="primary" weight="700" style={styles.clueTitle}>
          📍 Checkpoint Clue
        </ThemedCustomText>
        
        <ThemedCustomText variant="body" color="text" style={styles.clueQuestion}>
          {currentClue?.question}
        </ThemedCustomText>

        {/* Hint toggle */}
        {showHint ? (
          <View style={[styles.hintBox, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
            <ThemedCustomText variant="caption" color="warning" weight="700">
              💡 HINT:
            </ThemedCustomText>
            <ThemedCustomText variant="label" color="text">
              {currentClue?.hint}
            </ThemedCustomText>
          </View>
        ) : (
          <ThemedButton
            text="Reveal Hint (No Cost)"
            variant="ghost"
            size="sm"
            onPress={() => {
              haptics.triggerSelection();
              setShowHint(true);
            }}
          />
        )}
      </View>

      {/* Interactive Action Area */}
      <View style={styles.actionArea}>
        {!scanned ? (
          <View style={styles.scanningSection}>
            <ThemedCustomText variant="body" color="text" style={styles.actionGuide}>
              You must scan the physical location beacon or QR code to verify your presence at this coordinate before submitting the answer.
            </ThemedCustomText>
            
            <ThemedButton
              text={scanning ? 'Connecting to Beacon...' : 'Scan Checkpoint QR / Beacon'}
              variant="primary"
              size="lg"
              fullWidth
              loading={scanning}
              onPress={handleScanBeacon}
            />
          </View>
        ) : (
          <View style={styles.solvingSection}>
            <ThemedCustomText variant="label" color="success" weight="700" style={styles.scanSuccessText}>
              ✓ Beacon Verified! Enter your answer below:
            </ThemedCustomText>

            <TextInput
              style={[
                styles.textInput,
                { 
                  color: colors.text, 
                  borderColor: colors.border,
                  backgroundColor: colors.border + '10'
                }
              ]}
              placeholder="Enter clue answer..."
              placeholderTextColor="#9ca3af"
              value={answerInput}
              onChangeText={setAnswerInput}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.solveButtonRow}>
              <ThemedButton
                text="Re-Scan"
                variant="ghost"
                size="md"
                onPress={() => {
                  haptics.triggerImpact('light');
                  setScanned(false);
                }}
              />
              <View style={{ flex: 1 }}>
                <ThemedButton
                  text={solving ? 'Submitting...' : 'Submit Solution'}
                  variant="success"
                  size="md"
                  fullWidth
                  loading={solving}
                  disabled={solving}
                  onPress={handleSubmitAnswer}
                />
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView, ThemedCustomText, ThemedButton } from '@components/themed';
import { ClueTextAnswerModal } from '@components/modals';

export default function PlayScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (answer: string) => {
    setIsSubmitting(true);
    try {
      // Placeholder until contract submit is wired on mobile
      await new Promise((resolve) => setTimeout(resolve, 400));
      setLastSubmitted(answer);
      setModalVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedCustomText variant="h2">Map/Play</ThemedCustomText>
      <ThemedCustomText variant="body">
        Open the map, solve clues, and play active hunts.
      </ThemedCustomText>

      <ThemedButton
        text="Submit text answer"
        variant="primary"
        size="md"
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Open clue answer modal"
      />

      {lastSubmitted ? (
        <ThemedCustomText variant="caption" color="success">
          Last submitted: {lastSubmitted}
        </ThemedCustomText>
      ) : null}

      <ClueTextAnswerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
        clueTitle="Sample clue"
        isSubmitting={isSubmitting}
        placeholder="Enter answer"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4FF' },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8F5',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0C0C4F',
  },
  subtitle: {
    fontSize: 13,
    color: '#6666AA',
    marginTop: 2,
  },
  list: { flex: 1 },
  listContent: { paddingVertical: 12, paddingBottom: 24 },
  inputArea: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8F5',
  },
  errorText: {
    color: '#E3225C',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#3737A4',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A3E',
    backgroundColor: '#F8F8FF',
  },
  submitBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#3737A4',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 24,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.8,
    fontSize: 16,
    lineHeight: 24,
  },
  header: {
    gap: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTracker: {
    gap: 6,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  clueCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  clueTitle: {
    fontSize: 18,
  },
  clueQuestion: {
    fontSize: 16,
    lineHeight: 24,
  },
  hintBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionArea: {
    marginTop: 8,
  },
  scanningSection: {
    gap: 16,
  },
  actionGuide: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  solvingSection: {
    gap: 16,
  },
  scanSuccessText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  solveButtonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  victoryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  victoryTitle: {
    fontSize: 32,
    textAlign: 'center',
  },
  victoryText: {
    textAlign: 'center',
    fontSize: 16,
    opacity: 0.9,
  },
  divider: {
    width: '80%',
    height: 1,
    marginVertical: 8,
  },
  rewardText: {
    textAlign: 'center',
    fontSize: 22,
    marginTop: 4,
  },
  rewardSub: {
    textAlign: 'center',
    fontSize: 18,
    opacity: 0.9,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
});
