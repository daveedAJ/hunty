import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getActiveHuntsForFeed } from '@store/huntStore';
import { ThemedCustomText, ThemedView } from '@components/themed';
import { HuntCard } from '@components/HuntCard';

export function HuntsList() {
  const { data: hunts = [], isLoading } = useQuery({
    queryKey: ['hunts', 'active'],
    queryFn: getActiveHuntsForFeed,
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <FlatList
      testID="hunts-list"
      data={hunts}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <HuntCard hunt={item} />}
      ListHeaderComponent={
        <ThemedCustomText variant="h2" style={styles.heading}>
          Active Hunts
        </ThemedCustomText>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  heading: { marginBottom: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
