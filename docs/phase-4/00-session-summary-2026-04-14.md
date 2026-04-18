# Phase 4 Session Summary (2026-04-14)

## Purpose
This file captures exactly what is done, what remains, and what to do next for the Phase 4 Badges + Runner DNA implementation.

## Today Work Completed
- Mapped Phase 4 goals to current repository behavior.
- Audited backend run processing path and confirmed no badge-award or DNA-calculation pipeline exists yet.
- Audited app event listeners and confirmed only level_up overlays exist.
- Verified profile currently reads dnaType but does not render a prominent DNA identity card.
- Created a full Phase 4 planning and execution documentation pack in this folder.

## Artifacts Reviewed Today
- PRD source: ../../PRD.txt
- TRD source: ../../TRD.txt
- Cloud Functions entry: ../../functions/index.js
- Firestore rules: ../../firestore.rules
- App navigator events wiring: ../../src/navigation/AppNavigator.tsx
- Profile screen: ../../src/screens/profile/ProfileScreen.tsx
- Run write flow: ../../src/screens/run/PostRunSummaryScreen.tsx

## Current Completion Snapshot
- Phase 4 planning and architecture mapping: 100%
- Badge definitions catalog rollout: 0%
- Backend badge evaluation implementation: 0%
- Backend DNA calculation implementation: 0%
- App badge/DNA event overlay implementation: 0%
- Verification matrix execution: 0%

## What Is Finished vs Not Finished
### Finished
- Requirement interpretation for:
  - badge definitions in Firestore,
  - server-side badge award only,
  - milestone-only full-screen badge animation,
  - DNA calculation after each 10th run,
  - profile DNA prominence,
  - DNA evolution notification copy.
- Gap analysis against live code path and rules.
- Phase 4 execution docs and test strategy.

### Not Finished
- Badge catalog publish and versioning.
- Cloud Function badge evaluator and idempotent user badge writes.
- Cloud Function DNA evaluator with 7-type scoring and comeback priority override.
- Event emission and app listeners for badge_unlocked and dna_evolved.
- Profile DNA card uplift and optional DNA history section.
- End-to-end validation with 10 test runs.

## Key Decisions Locked Today
- Keep progression authoritative on backend; never award badges or set DNA in client.
- Reuse users/{uid}/events pattern for new event types:
  - badge_unlocked
  - dna_evolved
- Use phased rollout: backend correctness first, then app UX overlays, then matrix verification.

## Immediate Next Step (Next Session)
Start execution in this exact order:
1. Implement badge definition catalog document and rollout process.
2. Add evaluateBadges and calculateDNA helpers in cloud functions.
3. Wire onRunLogCreated orchestration to call both helpers.
4. Add app-side event listeners and milestone-only full-screen badge overlay.
5. Add DNA evolution overlay with required copy.
6. Run matrix T401-T415 with proof and update docs.

## Definition of Done for Phase 4
- After 10 valid test runs, a DNA type is assigned on backend.
- Assigned DNA type is shown prominently on profile.
- Badge writes are idempotent and server-side only.
- Milestone badge unlock event triggers full-screen animation exactly once.
- DNA evolution event shows required copy and is marked seen.
