import { Stack, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNavigation from "./components/BottomNavigation";
import { ThemeProvider, useAppTheme } from "@/context/ThemeContext";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isDark } = useAppTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isAppScreen =
    pathname === "/home" ||
    pathname === "/photo-editor" ||
    pathname === "/settings" ||
    pathname === "/category";

  const activeKey =
    pathname === "/photo-editor"
      ? "photo-editor"
      : pathname === "/settings"
        ? "settings"
        : pathname === "/category"
          ? "category"
          : "home";

  return (
    <View style={styles.root}>
      <View style={styles.stackContainer}>
        <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-account"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="category" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="photo-editor" options={{ headerShown: false }} />
        </Stack>
      </View>
      {isAppScreen ? (
        <View style={[styles.navOverlay, { bottom: insets.bottom + 6 }]}>
          <BottomNavigation activeKey={activeKey} />
        </View>
      ) : null}
      <StatusBar style={isDark ? "light" : "dark"} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackContainer: {
    flex: 1,
  },
  navOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 1000,
  },
});
