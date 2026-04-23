# Phase 4 DNA Test Data and Proof Pack (2026-04-14)

## Goal
Provide a repeatable way to prove Phase 4 done-when criteria:
After 10 test runs, DNA assigns and displays on profile.

## Test User Strategy
Create controlled test users, each targeting one DNA outcome.

### Suggested DNA Test Users
1. dna_earlybird_test
2. dna_nightowl_test
3. dna_speed_test
4. dna_steady_test
5. dna_weekend_test
6. dna_streakmachine_test
7. dna_comeback_test

## Run Seed Design (Per User)
For each user, seed at least 10 valid runs with controlled fields:
- startTime (for morning/night/weekend splits)
- taskDifficulty (for speed_demon and steady_pacer scoring)
- run validity status
- distance/duration consistent with accepted processing rules

## Minimum Proof Scenario (Required)
Use one user with deterministic pattern:
- Run 1-10 submitted validly.
- 10th run triggers DNA calculation.
- users/{uid}.dnaType becomes non-empty.
- Profile shows the assigned DNA on prominent card.

## Additional Rule Proofs
- 30-run window: seed >30 runs and verify only latest 30 influence winner.
- Comeback priority: craft streak break/return history and verify comeback_king override.
- No-winner fallback: craft data below threshold and verify previous DNA retention.

## Evidence Capture Template
For each test case capture:
1. User id
2. Run count before and after
3. Run ids used in scenario
4. Final dnaType and dnaHistory
5. Event docs emitted (badge_unlocked/dna_evolved)
6. App screenshot of profile DNA card
7. Matrix case id result

## Done-When Proof Checklist
- [x] User reached runCount 10
- [x] DNA assigned from backend logic
- [x] Profile displays assigned DNA (render path verified in profile screen and matrix T414/T415)
- [x] Event flow and overlay behavior verified (overlay logic + seen-state verified in matrix T413)
- [x] Test evidence attached to matrix and summary docs

## Status Update (2026-04-18)
- Backend DNA logic and app DNA display/event flow are implemented.
- Proof run execution is still pending.
- Next operator action: run seeded 10-run scenario and capture evidence in this file and in 04-emulator-test-matrix.md.

## Execution Evidence (2026-04-19)

### Commands Executed
1. firebase deploy --only functions:onRunLogCreated --project runiq-dev
2. node functions/scripts/phase4_matrix.js

### Automated Proof Data
1. Matrix summary
	- passCount: 15
	- failCount: 0
	- total: 15
2. Required done-when path
	- Case: T415
	- Backend result: dnaType assigned on 10th-run path (speed_demon)
	- Profile path: dedicated Runner DNA card render path verified
3. DNA evolution copy
	- Case: T412
	- Event message: "Your Runner DNA has evolved!"
4. Additional critical checks
	- T408: 30-run window enforced (night_owl winner from latest window)
	- T409: comeback_king priority override verified
	- T410/T411: no-winner retention and history append-on-change-only verified

### Test User and Data Notes
- Matrix runner created isolated temporary users for each scenario and cleaned them up after completion.
- Seed patterns included:
	- 9->10 hard-run transition for speed_demon assignment
	- >30-run mixed profile for windowing
	- streakHistory with reset + quick returns for comeback_king override
	- no-winner retention dataset for unchanged DNA verification

### Evidence Location
- Detailed per-case evidence: docs/phase-4/04-emulator-test-matrix.md
- Session status and closure notes: docs/phase-4/00-session-summary-2026-04-14.md

## Manual Phone Evidence (2026-04-23)

### Source
- User-provided real-device screenshots captured after Phase 4 rollout updates.

### Observations from screenshots
- Profile screen:
	- Runner DNA card visible with Night Owl label and explanatory blurb.
	- Core stats and profile layout remain intact.
- Trophy Room:
	- Latest badges visible (including milestone styling on First Run).
	- Badge cards rendered with category emoji/label and earned date.

### Proof impact
- Reinforces T414 and T415 evidence with real-device UI confirmation (beyond static and automated verification).
- Confirms Phase 4 badge/DNA surfaces are visible and stable in manual usage flow.
