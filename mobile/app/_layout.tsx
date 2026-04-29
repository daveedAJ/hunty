import { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, type ErrorBoundaryProps, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { hideSplashScreen } from '@utils/splashScreenManager';
import { useTheme } from '@providers/ThemeProvider';
import { ThemedCustomText, ThemedButton } from '@components/themed';
import { useBackHandler } from '../hooks/useBackHandler';
import { MemoryDiagnosticsOverlay } from '../components/MemoryDiagnosticsOverlay';

export const unstable_settings = {
  initialRouteName: 'index',
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
        <View style={styles.errorContainer}>
          <ThemedCustomText variant="h2" style={styles.errorTitle}>
            Something went wrong
          </ThemedCustomText>
          <ThemedCustomText variant="body" style={styles.errorMessage}>
            {error.message || 'Unexpected navigation error.'}
          </ThemedCustomText>
          <ThemedButton
            text="Try again"
            onPress={retry}
            variant="primary"
            size="md"
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [loaded, error] = useFonts();

  useEffect(() => {
    if (loaded || error) {
      hideSplashScreen();
    }
  }, [loaded, error]);

  const backAction = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return true;
    }

    return false;
  }, [router]);

  useBackHandler(backAction);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView 
        style={[styles.safeArea, { backgroundColor: colors.background }]} 
        edges={['top', 'right', 'bottom', 'left']}
      >
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.primary,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
              color: '#ffffff',
            },
            contentStyle: { backgroundColor: colors.background },
            statusBarStyle: isDark ? 'light' : 'dark',
          }}
        />
        <MemoryDiagnosticsOverlay />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  errorTitle: {
    textAlign: 'center',
  },
  errorMessage: {
    textAlign: 'center',
  },
});
