import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { View, ActivityIndicator, LogBox } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { AuthProvider, useAuth } from "@/src/auth";
import { I18nProvider } from "@/src/i18n";
import { ToastProvider } from "@/src/components/ui";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (loading) return;
    const group = segments[0];
    const inAuth = group === "(auth)";
    const inOnboarding = group === "onboarding";
    if (!user) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }
    if (!user.onboarded) {
      if (!inOnboarding) router.replace("/onboarding");
      return;
    }
    if (inAuth || inOnboarding) {
      router.replace("/(tabs)");
      return;
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.altarBg }}>
        <ActivityIndicator color={colors.gold} size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="light-candle" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay: require("../assets/fonts/PlayfairDisplay.ttf"),
    "PlayfairDisplay-SemiBold": require("../assets/fonts/PlayfairDisplay.ttf"),
    "PlayfairDisplay-Bold": require("../assets/fonts/PlayfairDisplay.ttf"),
    LibreFranklin: require("../assets/fonts/LibreFranklin.ttf"),
    "LibreFranklin-Medium": require("../assets/fonts/LibreFranklin.ttf"),
    "LibreFranklin-SemiBold": require("../assets/fonts/LibreFranklin.ttf"),
    "LibreFranklin-Bold": require("../assets/fonts/LibreFranklin.ttf"),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#1C0F0E", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#C5A059" size="large" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <I18nProvider>
              <AuthProvider>
                <ToastProvider>
                  <KeyboardProvider>
                    <Gate />
                  </KeyboardProvider>
                </ToastProvider>
              </AuthProvider>
            </I18nProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
