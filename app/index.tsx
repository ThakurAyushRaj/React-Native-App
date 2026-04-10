import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

WebBrowser.maybeCompleteAuthSession();

function getNotificationServerUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (
      Constants as {
        manifest2?: { extra?: { expoGo?: { debugHost?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debugHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000/send-notification`;
  }

  return "http://127.0.0.1:3000/send-notification";
}

async function sendLoginNotification(token: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    await fetch(getNotificationServerUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === "web") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permission was not granted.");
    return null;
  }

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  return deviceToken.data;
}

async function setupPushNotificationsAsync() {
  const token = await registerForPushNotificationsAsync();
  if (token) {
    console.log("Firebase device push token:", token);
  }
  return token;
}

if (Platform.OS !== "web") {
  GoogleSignin.configure({
    webClientId:
      "625045853365-lusm8nhh4d5c09akaceimubhqhcnpjmp.apps.googleusercontent.com",
    offlineAccess: false,
    scopes: ["profile", "email"],
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pushTokenReady, setPushTokenReady] = useState(false);
  const entrance = useRef(new Animated.Value(0)).current;
  const fcmToken = useRef<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Web-only: expo-auth-session hook must always be called (rules of hooks)
  const [webRequest, webResponse, promptWebAsync] = Google.useAuthRequest({
    androidClientId:
      "625045853365-jkk7gtlmoe971qv210l86a1rt6ts5skp.apps.googleusercontent.com",
    webClientId:
      "625045853365-lusm8nhh4d5c09akaceimubhqhcnpjmp.apps.googleusercontent.com",
    scopes: ["openid", "profile", "email"],
  });

  const resolvePhotoForStorage = async (
    photoUrl: string,
    accessToken?: string,
  ) => {
    if (!photoUrl) {
      return photoUrl;
    }

    // On web, persist a data URL so avatar rendering does not depend on remote host policies.
    if (Platform.OS !== "web") {
      return photoUrl;
    }

    try {
      const response = await fetch(photoUrl, {
        headers: accessToken
          ? {
              Authorization: `Bearer ${accessToken}`,
            }
          : undefined,
      });

      if (!response.ok) {
        return photoUrl;
      }

      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string) || photoUrl);
        reader.onerror = () => reject(new Error("Failed to read image blob"));
        reader.readAsDataURL(blob);
      });

      return dataUrl;
    } catch {
      return photoUrl;
    }
  };

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification tap response:", response);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const setupPush = async () => {
      try {
        const token = await setupPushNotificationsAsync();
        if (isMounted) {
          fcmToken.current = token ?? null;
          setPushTokenReady(Boolean(token));
        }
      } catch (error) {
        console.log("Push notification setup error:", error);
        if (isMounted) {
          setPushTokenReady(false);
        }
      }
    };

    setupPush();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Google sign-in response on web
  useEffect(() => {
    if (Platform.OS !== "web" || webResponse?.type !== "success") return;
    const handleWebSignIn = async () => {
      try {
        const accessToken = webResponse.authentication?.accessToken;
        let userData = {
          email: "google-user@example.com",
          name: "Google User",
          photo:
            "https://ui-avatars.com/api/?name=Google+User&background=F2B680&color=1F1A17",
          accessToken: "",
        };
        if (accessToken) {
          const profileRes = await fetch(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );
          if (profileRes.ok) {
            const profile = await profileRes.json();
            const resolvedPhoto = await resolvePhotoForStorage(
              profile.picture || "",
              accessToken,
            );
            userData = {
              email: profile.email || userData.email,
              name: profile.name || userData.name,
              photo:
                resolvedPhoto ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name || "Google User")}&background=F2B680&color=1F1A17`,
              accessToken,
            };
          }
        }
        await AsyncStorage.setItem("user", JSON.stringify(userData));
        router.replace("/home");
      } catch (error) {
        console.log("Web Google sign-in error:", error);
      }
    };
    handleWebSignIn();
  }, [webResponse, router]);

  const handleGoogleLogin = async () => {
    if (Platform.OS === "web") {
      promptWebAsync();
      return;
    }
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const user = userInfo.data?.user;
      if (!user) throw new Error("No user returned from Google Sign-In");

      const photo = await resolvePhotoForStorage(
        user.photo ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Google User")}&background=F2B680&color=1F1A17`,
      );

      const userData = {
        email: user.email || "google-user@example.com",
        name: user.name || "Google User",
        photo,
        accessToken: "",
      };

      await AsyncStorage.setItem("user", JSON.stringify(userData));
      if (fcmToken.current) {
        sendLoginNotification(fcmToken.current).catch((e) =>
          console.log("Notification send error:", e),
        );
      }
      router.replace("/home");
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert(
            "Google Play Services required",
            "Please update Google Play Services and try again.",
          );
          return;
        }
      }
      console.log("Google Sign-In error:", error);
      Alert.alert(
        "Sign-in failed",
        "Could not sign in with Google. Please try again.",
      );
    }
  };

  const handleNormalLogin = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return;
    }

    try {
      const userData = {
        email: trimmedEmail,
        name: trimmedEmail.split("@")[0],
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedEmail.split("@")[0])}&background=D7E7D0&color=1A2A21`,
        accessToken: "",
      };

      await AsyncStorage.setItem("user", JSON.stringify(userData));

      if (fcmToken.current) {
        sendLoginNotification(fcmToken.current).catch((e) =>
          console.log("Notification send error:", e),
        );
      }

      const persistedUser = await AsyncStorage.getItem("user");
      if (persistedUser) {
        router.replace("/home");
      }
    } catch (error) {
      console.log("Error saving user:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", default: undefined })}
      style={styles.screen}
    >
      <View style={styles.backgroundCircleTop} />
      <View style={styles.backgroundCircleBottom} />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.eyebrow}>HELLO AGAIN</Text>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Use Google or sign in with email.</Text>

        {pushTokenReady ? (
          <Text style={styles.pushStatusText}>
            Push notifications connected to Firebase
          </Text>
        ) : null}

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#8B8F98"
          style={styles.input}
          value={email}
        />

        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#8B8F98"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        <Pressable style={styles.primaryButton} onPress={handleNormalLogin}>
          <Text style={styles.primaryButtonText}>Login</Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={[
            styles.googleButton,
            Platform.OS === "web" && !webRequest ? { opacity: 0.5 } : undefined,
          ]}
          onPress={handleGoogleLogin}
          disabled={Platform.OS === "web" && !webRequest}
        >
          <Image
            source={{ uri: "https://www.google.com/favicon.ico" }}
            style={styles.googleIcon}
          />
          <Text style={styles.googleButtonText}>Login with Google</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryAction}
          onPress={() => router.push("/create-account")}
        >
          <Text style={styles.secondaryActionText}>Create account</Text>
        </Pressable>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F5EFE6",
  },
  backgroundCircleTop: {
    position: "absolute",
    top: -70,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#F2B680",
    opacity: 0.35,
  },
  backgroundCircleBottom: {
    position: "absolute",
    bottom: 60,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#D7E7D0",
    opacity: 0.55,
  },
  card: {
    backgroundColor: "#FFFDF8",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#42342B",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#B26A39",
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    color: "#1F1A17",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6F665F",
    marginBottom: 22,
  },
  pushStatusText: {
    fontSize: 13,
    color: "#6A8B5E",
    marginBottom: 14,
    fontWeight: "600",
  },
  input: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F3EEE8",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1F1A17",
    marginBottom: 12,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#1F1A17",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFDF8",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2D8CD",
  },
  dividerText: {
    fontSize: 13,
    color: "#8B8179",
  },
  googleButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2D8CD",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2F2A26",
  },
  secondaryAction: {
    marginTop: 18,
    alignSelf: "center",
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#B26A39",
  },
});
