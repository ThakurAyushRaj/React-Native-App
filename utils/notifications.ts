import Constants from "expo-constants";
import { Platform } from "react-native";

export const APP_DISPLAY_NAME = Constants.expoConfig?.name ?? "App";

function getServerBaseUrl(): string {
  // Check for ngrok URL in environment - this is set when you run ngrok
  const ngrokUrl = process.env.EXPO_PUBLIC_NGROK_URL || "";

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (
      Constants as {
        manifest2?: { extra?: { expoGo?: { debugHost?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debugHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3000`;
  }

  return ngrokUrl;
}

async function postNotification(
  endpoint: string,
  payload: Record<string, string>,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const serverBaseUrl = getServerBaseUrl();

  if (!serverBaseUrl) {
    console.log("No server URL configured for notifications");
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    console.log("Sending notification to:", `${serverBaseUrl}${endpoint}`);
    console.log("Payload:", payload);
    const response = await fetch(`${serverBaseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const result = await response.json();
    console.log("Notification result:", result);
  } catch (error: any) {
    console.log("Notification error:", error?.message || error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function sendLoginNotification(
  token: string,
  userName: string,
): Promise<void> {
  await postNotification("/send-notification", {
    token,
    userName,
    appName: APP_DISPLAY_NAME,
  });
}

export async function sendDownloadNotification(
  token: string,
  userName: string,
): Promise<void> {
  await postNotification("/send-download-notification", {
    token,
    userName,
    appName: APP_DISPLAY_NAME,
  });
}
