import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { Stack, type ErrorBoundaryProps, useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { hideSplashScreen, initializeSplashScreen } from '@utils/splashScreenManager';
import { ThemeProvider, useTheme } from '@providers/ThemeProvider';
import ReactQueryProvider from '@providers/ReactQueryProvider';
import { ThemedCustomText, ThemedButton } from '@components/themed';
import { StackHeader } from '@components/navigation/StackHeader';
import { Sentry, initializeSentry } from '@config/sentry';

initializeSplashScreen();
initializeSentry();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    Sentry.Native.captureException(error);
  }, [error]);

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
  return (
    <ReactQueryProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </ReactQueryProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [loaded, error] = useFonts();

  useEffect(() => {
    if (loaded || error) {
      hideSplashScreen();
    }
  }, [loaded, error]);

  useEffect(() => {
    const backAction = () => {
      if (router.canGoBack()) {
        router.back();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [router]);

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
            header: (props) => <StackHeader {...props} />,
            headerTintColor: '#ffffff',
            contentStyle: { backgroundColor: colors.background },
            statusBarStyle: isDark ? 'light' : 'dark',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="hunt/[id]" options={{ title: 'Hunt Details' }} />
          <Stack.Screen name="details" options={{ title: 'Details' }} />
          <Stack.Screen name="nested" options={{ title: 'Nested' }} />
        </Stack>
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
