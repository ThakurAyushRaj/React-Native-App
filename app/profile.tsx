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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "./context/ThemeContext";
import { User, loadStoredUser } from "./utils/auth";

export default function ProfileScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
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
            ACCOUNT
          </Text>
        </View>

        <Text style={[styles.title, { color: theme.title }]}>Profile</Text>

        <View style={[styles.profileCard, { backgroundColor: theme.cardBg }]}>
          <View
            style={[styles.cardAccent, { backgroundColor: theme.cardAccent }]}
          />
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

          <Text style={[styles.name, { color: theme.cardTitle }]}>
            {displayName}
          </Text>
          <Text style={[styles.email, { color: theme.cardText }]}>
            {displayEmail}
          </Text>

          <View
            style={[styles.detailRow, { borderTopColor: theme.cardBorder }]}
          >
            <Text style={[styles.detailLabel, { color: theme.cardText }]}>
              Full Name
            </Text>
            <Text style={[styles.detailValue, { color: theme.cardTitle }]}>
              {displayName}
            </Text>
          </View>
          <View
            style={[styles.detailRow, { borderTopColor: theme.cardBorder }]}
          >
            <Text style={[styles.detailLabel, { color: theme.cardText }]}>
              Email
            </Text>
            <Text style={[styles.detailValue, { color: theme.cardTitle }]}>
              {displayEmail}
            </Text>
          </View>
          <View
            style={[styles.detailRow, { borderTopColor: theme.cardBorder }]}
          >
            <Text style={[styles.detailLabel, { color: theme.cardText }]}>
              Account Type
            </Text>
            <Text style={[styles.detailValue, { color: theme.cardTitle }]}>
              Authenticated User
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
    top: 82,
    right: -32,
    width: 178,
    height: 178,
    borderRadius: 89,
    opacity: 0.78,
  },
  accentBlobSecondary: {
    position: "absolute",
    bottom: 206,
    left: -22,
    width: 150,
    height: 150,
    borderRadius: 75,
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
    marginBottom: 18,
  },
  profileCard: {
    width: "100%",
    borderRadius: 18,
    padding: 16,
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
    alignSelf: "flex-start",
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
    textAlign: "center",
  },
  email: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  detailRow: {
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  ring1: {
    position: "absolute",
    top: 44,
    left: -66,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1.5,
  },
  ring2: {
    position: "absolute",
    bottom: 160,
    right: -50,
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
  },
  blobTertiary: {
    position: "absolute",
    top: "40%",
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    opacity: 0.55,
  },
});
