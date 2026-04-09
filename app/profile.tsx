import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";

import BottomNavigation from "./components/BottomNavigation";
import { User, loadStoredUser, logoutUser } from "./utils/auth";

export default function ProfileScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);
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

  useEffect(() => {
    setImageFailed(false);
  }, [user?.photo]);

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
  const displayEmail = user?.email?.trim() || "guest@example.com";
  const displayPhoto =
    user?.photo?.trim() ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=EDEDED&color=333333`;
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const imageSource =
    Platform.OS !== "web" && user?.accessToken
      ? {
          uri: displayPhoto,
          headers: { Authorization: `Bearer ${user.accessToken}` },
        }
      : { uri: displayPhoto };

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
        <Text style={styles.title}>Profile</Text>

        <View style={styles.profileCard}>
          {!imageFailed ? (
            <ExpoImage
              source={imageSource}
              style={styles.image}
              contentFit="cover"
              cachePolicy="disk"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.fallbackAvatar}>
              <Text style={styles.fallbackAvatarText}>{avatarInitial}</Text>
            </View>
          )}

          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Full Name</Text>
            <Text style={styles.detailValue}>{displayName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email</Text>
            <Text style={styles.detailValue}>{displayEmail}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account Type</Text>
            <Text style={styles.detailValue}>Authenticated User</Text>
          </View>
        </View>
      </Animated.View>

      <BottomNavigation activeKey="profile" onLogout={handleLogout} />
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
  profileCard: {
    width: "100%",
    backgroundColor: "rgba(14, 18, 27, 0.84)",
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: "center",
    marginBottom: 12,
  },
  fallbackAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignSelf: "center",
    marginBottom: 12,
    backgroundColor: "#D7E7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackAvatarText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1A2A21",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F7F8FB",
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    color: "#AEB6C5",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  detailRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  detailLabel: {
    fontSize: 13,
    color: "#8891A0",
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    color: "#F7F8FB",
    fontWeight: "600",
  },
});
