const express = require("express");
const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch").default;
const cors = require("cors");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

const PROJECT_ID = "react-native-app-697de";

// 🔥 Your Firebase service account file (absolute path, works regardless of cwd)
const KEY_FILE = path.join(
  __dirname,
  "react-native-app-697de-firebase-adminsdk-fbsvc-d4c5f20511.json",
);

// 🔐 Function to send notification
async function sendNotification(token) {
  const auth = new GoogleAuth({
    keyFile: KEY_FILE,
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

  const message = {
    message: {
      token: token,
      notification: {
        title: "🎉 Login Successful",
        body: "Welcome to the app 🚀",
      },
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  return await response.json();
}

// 🚀 API to trigger notification
app.post("/send-notification", async (req, res) => {
  try {
    const { token } = req.body;
    const result = await sendNotification(token);
    res.json(result);
  } catch (error) {
    console.error("sendNotification error:", error?.message || error);
    res.status(500).send("Error sending notification");
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
