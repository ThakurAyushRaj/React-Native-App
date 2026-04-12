import Constants from "expo-constants";
import { Platform } from "react-native";

export const APP_DISPLAY_NAME = Constants.expoConfig?.name ?? "App";

function getServerBaseUrl(): string {
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

  return "http://127.0.0.1:3000";
}

async function postNotification(
  endpoint: string,
  payload: Record<string, string>,
): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const serverBaseUrl = getServerBaseUrl();
    await fetch(`${getServerBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        serverBaseUrl,
      }),
      signal: controller.signal,
    });
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
