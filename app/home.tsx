import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "./context/ThemeContext";
import { User, loadStoredUser } from "./utils/auth";

export default function HomeScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
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
          router.replace("/"); // redirect to login
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

  const displayName = user?.name?.trim() || "Guest User";

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
            DASHBOARD
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.title }]}>Home</Text>

        <View style={[styles.heroCard, { backgroundColor: theme.cardBg }]}>
          <View
            style={[styles.cardAccent, { backgroundColor: theme.cardAccent }]}
          />
          <Text style={[styles.heroHeading, { color: theme.cardTitle }]}>
            Welcome back, {displayName}
          </Text>
          <Text style={[styles.heroText, { color: theme.cardText }]}>
            Your profile details have been moved to the Profile page. Use the
            floating navigation below to switch between sections.
          </Text>
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
    top: 82,
    left: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.8,
  },
  accentBlobSecondary: {
    position: "absolute",
    bottom: 210,
    right: -28,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.72,
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
    marginBottom: 18,
  },
  heroCard: {
    padding: 16,
    borderRadius: 18,
    width: "100%",
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
    marginBottom: 10,
  },
  heroHeading: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ring1: {
    position: "absolute",
    top: 50,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  ring2: {
    position: "absolute",
    top: "44%",
    left: -55,
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
  },
  blobTertiary: {
    position: "absolute",
    top: "26%",
    right: 22,
    width: 66,
    height: 66,
    borderRadius: 33,
    opacity: 0.6,
  },
});
