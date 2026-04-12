const express = require("express");
const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch").default;
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const LOGO_PATH = path.join(__dirname, "..", "assets", "images", "applogo.png");
const NOTIFICATION_IMAGE_PATH = path.join(
  __dirname,
  "..",
  "assets",
  "images",
  "favicon.png",
);

app.get("/applogo.png", (_req, res) => {
  res.sendFile(LOGO_PATH);
});

app.get("/notification-image.png", (_req, res) => {
  res.sendFile(NOTIFICATION_IMAGE_PATH);
});

const PROJECT_ID = "react-native-app-697de";

const KEY_FILE = path.join(
  __dirname,
  "react-native-app-697de-firebase-adminsdk-fbsvc-d4c5f20511.json",
);

const auth = new GoogleAuth({
  keyFile: KEY_FILE,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

let cachedAccessToken = null;
let cachedAccessTokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  // Reuse token until shortly before expiry to avoid a fresh auth roundtrip on every notification.
  if (cachedAccessToken && now < cachedAccessTokenExpiry - 60_000) {
    return cachedAccessToken;
  }

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error("Failed to fetch Firebase access token.");
  }

  cachedAccessToken = token;

  // JWT access tokens are typically valid for 1 hour.
  cachedAccessTokenExpiry = now + 60 * 60 * 1000;
  return cachedAccessToken;
}

async function sendFcmMessage(token, title, body, iconUrl) {
  const accessToken = await getAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

  const message = {
    message: {
      token,
      notification: {
        title,
        body,
      },
      android: {
        priority: "high",
        ttl: "0s",
        notification: {
          channelId: "custom_faaa_v3",
          sound: "faaa",
        },
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "0",
        },
        notification: {
          icon: iconUrl,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            sound: "faaa.mp3",
          },
        },
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  return await response.json();
}

// Login notification
app.post("/send-notification", async (req, res) => {
  try {
    const { token, userName, appName, serverBaseUrl } = req.body;
    const displayName = (userName || "User").trim();
    const displayApp = (appName || "App").trim();
    const iconUrl = `${(serverBaseUrl || "").replace(/\/$/, "")}/applogo.png`;

    const title = `Hello ${displayName} 👋`;
    const body = `Welcome to ${displayApp}! Great to have you back 🚀`;

    const result = await sendFcmMessage(token, title, body, iconUrl);
    res.json(result);
  } catch (error) {
    console.error("send-notification error:", error?.message || error);
    res.status(500).send("Error sending notification");
  }
});

// Download success notification
app.post("/send-download-notification", async (req, res) => {
  try {
    const { token, userName, appName, serverBaseUrl } = req.body;
    const displayName = (userName || "User").trim();
    const displayApp = (appName || "App").trim();
    const iconUrl = `${(serverBaseUrl || "").replace(/\/$/, "")}/applogo.png`;

    const title = `Download Complete ✅`;
    const body = `Hey ${displayName}, your image was saved to the gallery from ${displayApp}!`;

    const result = await sendFcmMessage(token, title, body, iconUrl);
    res.json(result);
  } catch (error) {
    console.error("send-download-notification error:", error?.message || error);
    res.status(500).send("Error sending download notification");
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
