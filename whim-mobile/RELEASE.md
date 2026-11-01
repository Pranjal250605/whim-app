# Cutting a TestFlight build

We build locally with `xcodebuild` (not EAS cloud builds) and upload straight to
App Store Connect. Auth is an App Store Connect API key.

**Fixed values**
- API key: `/Users/pranjal/Downloads/AuthKey_UP3BMQ6R6Z.p8` · key ID `UP3BMQ6R6Z`
- Issuer ID: `453166ee-7f20-4130-bf2a-d976489be0a6`
- Team: `TQFWD2K499` · bundle `com.pranjalrai.whim`

## ⚠️ Two gotchas that cost real time

1. **Bump the build number in `ios/Whim/Info.plist`, not just `app.json`.**
   `ios/` is gitignored and `CFBundleVersion` is a **literal** there (not
   `$(CURRENT_PROJECT_VERSION)`). Editing `app.json`'s `buildNumber` alone does
   **not** reach the archive — you'll stamp whatever is in Info.plist (a stale
   `expo prebuild --clean` resets it to `1`, which App Store Connect rejects as a
   duplicate). Set both:
   ```bash
   /usr/libexec/PlistBuddy -c "Set :CFBundleVersion 6" ios/Whim/Info.plist
   # and keep app.json ios.buildNumber in sync for clarity
   ```
2. **Push entitlement resets on prebuild.** `ios/Whim/Whim.entitlements` must have
   `aps-environment = production`. `expo prebuild --clean` drops it back to
   `development` (and can remove the push capability). Re-check before archiving.
   The *archive* may still show `development` + `get-task-allow=true` — that's fine,
   the app-store export below re-signs to a distribution/production profile.

3. **`403 REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED` on export** = Apple published new
   terms. The account holder accepts them in App Store Connect → Business (all
   agreements must show Active); the archive stays valid, so just re-run step 4.
   It can take a few minutes after accepting before uploads go through.

4. **`pod install` crashes with `Encoding::CompatibilityError`** = the shell
   isn't UTF-8. Run it as `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`
   (or add `export LANG=en_US.UTF-8` to `~/.zshrc`).

## macOS 27 "Golden Gate" / Xcode 27 (prepared 2026-10-31)
Xcode 26.x doesn't run on macOS 27 — you need **Xcode 27**. Xcode 27 rejects
any target below iOS 15.0; three pod resource bundles (SDWebImage 9.0,
MapboxMapsResources 11.0, RNCAsyncStorage_resources 13.4) were below it.
`plugins/withXcode27PodTargets.js` (in app.json) raises every pod target to
the app's 15.1 on each prebuild — already applied, verified with Xcode 26.6.
After updating macOS:
1. Install Xcode 27 (App Store), open it once, accept the licence, install the
   iOS 27 simulator runtime; `sudo xcode-select -s /Applications/Xcode.app`.
2. `cd ios && LANG=en_US.UTF-8 pod install` (Podfile already has the fix).
3. Simulator build (HANDOFF → App build/run), then a Release archive. First
   Xcode 27 build is the real test — React Native 0.76 may need more fixes.
4. Once it builds, delete the iOS 26.5 runtime (`xcrun simctl runtime list`,
   then `xcrun simctl runtime delete <id>`) to get ~8 GB back.

## Steps (SCRATCH = a temp dir)

```bash
# 1. bump version (see gotcha 1)
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion <N>" ios/Whim/Info.plist

# 2. archive
xcodebuild -workspace ios/Whim.xcworkspace -scheme Whim -configuration Release \
  -destination generic/platform=iOS -archivePath "$SCRATCH/Whim<N>.xcarchive" \
  -allowProvisioningUpdates \
  -authenticationKeyPath /Users/pranjal/Downloads/AuthKey_UP3BMQ6R6Z.p8 \
  -authenticationKeyID UP3BMQ6R6Z \
  -authenticationKeyIssuerID 453166ee-7f20-4130-bf2a-d976489be0a6 \
  DEVELOPMENT_TEAM=TQFWD2K499 CODE_SIGN_STYLE=Automatic archive

# 3. verify the number BEFORE uploading
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" \
  "$SCRATCH/Whim<N>.xcarchive/Products/Applications/Whim.app/Info.plist"   # must be <N>

# 4. export + upload (ExportOptions.plist: method=app-store-connect, destination=upload)
xcodebuild -exportArchive -archivePath "$SCRATCH/Whim<N>.xcarchive" \
  -exportOptionsPlist "whim-mobile/ExportOptions.plist" -exportPath "$SCRATCH/export<N>" \
  -allowProvisioningUpdates \
  -authenticationKeyPath /Users/pranjal/Downloads/AuthKey_UP3BMQ6R6Z.p8 \
  -authenticationKeyID UP3BMQ6R6Z \
  -authenticationKeyIssuerID 453166ee-7f20-4130-bf2a-d976489be0a6
# success = "Progress 100%: Upload succeeded." + "** EXPORT SUCCEEDED **"
```

`ExportOptions.plist`:
```xml
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>TQFWD2K499</string>
  <key>uploadSymbols</key><true/>
</dict>
```

The dSYM "Upload Symbols Failed" warnings for Mapbox/hermes frameworks are benign.

## Build history

| # | Date | Highlights |
|---|------|-----------|
| 1 | Jul 22 | First upload: new bundle ID, Field Notes sign-in, forgot-password, Terms |
| 2 | Jul 22 | Rooms UGC moderation (report/block/leave) |
| 3 | Jul 23 | Perf: map release-on-unfocus, virtualized lists, photo cache, React Query |
| 4 | Jul 23 | Tabs navigator (killed tab-switch freeze), feed cache fix |
| 5 | Jul 23 | European decks to Japan/USA depth (~45/city) + stress fixes |
| 6 | Jul 24 | Analytics + crash logging, real Google photos, push (APNs) live, analytics dashboard |
| 7 | Jul 24 | Smarter deck (undo + super-save), seasonal collections, directions to saved spots, offline mode, nav fade fix |
| 8 | Jul 25 | Rebrand in-app wordmark Whim → BeWhim (name/UI/editors' author); icon artwork unchanged |
| 9 | Jul 26 | Super-rich Near Me (grounded blurbs, open/price/walk, tags, tips, distance+time ranking, personalized, save-to-spots); BeWhim permission strings |
| 10 | Jul 27 | "Your spots" space; saved-spots surfacing fix; audit fixes (cross-user cache clear, push rebrand, save-vibe pin) |
| 11 | Jul 28 | Catalogue 13→48 cities / 2,160 spots (seed-city engine); European expansion for beta |
| 12 | Sep 27 | +15 Batch-4 cities in picker (63 total); smart route (hours as constraints + best start + 2-opt, ~39% shorter days); Japan transit shows instant estimates; Open in Maps multi-stop fix; Near Me two-phase load (list in ~6 s, tips fill in place); dashed leg connector. No native changes (no prebuild) |
| 13 | Oct 3 | Product analytics (route_viewed, open_in_maps, share, room funnel); guide discovery + saving synced to the account (device saves from build 12 move over on first load); creator guide pages; migration 0023 `saved_guides` (already applied); App Store 1.2 pass (language filter, honest report/block, creator-page block, privacy policy update); handle/publish errors shown in-sheet; heart icon fix. Uploaded Oct 3 17:01. No native changes (no prebuild) |
| 14 | Oct 12 | Real Google photo on Discover hero, Room matches, Passport and sub-places (50 cities had blank cards; stock photos were sometimes of other cities); catalogue balanced server-side (3,128 places, every city 42+; sub-places in all 63 cities). No native changes (no prebuild) |
