# Phase 4 Open Items and Left Work

## Remaining Work Breakdown

## Backend
- Implement evaluateBadges helper in functions/index.js. (Done 2026-04-18)
- Implement calculateDNA helper in functions/index.js. (Done 2026-04-18)
- Add deterministic tie-break handling for equal DNA scores. (Done 2026-04-18 via priority ordering)
- Add comeback return-window data source for accurate comeback_king detection. (Done with streakHistory-based eligibility)
- Emit badge_unlocked and dna_evolved events with stable payload schema. (Done 2026-04-18)

## Firestore Model
- Publish config/badgeDefinitions document and freeze schema version. (Done 2026-04-18 in runiq-dev)
- Confirm users/{uid}/badges write shape fields (earnedAt, triggerRunId, category, year, milestone).
- Confirm users/{uid}/events payload schema for new event types.
- Decide if dnaHistory max length policy is needed (full history vs capped history).

## App Integration
- Add listener and seen-mark flow for badge_unlocked events. (Done 2026-04-18)
- Add listener and seen-mark flow for dna_evolved events. (Done 2026-04-18)
- Implement full-screen milestone badge overlay. (Done 2026-04-18)
- Implement full-screen DNA evolution overlay. (Done 2026-04-18)
- Upgrade profile DNA section from label text to prominent card layout. (Done 2026-04-18)
- Implement profile Trophy Room shelf and BadgeDetail modal using users/{uid}/badges. (Done 2026-04-19)

## Verification
- Execute matrix T401-T415 in emulator and app. (Done 2026-04-19, PASS 15/15)
- Validate run replay/idempotency for badge and DNA events. (Done 2026-04-19, T403/T411)
- Validate 10-run proof path for DNA assignment. (Done 2026-04-19, T415)
- Validate event dedupe and seen-state behavior after app relaunch. (Done 2026-04-19, static flow validation in T413)

## Product/Logic Clarifications (If Needed)
- Confirm final milestone badge list that should trigger full-screen animation.
- Confirm DNA label display text format on profile card.
- Confirm whether dnaHistory should be shown in profile now or deferred.
- Confirm fallback label when no winner threshold is met (Still Discovering expected).

## Status
- Blockers: None.
- Implementation status: Core backend + app integration completed on 2026-04-18.
- Verification status: Completed on 2026-04-19 (T401-T415 all PASS).
- Documentation status: Updated with implementation logs and verification evidence.
- Remaining non-code items: final engineering/product/documentation signoffs.
