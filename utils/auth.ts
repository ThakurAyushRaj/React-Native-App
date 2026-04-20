import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

export type User = {
  email: string;
  name: string;
  photo?: string;
  accessToken?: string;
  supabaseUserId?: string;
};

export async function loadStoredUser(): Promise<User | null> {
  const storedUser = await AsyncStorage.getItem("user");
  return storedUser ? (JSON.parse(storedUser) as User) : null;
}

export async function saveStoredUser(user: User) {
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function saveFcmToken(token: string) {
  await AsyncStorage.setItem("fcm_token", token);
}

export async function loadFcmToken(): Promise<string | null> {
  return AsyncStorage.getItem("fcm_token");
}

export async function logoutUser() {
  if (Platform.OS !== "web") {
    try {
      await GoogleSignin.signOut();
    } catch {
      // ignore sign-out errors
    }
  }

  await AsyncStorage.removeItem("user");
}
