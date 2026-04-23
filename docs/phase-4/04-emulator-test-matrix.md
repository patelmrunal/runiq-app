# Phase 4 Emulator Test Matrix

## Purpose
Validate all critical badges and Runner DNA scenarios locally before rollout signoff.

## Test Cases

### T401 - Badge definition catalog readable
- Setup: config/badgeDefinitions published.
- Action: backend evaluator loads definitions.
- Expected: definitions load without fallback errors.
- Status: PASS (2026-04-19).
- Evidence: badgeDefinitions exists=true, badgeCount=11.

### T402 - Basic badge award path
- Setup: user with no badges.
- Action: submit valid run that meets a badge condition.
- Expected: one badge doc created under users/{uid}/badges.
- Status: PASS (2026-04-19).
- Evidence: first_run badge count=1 after initial valid run.

### T403 - Badge idempotency on replay
- Setup: one badge already awarded.
- Action: replay same trigger input.
- Expected: no duplicate badge docs, no duplicate badge event.
- Status: PASS (2026-04-19).
- Evidence: first_run badge remained count=1 after additional valid runs.

### T404 - Milestone-only animation gating
- Setup: one non-milestone badge and one milestone badge event.
- Action: app consumes both events.
- Expected: full-screen animation for milestone only.
- Status: PASS (2026-04-19).
- Evidence: milestone badge event (first_run) and non-milestone badge event (total_km_10) emitted with milestone flag split.

### T405 - Client write protection for badges
- Setup: authenticated app client.
- Action: attempt direct client write to users/{uid}/badges.
- Expected: write denied by rules.
- Status: PASS (2026-04-19).
- Evidence: firestore.rules static assertion confirms badges path allow write: if false.

### T406 - DNA not calculated before 10 runs
- Setup: user has 9 runs.
- Action: process run count check.
- Expected: no DNA recompute event.
- Status: PASS (2026-04-19).
- Evidence: dnaType=null and dna_evolved event count=0 at runCount=9.

### T407 - DNA calculated on 10th run
- Setup: user transitions from 9 to 10 runs with analyzable data.
- Action: process valid run.
- Expected: dnaType assigned or retained per threshold logic.
- Status: PASS (2026-04-19).
- Evidence: dnaType after run 10=speed_demon.

### T408 - 30-run analysis window enforced
- Setup: user has >30 runs with mixed behavior.
- Action: trigger DNA calculation.
- Expected: only latest 30 runs influence score.
- Status: PASS (2026-04-19).
- Evidence: dnaType=night_owl from latest-window behavior despite older out-of-window runs.

### T409 - Comeback king priority override
- Setup: data matches comeback_king and another DNA above threshold.
- Action: trigger DNA calculation.
- Expected: comeback_king wins.
- Status: PASS (2026-04-19).
- Evidence: dnaType=comeback_king with competing high speed profile.

### T410 - No winner retains current DNA
- Setup: no DNA score above threshold and existing dnaType present.
- Action: trigger DNA calculation.
- Expected: existing dnaType remains unchanged.
- Status: PASS (2026-04-19).
- Evidence: dnaType stayed night_owl and no new dna_evolved event emitted.

### T411 - DNA history updates on change only
- Setup: current dnaType exists.
- Action: trigger calc with unchanged and then changed winner.
- Expected: history appends only on actual type change.
- Status: PASS (2026-04-19).
- Evidence: dna_evolved remained count=1 and dnaHistory stayed ["speed_demon"] across unchanged recalculation.

### T412 - DNA evolution event and copy
- Setup: dnaType changes.
- Action: process change.
- Expected: dna_evolved event emitted with required copy phrase.
- Status: PASS (2026-04-19).
- Evidence: dna_evolved event emitted with message "Your Runner DNA has evolved!".

### T413 - App overlay dedupe and seen-state
- Setup: unseen dna_evolved and badge_unlocked events.
- Action: open app, display overlays, relaunch app.
- Expected: each event displayed once and marked seen.
- Status: PASS (2026-04-19).
- Evidence: static code verification confirms unified event handling, in-flight dedupe guard, and markEventsSeen flow in AppNavigator.
- Manual device note (2026-04-23): user verified updated Profile/Trophy UI state on physical device after rollout; no regression indicators observed in event-driven profile rendering path.

### T414 - Profile DNA card display
- Setup: user document contains dnaType.
- Action: open profile.
- Expected: prominent DNA card displays current value and fallback correctly.
- Status: PASS (2026-04-19).
- Evidence: static code verification confirms dedicated Runner DNA card and dnaType label formatting path in Profile screen.
- Manual device evidence (2026-04-23): profile screenshot shows Runner DNA card rendered with Night Owl label and blurb text.

### T415 - Done-when proof (10-run path)
- Setup: seeded user with controlled 10-run data.
- Action: execute full path.
- Expected: DNA assigned and visible in profile; evidence captured.
- Status: PASS (2026-04-19).
- Evidence: backend 10-run path assigned dnaType=speed_demon; profile DNA card render path verified.
- Manual device evidence (2026-04-23): profile and Trophy Room screenshots confirm production-like render of DNA card and earned badges shelf on mobile device.

## Signoff Rule
Phase 4 cannot be marked complete until T401-T415 pass with evidence.

## Execution Log (2026-04-19)
- Deployment used for verification:
	- firebase deploy --only functions:onRunLogCreated --project runiq-dev
- Matrix runner:
	- node functions/scripts/phase4_matrix.js
- Result summary:
	- passCount=15
	- failCount=0
	- skipCount=0
- Notes:
	- Test users were seeded and cleaned up automatically by script.
	- T405, T413, and T414 are static assertions (rules/code path validation), while the rest include backend runtime verification.

## Implementation Pre-Check Notes (2026-04-18)
- Backend and modified app files have no editor-reported errors.
- Cloud Functions syntax checks passed:
	- node --check functions/index.js
	- node --check functions/scripts/sync_phase4_badges.js
- Badge catalog tooling dry-run passed:
	- project=runiq-dev
	- badgeCount=11
	- milestoneCount=4
- Badge catalog apply passed in runiq-dev with explicit ADC credentials.
- Full T401-T415 scenario execution completed with all PASS on 2026-04-19.

## Manual Device Validation (2026-04-23)
- Source: user-performed manual test on phone with screenshot evidence shared in session.
- Confirmed visuals:
	- Profile screen renders Runner DNA card (Night Owl) with expected emphasis.
	- Trophy Room section renders latest badges with milestone highlighting for First Run.
	- Recent runs section still renders correctly below Trophy Room.
- Outcome: no UI regressions observed in deployed Phase 4 badge/DNA surfaces.
