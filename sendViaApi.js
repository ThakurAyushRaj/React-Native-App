const { GoogleAuth } = require("google-auth-library");
const fetch = require("node-fetch");

const PROJECT_ID = "react-native-app-697de";
const DEVICE_TOKEN = "fEEfu08_SjWNKzvezkx8j3:APA91bFYHe9-JaGf3xxGLE_0Zb7PG4mWdjP2oeoC0I7vwn5zKGG0brcjixDZBssJONefec1gCcxg6qg3rBgkM0UV0lUFuzFy0DD5b5by2MsKJj-z_oriAUs";

async function sendNotification() {
const auth = new GoogleAuth({
keyFile: "./react-native-app-697de-firebase-adminsdk-fbsvc-d4c5f20511.json",
scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

const client = await auth.getClient();
const accessToken = await client.getAccessToken();

const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;

const message = {
message: {
token: DEVICE_TOKEN,
notification: {
title: "Hello!!",
body: "welcome to React Native App",
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

const data = await response.json();
console.log("📩 Response:", data);
}

sendNotification();
