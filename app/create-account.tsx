import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function CreateAccountScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  const handleCreateAccount = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      return;
    }

    try {
      const userData = {
        name: trimmedName,
        email: trimmedEmail,
        photo: "https://via.placeholder.com/100",
      };

      await AsyncStorage.setItem("user", JSON.stringify(userData));
      router.replace("/home");
    } catch (error) {
      console.log("Error saving created user:", error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", default: undefined })}
      style={styles.screen}
    >
      <View style={styles.accentBlob} />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [34, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.eyebrow}>NEW HERE</Text>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Set up your profile to continue.</Text>

        <TextInput
          onChangeText={setName}
          placeholder="Full name"
          placeholderTextColor="#8B8F98"
          style={styles.input}
          value={name}
        />

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

        <Pressable style={styles.primaryButton} onPress={handleCreateAccount}>
          <Text style={styles.primaryButtonText}>Create account</Text>
        </Pressable>

        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Back to login</Text>
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
    backgroundColor: "#EDF4F1",
  },
  accentBlob: {
    position: "absolute",
    top: 90,
    left: -40,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#BFDCCB",
    opacity: 0.55,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    shadowColor: "#244033",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#4F8A68",
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1A2A21",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#617067",
    marginBottom: 22,
  },
  input: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F1F6F3",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1A2A21",
    marginBottom: 12,
  },
  primaryButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#1A2A21",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  backLink: {
    marginTop: 18,
    alignSelf: "center",
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F8A68",
  },
});
