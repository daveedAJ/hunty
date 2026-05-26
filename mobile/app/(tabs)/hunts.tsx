import { StyleSheet } from 'react-native';
import { ThemedView } from '@components/themed';
import { HuntFeed } from '@components/HuntFeed';

export default function HuntsScreen() {
  return (
    <ThemedView style={styles.container}>
      <HuntFeed />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
