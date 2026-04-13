# Play Store Checklist Audit (2026-04-13)

## Scope
This audit validates Android Play Store readiness for:
- location disclosure text,
- Data Safety answers,
- privacy policy links,
- permission rationale copy.

Audit basis: release merged manifest, app runtime permission copy, and active dependencies.

## Checklist Results

### 1) Location Disclosure Text
- Status: Pass
- Evidence:
  - Background location permission exists in release manifest: `ACCESS_BACKGROUND_LOCATION`.
  - Onboarding `LocationPermissionScreen` now includes a policy-grade prominent disclosure with explicit background-use wording.
  - Run entry flow now checks permission state first (no auto permission prompt), and shows an explicit disclosure confirmation before system permission request.
- Why this matters:
  - Play background location policy expects a clear in-app prominent disclosure that explicitly states background collection purpose.
- Completion notes:
  - Disclosure wording implemented with explicit statement:
    - "Runiq collects precise location data to track run distance, pace, and route while a run is active, including when the app is closed or the screen is off."

### 2) Data Safety Answers
- Status: Pass (submission pack finalized)
- Evidence from code/dependencies:
  - Firebase Auth/Firestore/Messaging/Analytics in dependencies.
  - Google Mobile Ads SDK in dependencies.
  - AD ID permissions present in release merged manifest.
  - User profile fields include email, username, displayName; app stores FCM token in users/{uid}/devices.
  - Precise/background location is collected for run tracking.
- Completion notes:
  - Final answer sheet created: `docs/phase-3/09-play-console-data-safety-final-2026-04-13.md`.
  - Contains ready-to-enter selections for collection types, purpose mapping, and console fill sequence.
  - Remaining manual action is operator entry in Play Console UI.

### 3) Privacy Policy Links
- Status: Pass
- Evidence:
  - In-app Privacy Policy entry point implemented in More tab.
  - Canonical policy URL constant added: `https://runiq-dev.web.app/privacy-policy`.
  - Source policy content added at `docs/privacy-policy.md` for publishing traceability.
- Completion notes:
  - Add same URL in Play Console App Content at submission time.

### 4) Permission Rationale Copy
- Status: Partial Pass
- Evidence:
  - Location permission rationale exists.
  - Background location rationale exists.
  - Battery optimization rationale exists.
  - Notification permission is requested by messaging flow; no custom rationale screen text currently shown.
- Required action before submission:
  - Add short pre-permission rationale for notifications (recommended).

## Release Manifest Notes (Important)
Observed in release merged manifest:
- `ACCESS_BACKGROUND_LOCATION`
- `FOREGROUND_SERVICE_LOCATION`
- `POST_NOTIFICATIONS`
- `com.google.android.gms.permission.AD_ID`
- `android.permission.ACCESS_ADSERVICES_AD_ID`

This confirms Play Console forms must reflect location + notifications + ad id usage.

## Go/No-Go for Play Upload (Android)
- Current state: Ready for Play Console submission pass.
- Pre-upload operator steps:
  1. Paste finalized Data Safety selections from file 09 into Play Console.
  2. Confirm Privacy Policy URL in Play Console exactly matches app constant.
  3. Capture compliance screenshots for release evidence.

## Recommended Next Implementation Pass
1. Upload/publish privacy policy page content from `docs/privacy-policy.md` if web page deployment differs from current URL.
2. Keep Data Safety response file 09 updated whenever SDK dependencies change.
3. Run one final release smoke pass before production rollout.
