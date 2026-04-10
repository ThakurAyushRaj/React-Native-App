import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNavigation from "./components/BottomNavigation";
import { ThemeProvider, useAppTheme } from "./context/ThemeContext";
import { logoutUser } from "./utils/auth";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isDark } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isAppScreen =
    pathname === "/home" || pathname === "/profile" || pathname === "/settings";

  const activeKey =
    pathname === "/profile"
      ? "profile"
      : pathname === "/settings"
        ? "settings"
        : "home";

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.stackContainer}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="create-account"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="home" options={{ headerShown: false }} />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack>
      </View>
      {isAppScreen ? (
        <View style={[styles.navOverlay, { bottom: insets.bottom + 6 }]}>
          <BottomNavigation activeKey={activeKey} onLogout={handleLogout} />
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
    left: 16,
    right: 16,
    zIndex: 1000,
  },
});
