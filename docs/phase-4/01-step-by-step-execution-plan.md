# Phase 4 Step-by-Step Execution Plan

## Goal
Deliver Badges + Runner DNA end-to-end using the current repository architecture and server-authoritative progression model.

## Execution Steps
1. Freeze Phase 4 data contract for badges, DNA, and events.
2. Publish badge definitions in Firestore config path with version notes.
3. Add helper functions in cloud functions:
   - evaluateBadges
   - calculateDNA
4. Integrate helpers inside run processing orchestration after run is valid.
5. Enforce idempotent badge writes to users/{uid}/badges/{badgeId}.
6. Emit badge_unlocked events with payload that includes milestone flag.
7. Implement DNA scoring on 30-run window and execute only when runCount % 10 === 0.
8. Apply comeback_king priority override before normal threshold winner selection.
9. Preserve previous DNA when no type passes threshold.
10. Update dnaHistory on type changes only.
11. Emit dna_evolved event with required message copy.
12. Ensure push/event copy uses: Your Runner DNA has evolved!
13. Add app listener for badge_unlocked events.
14. Add milestone-only full-screen badge animation overlay.
15. Add app listener for dna_evolved events and full-screen evolution overlay.
16. Upgrade profile DNA section to a prominent identity card.
17. Add/complete badge detail and trophy surfaces if required for visibility and debugging.
18. Execute full emulator and app test matrix and fix failures.

## Current Wave Status (2026-04-14)
- Milestone A - Data Contract and Catalog: Planned
- Milestone B - Backend Badge Engine: Planned
- Milestone C - Backend DNA Engine: Planned
- Milestone D - App Event UX: Planned
- Milestone E - Verification and Signoff: Planned

## Suggested File Touch Order
- functions/index.js
- firestore.rules (validate only if additional constraints needed)
- firestore.indexes.json (only if new query requires it)
- src/navigation/AppNavigator.tsx
- src/screens/profile/ProfileScreen.tsx
- src/screens/run/PostRunSummaryScreen.tsx (only if event payload support needed)
- src/stores/useUserStore.ts (DNA type/state consistency)
- docs/phase-4/*.md

## Milestones
### Milestone A - Data Contract and Catalog
- Badge definition schema finalized and published.
- Milestone badge list finalized for animation policy.

### Milestone B - Backend Badge Engine
- Badge evaluation runs after valid run processing.
- Badge awarding is idempotent and server-only.

### Milestone C - Backend DNA Engine
- DNA evaluates after every 10th run.
- 30-run scoring and comeback priority rules implemented.
- DNA evolution event emitted only on type change.

### Milestone D - App Event UX
- badge_unlocked milestone overlay implemented and deduped.
- dna_evolved overlay implemented and deduped.
- Profile DNA card made prominent.

### Milestone E - Verification
- T401-T415 pass with proof notes.
- Done-when criteria confirmed with 10-run seed test.

## Acceptance Criteria
1. Badge definitions are queryable from config and used by backend evaluator.
2. Client cannot award badges or mutate DNA directly.
3. Duplicate run processing does not duplicate badge awards.
4. DNA assignment appears after 10th run test scenario.
5. Profile displays current DNA prominently.
6. Evolution overlay copy exactly matches required phrase.
