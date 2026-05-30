import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedButton, ThemedCustomText, ThemedView } from '@components/themed';
import { EmptyState } from '@components/EmptyState';
import { useTheme } from '@providers/ThemeProvider';
import { getHuntClues } from '@store/huntStore';
import { usePlayerStore, useWalletStore } from '@store/useStore';
import type { Clue } from '@lib/types';
import { useToast } from '@providers/ToastProvider';
import { ClueMarkdownRenderer } from '@components/ClueMarkdownRenderer';
import { verifyClueGeofence } from '@/lib/locationGate';

export default function PlayScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const { network } = useWalletStore();
  const {
    currentProgress,
    updateClueIndex,
    markCompleted,
    markClueCompleted,
    clearProgress,
  } = usePlayerStore();

  const [answer, setAnswer] = useState('');
  const [clues, setClues] = useState<Clue[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentProgress?.hunt_id) {
      setClues([]);
      return;
    }

    void getHuntClues(currentProgress.hunt_id).then(setClues);
  }, [currentProgress?.hunt_id]);

  if (!currentProgress?.hunt_id) {
    return (
      <EmptyState
        icon="🎯"
        title="Join a hunt first"
        description="Register for an active hunt from the Hunts tab to unlock clue progress and transaction steps."
        action={{
          label: 'Browse Hunts',
          onPress: () => router.push('/(tabs)/hunts'),
        }}
      />
    );
  }

  const activeClueIndex = currentProgress.current_clue_index;
  const activeClue = clues[activeClueIndex];
  const allSolved = activeClueIndex >= clues.length;

  const progressLabel = useMemo(() => {
    if (clues.length === 0) {
      return 'Loading clues...';
    }

    if (allSolved) {
      return 'All clues solved';
    }

    return `Clue ${activeClueIndex + 1} of ${clues.length}`;
  }, [activeClueIndex, allSolved, clues.length]);

  const handleSubmit = async () => {
    if (!activeClue || isSubmitting) {
      return;
    }

    if (network === 'mainnet') {
      showToast({
        message: 'Switch wallet to Stellar Testnet before submitting final proof.',
        type: 'warning',
      });
      router.push('/network/switch');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const locationCheck = await verifyClueGeofence(activeClue);
      if (!locationCheck.allowed) {
        setError(locationCheck.reason);
        return;
      }

      if (answer.trim().toLowerCase() !== activeClue.answer.toLowerCase()) {
        setError('Incorrect answer. Review the clue and try again.');
        return;
      }

      const isLastClue = activeClueIndex === clues.length - 1;
      markClueCompleted(currentProgress.hunt_id, activeClueIndex);

      if (isLastClue) {
        markCompleted();
        router.push({
          pathname: '/transaction/pending',
          params: {
            action: 'complete',
            huntId: String(currentProgress.hunt_id),
            huntTitle: 'Reward Dispatch',
          },
        });
      } else {
        updateClueIndex(activeClueIndex + 1);
      }

      setAnswer('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.primary + '10', borderColor: colors.border }]}>
          <ThemedCustomText variant="h2" color="primary" weight="800">
            Active Hunt Session
          </ThemedCustomText>
          <ThemedCustomText variant="body">{progressLabel}</ThemedCustomText>
        </View>

        {clues.map((clue, index) => {
          const isActive = index === activeClueIndex && !allSolved;
          const isUnlocked = index <= activeClueIndex;

          return (
            <View
              key={clue.id}
              style={[
                styles.clueCard,
                {
                  backgroundColor: isActive ? colors.primary + '12' : colors.background,
                  borderColor: isActive ? colors.primary : colors.border,
                  opacity: isUnlocked ? 1 : 0.55,
                },
              ]}
            >
              <ThemedCustomText variant="label" color={isActive ? 'primary' : 'text'} weight="700">
                {isActive ? 'Current clue' : isUnlocked ? 'Unlocked clue' : 'Locked clue'}
              </ThemedCustomText>
              
              {/* Render dynamic clue text elegantly with Markdown renderer */}
              <View style={styles.clueQuestion}>
                <ClueMarkdownRenderer text={clue.question} />
              </View>

              <ThemedCustomText variant="caption" style={styles.clueMeta}>
                {clue.points} pts {clue.hint ? `• Hint: ${clue.hint}` : ''}
              </ThemedCustomText>
            </View>
          );
        })}

        {!allSolved && activeClue ? (
          <View style={[styles.answerPanel, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <ThemedCustomText variant="h3" weight="700">
              Submit answer
            </ThemedCustomText>
            <ThemedCustomText variant="caption" style={styles.answerCopy}>
              The final correct answer will move you into wallet approval and Soroban consensus.
            </ThemedCustomText>
            <TextInput
              value={answer}
              onChangeText={(value) => {
                setAnswer(value);
                if (error) {
                  setError('');
                }
              }}
              placeholder="Type the exact checkpoint answer"
              placeholderTextColor="#94a3b8"
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? (
              <ThemedCustomText variant="caption" color="error">
                {error}
              </ThemedCustomText>
            ) : null}
            <ThemedButton
              text={isSubmitting ? 'Checking GPS...' : 'Submit answer'}
              loading={isSubmitting}
              fullWidth
              onPress={handleSubmit}
            />
            <ThemedButton text="Abandon hunt" variant="ghost" fullWidth onPress={clearProgress} />
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  clueCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  clueQuestion: {
    marginTop: 4,
  },
  clueMeta: {
    opacity: 0.75,
  },
  answerPanel: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  answerCopy: {
    opacity: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyCopy: {
    textAlign: 'center',
  },
});
