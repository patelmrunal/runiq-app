# Phase 3 Open Items and Left Work

## Remaining Work Breakdown

## Backend
- Tune scheduler batching strategy if user count grows (current version scans active users).
- Add monthly shield grant scheduler with idempotency marker. (Done 2026-04-11; implemented inside midnight policy flow)
- Apply shield auto-consume only when currentStreak <= 5. (Done 2026-04-11)

## Firestore Model
- Confirm and freeze final fields for dailyTasks and events after first emulator run. (Done)
- Decide whether notification audit docs are required in addition to user dedupe fields.

## App Integration
- Confirm level-up copy and unlock message content from product side.
- Add optional in-app setting to disable non-critical push categories.
- Run Play Store launch-readiness checklist (foreground location disclosure text, Data Safety form alignment, privacy-policy links, permission rationale copy).
- Run Play Store launch-readiness checklist (foreground location disclosure text, Data Safety form alignment, privacy-policy links, permission rationale copy). (Done audit 2026-04-13; follow-up actions pending)
- Implement policy-grade background-location prominent disclosure UX before runtime permission prompts. (Done 2026-04-13)
- Wire in-app privacy policy URL access point in More/Profile. (Done 2026-04-13)
- Finalize Play Console Data Safety answers in repo for direct submission entry. (Done 2026-04-13)
- Add visible shield inventory UI (dashboard + profile parity). (Done 2026-04-11)
- Fix total runs mapping to use backend runCount source field. (Done 2026-04-11)
- Prevent midnight fallback from exposing full auto template catalog to authenticated users. (Done 2026-04-11)
- Improve recent runs rendering path to reduce lag (FlatList-based rendering). (Done 2026-04-11)
- Define and implement Run tab action-hub behavior distinct from dashboard. (Done 2026-04-11)

## Verification
- Android device smoke validation after clean install/rebuild for Reanimated overlay path. (Done 2026-04-09)
- Android real-device background tracking validation (screen off/app background continuity). (Done 2026-04-13)
- iOS device smoke validation for parity signoff. (Deferred to Phase 4 for Android-first launch)

## Product/Logic Clarifications (if needed)
- Confirm whether premium bonus challenge task is in Phase 3 scope now or next phase.
- Confirm if level reset on streak break should always drop to Level 1 (per PRD edge case) or follow softer policy.
- Confirm final copy for shield warning, streak reset empathy message, and level-up unlock message.
- Free run streak-credit policy locked for implementation: minimum 1.4 km required. (Done 2026-04-11)

## Status
- No blocker currently.
- Implementation Waves 1, 2, and 3 completed.
- Emulator test matrix T01-T10 passed (10/10) on 2026-04-09.
- Phase 3 is functionally complete for documented scope.
- Production task catalog rollout completed on 2026-04-09 with 60 active templates and legacy template deactivation.
- Android release build/install smoke passed on 2026-04-09 after reanimated/worklets alignment.
- Post-feedback Phase 3.1 change plan documented on 2026-04-11 (see file 07).
- Phase 3.1 implementation wave completed on 2026-04-11 for documented app/backend scope.
- QA hotfix wave completed on 2026-04-11 for sparse_gps handling, task distance+pace completion policy, profile backend-status alignment, and background tracking enablement.
- One-time sparse_gps historical backfill executed on 2026-04-11 in runiq-dev (1 run restored, +3.66 km, +1 runCount; no retro streak recalculation).
- Follow-up logic hardening completed on 2026-04-12: task runs now credit streak only when completed, and RunTrackingScreen unmount no longer force-stops active tracking/background service.
- Background tracking resiliency hardening completed on 2026-04-12: runTrackingService now auto-recovers dropped GPS watches on error/stall with bounded restart attempts.
- Additional background hardening completed on 2026-04-12: active run watch is lock-protected from replacement, run watch uses fused provider preference, and Android foreground-service startup is retried/required at run start.
- Follow-up backend deploy completed on 2026-04-12: onRunLogCreated successfully updated in runiq-dev (asia-south1).
- Android-first launch signoff: accepted.
- iOS parity smoke is explicitly deferred to Phase 4 planning.
- Play Store follow-up implementation completed in app/docs on 2026-04-13.
- Remaining manual operator step: enter file 09 selections in Play Console Data Safety UI and save submission draft.
