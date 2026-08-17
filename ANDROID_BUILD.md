# RPM Motors — Android App Build Guide

## Prerequisites

Install these on your machine before building:

| Tool | Download |
|------|----------|
| Android Studio (latest) | https://developer.android.com/studio |
| Java JDK 17+ | https://adoptium.net |
| Node.js 18+ | https://nodejs.org |
| pnpm | `npm install -g pnpm` |

---

## Quick Build Steps

### 1 — Unzip & Install Dependencies
```bash
unzip sourcecode.zip -d rpm-motors
cd rpm-motors
pnpm install
```

### 2 — Set Environment Variables
Create a `.env` file in the project root:
```
VITE_SUPABASE_URL=https://cwdgvjeqxhivlnrivthh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3ZGd2amVxeGhpdmxucml2dGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NjU3MjcsImV4cCI6MjEwMDE0MTcyN30.iY8F6s2dlLuHxuqVcIyCDM_hwMJBOvrltV3ogwkQyCg
```

### 3 — Build Web App
```bash
pnpm run build
```
This creates the `dist/` folder — the web assets Capacitor bundles into the app.

### 4 — Sync with Android
```bash
npx cap sync android
```
This copies `dist/` into `android/app/src/main/assets/public/`.

### 5 — Open in Android Studio
```bash
npx cap open android
```
Android Studio will open the `android/` project.

### 6 — Build the APK in Android Studio
- Wait for Gradle sync to complete (1–3 min first time)
- Menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Building a Release APK (for Google Play)

### Create a Keystore (once only)
```bash
keytool -genkey -v -keystore rpm-motors-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias rpm-motors
```

### Sign the Release Build
In Android Studio:
- **Build → Generate Signed Bundle / APK**
- Select **APK**
- Point to your `rpm-motors-release.jks`
- Choose **release** build variant
- Click **Finish**

Release APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## App Details

| Property | Value |
|----------|-------|
| App ID | `com.rpmmotors.app` |
| App Name | `RPM Motors` |
| Min SDK | Android 7.0 (API 24) |
| Target SDK | Android 16 (API 36) |
| Orientation | Portrait |
| Theme | Dark (`#0a0a0a` background, `#e11d48` primary) |

---

## After Every Code Change

```bash
pnpm run build        # rebuild web assets
npx cap sync android  # sync into Android project
# Then rebuild in Android Studio
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Gradle sync fails | File → Invalidate Caches → Restart |
| `SDK not found` | Android Studio → SDK Manager → install API 36 |
| White screen on launch | Check `.env` variables are correct |
| `JAVA_HOME` not set | Set in system environment variables to JDK 17 path |
| Build tools missing | Android Studio → SDK Manager → SDK Tools → install Build Tools 34+ |
