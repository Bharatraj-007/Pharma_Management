# Smart Pharma Mobile — Setup & Run Guide

Complete instructions to install, configure, and run the mobile app
on your physical phone via **Expo Go** (no Xcode or Android Studio needed).

---

## 1. Prerequisites — install these once

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 18 LTS or 20 LTS | https://nodejs.org |
| Expo Go | Latest | Android: Play Store · iOS: App Store |

> **No** Xcode, Android Studio, or EAS account needed for local testing.

---

## 2. Find your laptop's local IP address

Your phone and laptop must be on the **same Wi-Fi network**.

**Windows (PowerShell):**
```powershell
ipconfig
# Look for: IPv4 Address . . . . . . 192.168.x.x  (under your Wi-Fi adapter)
```

**macOS / Linux (Terminal):**
```bash
ifconfig
# Look for: inet 192.168.x.x  (under en0 or wlan0)
```

Write that IP down — you'll need it in Step 4.

---

## 3. Keep the backend running

The backend is **unchanged**. Open a terminal in the backend folder and start it:

```powershell
cd d:\smart-pharma-system\backend
node server.js
# or: npm run dev   (if nodemon is installed)
```

You should see:
```
Server running on 5001
DB Connected to MongoDB Atlas
```

> Make sure your firewall allows inbound connections on port **5001**.
> On Windows: Windows Defender Firewall → Allow an app → add Node.js.

---

## 4. Set your laptop IP in the mobile app

Open this file in any editor:

```
d:\smart-pharma-system\mobile\src\config.js
```

Change line 15 to your actual IP:

```js
// Before (placeholder):
const API_BASE_URL = 'http://192.168.1.100:5001';

// After (your real IP, e.g.):
const API_BASE_URL = 'http://192.168.1.42:5001';
```

Save the file. The Expo bundler hot-reloads, so no restart needed once running.

---

## 5. Install dependencies

```powershell
cd d:\smart-pharma-system\mobile
npm install
```

This installs:
- Expo SDK 51
- React Navigation (Stack + Drawer)
- AsyncStorage
- expo-camera (QR scanning)
- expo-image-picker (task photo attachments)
- react-native-gesture-handler, react-native-reanimated, react-native-screens
- react-native-safe-area-context

---

## 6. Start the Expo development server

```powershell
cd d:\smart-pharma-system\mobile
npx expo start
```

A QR code appears in your terminal (and optionally a browser tab opens at http://localhost:8081).

---

## 7. Open on your phone

1. Make sure your phone is on the **same Wi-Fi** as your laptop.
2. **Android**: Open **Expo Go** → tap "Scan QR code" → scan the terminal QR code.
3. **iOS**: Open the **Camera** app → point at the QR code → tap the Expo Go banner.

The app builds on your phone (first load ~30 s). Subsequent hot-reloads are instant.

---

## 8. Log in

Use the same credentials you already have in MongoDB Atlas.
The Login screen hits `POST /login` on your Express backend.
On success the JWT, role, name, and company are stored in AsyncStorage.

---

## 9. Folder structure (what was created)

```
mobile/
├── App.js                          ← root (GestureHandler + SafeArea + AuthProvider)
├── app.json                        ← Expo config (name, icons, permissions)
├── babel.config.js
├── index.js
├── package.json
├── assets/                         ← icon.png, splash.png (replace with real artwork)
└── src/
    ├── config.js                   ← API_BASE_URL  ← EDIT THIS
    ├── navigation/
    │   ├── AuthContext.js          ← session state (signIn / signOut)
    │   └── AppNavigator.js         ← Drawer (main) + Stack (auth)
    ├── hooks/
    │   └── usePermissions.js       ← mirrors web hook, reads from AuthContext
    ├── utils/
    │   ├── permissions.js          ← PERMISSIONS, MENU_ITEMS, COMPANY_NAMES
    │   └── storage.js              ← AsyncStorage helpers (replaces localStorage)
    ├── styles/
    │   └── theme.js                ← colors, spacing, fontSize, shared StyleSheets
    ├── components/
    │   ├── ui.js                   ← Badge, Btn, Card, Input, TabBar, StatCard …
    │   ├── ScreenWrapper.js        ← SafeAreaView + ScrollView wrapper
    │   └── AccessDenied.js
    └── screens/
        ├── auth/
        │   ├── LoginScreen.js
        │   ├── SignupScreen.js
        │   └── VerifyOTPScreen.js
        ├── dashboard/
        │   ├── DashboardRouter.js  ← picks Admin/Manager/CEO/Worker by role
        │   ├── DashboardPage.js
        │   ├── WorkerDashboard.js  ← QR scan, start/complete tasks
        │   ├── AdminDashboard.js
        │   ├── ManagerDashboard.js
        │   └── CEODashboard.js
        ├── TasksScreen.js
        ├── AttendanceScreen.js
        ├── InventoryScreen.js
        ├── ReportsScreen.js
        ├── ChatScreen.js
        ├── ProfileScreen.js
        ├── LeaveScreen.js
        ├── SettingsScreen.js
        ├── SalaryManagementScreen.js
        ├── UserManagementScreen.js
        └── AuditLogsScreen.js
```

---

## 10. Build a shareable APK (Android, free)

When you're ready to distribute internally to your team without the Play Store:

```powershell
# 1. Install EAS CLI (one-time)
npm install -g eas-cli

# 2. Log in (free Expo account)
eas login

# 3. Configure the project (one-time, run inside mobile/)
cd d:\smart-pharma-system\mobile
eas build:configure

# 4. Build APK for Android (free tier — ~15 min on EAS cloud)
eas build -p android --profile preview
```

In `eas.json` (auto-generated by `eas build:configure`), make sure the `preview` profile looks like:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Download the `.apk` from the EAS dashboard and share it via email or a shared drive.
Recipients enable **Install unknown apps** on their Android device and tap the APK to install.

> **iOS** requires an Apple Developer account ($99/year) and uses TestFlight for internal distribution.

---

## 11. Common troubleshooting

| Problem | Fix |
|---------|-----|
| "Network request failed" on phone | Check `src/config.js` IP matches `ipconfig` output. Both on same Wi-Fi? |
| CORS error in backend logs | Add your phone's IP to `allowedOrigins` in `backend/server.js`, or temporarily set `origin: true` for dev |
| Expo Go shows "Something went wrong" | Run `npx expo start --clear` to wipe the bundler cache |
| QR scanner not working | Grant camera permission in phone Settings → Apps → Expo Go → Permissions |
| `react-native-reanimated` warning | Make sure `babel.config.js` has `plugins: ['react-native-reanimated/plugin']` (already set) |
| Drawer not opening | `react-native-gesture-handler` must be the **first** import in `App.js` (already set) |
| Alert.prompt missing on Android | Android doesn't have `Alert.prompt`. Replace manual foil-KG prompts with inline Input fields in `WorkerDashboard.js` for a production build |

---

## 12. Backend CORS — allow your phone (dev only)

If you see CORS errors, open `backend/server.js` and temporarily add your local subnet:

```js
const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.1.0",      // ← your subnet or specific phone IP
  // ...existing entries
];
```

Or for development only, replace the `origin` function with `origin: true` to allow all origins while on your local network.

---

## Quick-start cheat sheet

```powershell
# Terminal 1 — backend
cd d:\smart-pharma-system\backend
node server.js

# Terminal 2 — mobile
cd d:\smart-pharma-system\mobile
npm install          # first time only
npx expo start       # scan QR with Expo Go on your phone
```

That's it. The app is fully functional on your phone.
