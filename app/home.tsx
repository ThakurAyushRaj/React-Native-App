import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import BottomNavigation from "./components/BottomNavigation";
import { User, loadStoredUser, logoutUser } from "./utils/auth";

export default function HomeScreen() {
  const router = useRouter();
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

  const displayName = user?.name?.trim() || "Guest User";

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
        <Text style={styles.title}>Home</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroHeading}>Welcome back, {displayName}</Text>
          <Text style={styles.heroText}>
            Your profile details have been moved to the Profile page. Use the
            floating navigation below to switch between sections.
          </Text>
        </View>
      </Animated.View>

      <BottomNavigation activeKey="home" onLogout={handleLogout} />
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
    marginBottom: 18,
    color: "#F6F7FB",
  },
  heroCard: {
    backgroundColor: "rgba(14, 18, 27, 0.82)",
    padding: 16,
    borderRadius: 18,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  heroHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F7F8FB",
    marginBottom: 8,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#AEB6C5",
  },
});
