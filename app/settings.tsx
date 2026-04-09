import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Switch, Text, View } from "react-native";

import BottomNavigation from "./components/BottomNavigation";
import { User, loadStoredUser, logoutUser } from "./utils/auth";

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkThemeEnabled, setDarkThemeEnabled] = useState(true);
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

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={["#1E2027", "#242835", "#2A3040"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
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
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Configure your app preferences and account controls here.
        </Text>

        <View style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingText}>
                Receive updates and reminders.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: "#CDD2DA", true: "#FFB39F" }}
              thumbColor={notificationsEnabled ? "#FF6A47" : "#FFFFFF"}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Dark Theme</Text>
              <Text style={styles.settingText}>
                Keep the premium page theme enabled.
              </Text>
            </View>
            <Switch
              value={darkThemeEnabled}
              onValueChange={setDarkThemeEnabled}
              trackColor={{ false: "#CDD2DA", true: "#FFB39F" }}
              thumbColor={darkThemeEnabled ? "#FF6A47" : "#FFFFFF"}
            />
          </View>

          <View style={styles.separator} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Signed in as</Text>
            <Text style={styles.metaValue}>
              {user?.email ?? "guest@example.com"}
            </Text>
          </View>
        </View>
      </Animated.View>

      <BottomNavigation activeKey="settings" onLogout={handleLogout} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  content: {
    width: "100%",
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#F6F7FB",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#B7BFCE",
    marginBottom: 14,
  },
  settingsCard: {
    width: "100%",
    backgroundColor: "rgba(14, 18, 27, 0.84)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
    color: "#F7F8FB",
  },
  settingText: {
    marginTop: 4,
    fontSize: 13,
    color: "#AEB6C5",
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  metaRow: {
    paddingVertical: 12,
  },
  metaLabel: {
    fontSize: 13,
    color: "#8891A0",
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F7F8FB",
  },
});
