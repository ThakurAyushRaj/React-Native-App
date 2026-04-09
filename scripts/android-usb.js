/**
 * android-usb.js
 * Sets up ADB USB reverse tunnels then launches expo run:android --localhost.
 * This ensures the dev client connects via USB cable, not Wi-Fi, so it works
 * regardless of network conditions and survives Metro port changes (8081/8082).
 */
const { execSync, spawn } = require("child_process");

const ADB =
  "C:\\Users\\rajay\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe";

// Metro ports + backend server port
const PORTS = [8081, 8082, 3000];

console.log("Setting up ADB USB reverse tunnels...");
let adbOk = false;

for (const port of PORTS) {
  try {
    execSync(`"${ADB}" reverse tcp:${port} tcp:${port}`, { stdio: "pipe" });
    console.log(`  ✓ USB tunnel: phone:${port} → laptop:${port}`);
    adbOk = true;
  } catch {
    // Port may not be in use yet – that is fine; we set it up proactively.
  }
}

if (!adbOk) {
  // Attempt basic device check to surface a useful message.
  try {
    const devices = execSync(`"${ADB}" devices`, { encoding: "utf8" });
    const connected =
      devices.includes("device") &&
      !devices.trim().endsWith("List of devices attached");
    if (!connected) {
      console.warn(
        "\n⚠  No Android device detected over USB.\n" +
          "   Make sure USB debugging is ON and the cable is connected.\n" +
          "   The app will try Wi-Fi fallback, which may fail if they are on different networks.\n",
      );
    }
  } catch {
    console.warn("⚠  Could not run adb. Continuing without USB tunnels.");
  }
}

console.log("\nStarting expo run:android via USB tunnel...\n");

// REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1 makes Metro tell the dev client
// to connect on 127.0.0.1 instead of the LAN IP.  Combined with adb reverse
// above, all traffic travels over the USB cable — no Wi-Fi needed.
const child = spawn("npx", ["expo", "run:android"], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1" },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
