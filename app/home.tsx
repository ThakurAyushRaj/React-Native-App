import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

type User = {
  email: string;
  name: string;
  photo?: string;
  accessToken?: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        let storedUser = await AsyncStorage.getItem("user");

        // Retry once to avoid redirecting before storage settles on first navigation.
        if (!storedUser) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          storedUser = await AsyncStorage.getItem("user");
        }

        if (storedUser) {
          if (isMounted) {
            setUser(JSON.parse(storedUser));
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

  useEffect(() => {
    setImageFailed(false);
  }, [user?.photo]);

  const handleLogout = async () => {
    try {
      if (Platform.OS !== "web") {
        try {
          await GoogleSignin.signOut();
        } catch {
          // ignore sign-out errors
        }
      }
      await AsyncStorage.removeItem("user");
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
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>

      {user && (
        <View style={styles.profileContainer}>
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
        </View>
      )}

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  profileContainer: {
    alignItems: "center",
    marginBottom: 40,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "100%",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
  },
  fallbackAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 15,
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
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: "#666",
  },
  logoutButton: {
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
