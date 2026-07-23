# Turning push notifications on

The app is fully wired for push — it registers device tokens, and when a friend
earns a city badge the `send-push` function notifies their followers. Delivery is
gated on **three account-side steps only you can do** (they need your Expo login
and your Apple Developer account). After these, push works with no code changes.

Bundle ID: `com.pranjalrai.whim` · Expo slug: `whim`

---

## 1. Create the EAS project → get a projectId

The device can't mint an Expo push token without a `projectId`. Create one:

```bash
cd whim-mobile
npx eas-cli login          # your Expo account
npx eas-cli init           # creates the project, writes extra.eas.projectId into app.json
```

Confirm it landed:

```bash
grep -A2 '"eas"' app.json   # should show a projectId UUID
```

`lib/push.ts` already reads `extra.eas.projectId`, so nothing else to change here.

---

## 2. Give Expo an APNs key so it can talk to Apple

Expo's push service forwards to Apple on your behalf — it needs an APNs **key**
(.p8). Let EAS create and register one for you (easiest), or upload an existing key:

```bash
npx eas-cli credentials       # pick iOS → your bundle id → Push Notifications: Set up
```

Choose "let EAS handle it" and it generates the APNs key in your Apple Developer
account and stores it on Expo. (Manual path: Apple Developer → Certificates,
Identifiers & Profiles → Keys → **+** → enable Apple Push Notifications service →
download the .p8 once → upload via the `eas credentials` "upload" option.)

---

## 3. Ship a build with the push capability

The Push Notifications capability must be on the App ID **and** in the build.

- **App ID**: Apple Developer → Identifiers → `com.pranjalrai.whim` → check
  **Push Notifications** → Save. Then regenerate the distribution provisioning
  profile so it includes the capability.
- **Entitlement**: `ios/Whim/Whim.entitlements` now has
  `aps-environment = production` (correct for TestFlight/App Store). Leave it.
  Note: `ios/` is gitignored — if you ever run `expo prebuild --clean` this
  resets to `development`, so re-set it to `production` before archiving.
- Archive and upload as usual (this becomes build 6).

---

## Verify it works

1. On a **real device** (push never works on the simulator), open the app while
   signed in, then accept the notification permission prompt when it appears in
   the trip-reminder flow (or grant it in iOS Settings).
2. Check the token registered:
   ```sql
   select user_id, platform, created_at from push_tokens order by created_at desc limit 5;
   ```
3. Have that user hit a badge threshold (1st / 3rd / 5th check-in in a city). A
   follower with a registered token should get "…earned their <City> badge."

`send-push` verifies the caller actually holds the badge (can't be spoofed) and
caps at 50 sends/day per user.
