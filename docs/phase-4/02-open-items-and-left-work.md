# Phase 4 Open Items and Left Work

## Remaining Work Breakdown

## Backend
- Implement evaluateBadges helper in functions/index.js.
- Implement calculateDNA helper in functions/index.js.
- Add deterministic tie-break handling for equal DNA scores.
- Add comeback return-window data source for accurate comeback_king detection.
- Emit badge_unlocked and dna_evolved events with stable payload schema.

## Firestore Model
- Publish config/badgeDefinitions document and freeze schema version.
- Confirm users/{uid}/badges write shape fields (earnedAt, triggerRunId, category, year, milestone).
- Confirm users/{uid}/events payload schema for new event types.
- Decide if dnaHistory max length policy is needed (full history vs capped history).

## App Integration
- Add listener and seen-mark flow for badge_unlocked events.
- Add listener and seen-mark flow for dna_evolved events.
- Implement full-screen milestone badge overlay.
- Implement full-screen DNA evolution overlay.
- Upgrade profile DNA section from label text to prominent card layout.
- Decide if Trophy Room screen is in immediate Phase 4 scope or next phase.

## Verification
- Execute matrix T401-T415 in emulator and app.
- Validate run replay/idempotency for badge and DNA events.
- Validate 10-run proof path for DNA assignment.
- Validate event dedupe and seen-state behavior after app relaunch.

## Product/Logic Clarifications (If Needed)
- Confirm final milestone badge list that should trigger full-screen animation.
- Confirm DNA label display text format on profile card.
- Confirm whether dnaHistory should be shown in profile now or deferred.
- Confirm fallback label when no winner threshold is met (Still Discovering expected).

## Status
- Blockers: None.
- Implementation status: Not started.
- Documentation status: Complete baseline planning pack created on 2026-04-14.
