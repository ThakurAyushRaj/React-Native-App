import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "./context/ThemeContext";
import { User, loadStoredUser } from "./utils/auth";

export default function SettingsScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, isDark, theme, setThemeMode } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const pageEnter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageEnter, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageEnter]);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const storedUser = await loadStoredUser();

        if (storedUser) {
          if (isMounted) {
            setUser(storedUser);
          }
        } else {
          router.replace("/");
        }
      } catch (error) {
        console.log("Error loading user:", error);
        router.replace("/");
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          paddingTop: insets.top + 14,
          paddingBottom: insets.bottom + NAV_OVERLAY_SPACE,
        },
      ]}
    >
      <View
        style={[styles.accentBlob, { backgroundColor: theme.accentBlob }]}
      />
      <View
        style={[
          styles.accentBlobSecondary,
          { backgroundColor: theme.accentBlobSecondary },
        ]}
      />
      <View style={[styles.ring1, { borderColor: theme.ringBg }]} />
      <View style={[styles.ring2, { borderColor: theme.ringBg }]} />
      <View
        style={[styles.blobTertiary, { backgroundColor: theme.blobTertiary }]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: pageEnter,
            transform: [
              {
                translateX: pageEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.badgeText }]}>
            PREFERENCES
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.title }]}>Settings</Text>
        <Text style={[styles.subtitle, { color: theme.subtitle }]}>
          Configure your app preferences and account controls here.
        </Text>

        <View style={[styles.settingsCard, { backgroundColor: theme.cardBg }]}>
          <View
            style={[styles.cardAccent, { backgroundColor: theme.cardAccent }]}
          />
          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.settingTitle, { color: theme.cardTitle }]}>
                Push Notifications
              </Text>
              <Text style={[styles.settingText, { color: theme.cardText }]}>
                Receive updates and reminders.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#CDD2DA", true: "#FFB39F" }}
              thumbColor={
                notificationsEnabled ? theme.activeBubbleBg : "#FFFFFF"
              }
            />
          </View>

          <View
            style={[styles.separator, { backgroundColor: theme.cardBorder }]}
          />

          <View style={styles.settingRow}>
            <View>
              <Text style={[styles.settingTitle, { color: theme.cardTitle }]}>
                Dark Theme
              </Text>
              <Text style={[styles.settingText, { color: theme.cardText }]}>
                Enable dark mode for a better experience in low light.
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(enabled) =>
                setThemeMode(enabled ? "dark" : "light")
              }
              trackColor={{ false: "#CDD2DA", true: "#FFB39F" }}
              thumbColor={isDark ? theme.activeBubbleBg : "#FFFFFF"}
            />
          </View>

          <View
            style={[styles.separator, { backgroundColor: theme.cardBorder }]}
          />

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.cardText }]}>
              Signed in as
            </Text>
            <Text style={[styles.metaValue, { color: theme.cardTitle }]}>
              {user?.email ?? "guest@example.com"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: theme.cardText }]}>
              Current mode
            </Text>
            <Text style={[styles.metaValue, { color: theme.cardTitle }]}>
              {mode === "dark" ? "Dark" : "Light"}
            </Text>
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  accentBlob: {
    position: "absolute",
    top: 88,
    left: -30,
    width: 172,
    height: 172,
    borderRadius: 86,
    opacity: 0.75,
  },
  accentBlobSecondary: {
    position: "absolute",
    bottom: 216,
    right: -26,
    width: 146,
    height: 146,
    borderRadius: 73,
    opacity: 0.68,
  },
  content: {
    width: "100%",
    paddingTop: 8,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  settingsCard: {
    width: "100%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  cardAccent: {
    width: 54,
    height: 4,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  settingRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingText: {
    marginTop: 4,
    fontSize: 13,
  },
  separator: {
    height: 1,
  },
  metaRow: {
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  ring1: {
    position: "absolute",
    top: 36,
    right: -74,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
  },
  ring2: {
    position: "absolute",
    bottom: 180,
    left: -52,
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1,
  },
  blobTertiary: {
    position: "absolute",
    top: "38%",
    left: 28,
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.55,
  },
});
