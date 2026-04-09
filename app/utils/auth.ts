import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

export type User = {
  email: string;
  name: string;
  photo?: string;
  accessToken?: string;
};

export async function loadStoredUser(): Promise<User | null> {
  let storedUser = await AsyncStorage.getItem("user");

  if (!storedUser) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    storedUser = await AsyncStorage.getItem("user");
  }

  return storedUser ? (JSON.parse(storedUser) as User) : null;
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
