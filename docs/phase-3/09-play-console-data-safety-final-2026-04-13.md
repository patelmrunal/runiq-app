# Play Console Data Safety Final Answer Pack (2026-04-13)

Use this file as the canonical answer sheet while filling Play Console.

## Important
- This is a submission pack based on current code and dependencies.
- Final legal approval is still required before clicking Publish in Play Console.

## High-Level Selections

### Does your app collect or share any of the required user data types?
- Answer: Yes

### Is all user data collected encrypted in transit?
- Answer: Yes

### Do you provide a way for users to request deletion of their data?
- Answer: Yes
- Basis: Account/user data is app-owned and can be deleted through support/backend process.

## Data Types To Declare

### Location
- Data type: Precise location
- Collected: Yes
- Shared: No (app-side processing and Firebase storage path)
- Required for app functionality: Yes
- Purpose: App functionality, analytics, fraud prevention/security
- Processed ephemerally: No

### Personal info
- Data type: Email address
- Collected: Yes
- Shared: No
- Required for app functionality: Yes
- Purpose: App functionality, account management
- Processed ephemerally: No

### User IDs
- Data type: User ID / account identifiers
- Collected: Yes
- Shared: No
- Required for app functionality: Yes
- Purpose: App functionality, analytics
- Processed ephemerally: No

### Device or other IDs
- Data type: Device identifiers / push token equivalents
- Collected: Yes
- Shared: No (except SDK-managed transport required for notifications/ads)
- Required for app functionality: Yes
- Purpose: App functionality, analytics, advertising/marketing (if ads enabled)
- Processed ephemerally: No

### App activity
- Data type: App interactions and analytics events
- Collected: Yes
- Shared: SDK-dependent (mark according to current Firebase/Ads legal guidance)
- Required for app functionality: No
- Purpose: Analytics, performance/monitoring, advertising/marketing
- Processed ephemerally: No

## SDK Evidence Snapshot
- Firebase Auth, Firestore, Messaging, Analytics are present in dependencies.
- Google Mobile Ads SDK is present in dependencies.
- AD ID permissions appear in release merged manifest.

## Policy Alignment Notes
- Prominent background location disclosure is implemented in-app before permission prompts.
- In-app Privacy Policy entry point is implemented in the More tab.
- Privacy policy URL constant currently points to: https://runiq-dev.web.app/privacy-policy

## Console Fill Sequence
1. Open Play Console -> App content -> Data safety.
2. Answer global questions from High-Level Selections.
3. Add each declared data type from Data Types To Declare.
4. Validate SDK-linked sharing/collection rows against legal signoff.
5. Save draft and capture screenshots for release evidence.
