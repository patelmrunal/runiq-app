# Phase 4 Emulator Test Matrix

## Purpose
Validate all critical badges and Runner DNA scenarios locally before rollout signoff.

## Test Cases

### T401 - Badge definition catalog readable
- Setup: config/badgeDefinitions published.
- Action: backend evaluator loads definitions.
- Expected: definitions load without fallback errors.
- Status: Pending.

### T402 - Basic badge award path
- Setup: user with no badges.
- Action: submit valid run that meets a badge condition.
- Expected: one badge doc created under users/{uid}/badges.
- Status: Pending.

### T403 - Badge idempotency on replay
- Setup: one badge already awarded.
- Action: replay same trigger input.
- Expected: no duplicate badge docs, no duplicate badge event.
- Status: Pending.

### T404 - Milestone-only animation gating
- Setup: one non-milestone badge and one milestone badge event.
- Action: app consumes both events.
- Expected: full-screen animation for milestone only.
- Status: Pending.

### T405 - Client write protection for badges
- Setup: authenticated app client.
- Action: attempt direct client write to users/{uid}/badges.
- Expected: write denied by rules.
- Status: Pending.

### T406 - DNA not calculated before 10 runs
- Setup: user has 9 runs.
- Action: process run count check.
- Expected: no DNA recompute event.
- Status: Pending.

### T407 - DNA calculated on 10th run
- Setup: user transitions from 9 to 10 runs with analyzable data.
- Action: process valid run.
- Expected: dnaType assigned or retained per threshold logic.
- Status: Pending.

### T408 - 30-run analysis window enforced
- Setup: user has >30 runs with mixed behavior.
- Action: trigger DNA calculation.
- Expected: only latest 30 runs influence score.
- Status: Pending.

### T409 - Comeback king priority override
- Setup: data matches comeback_king and another DNA above threshold.
- Action: trigger DNA calculation.
- Expected: comeback_king wins.
- Status: Pending.

### T410 - No winner retains current DNA
- Setup: no DNA score above threshold and existing dnaType present.
- Action: trigger DNA calculation.
- Expected: existing dnaType remains unchanged.
- Status: Pending.

### T411 - DNA history updates on change only
- Setup: current dnaType exists.
- Action: trigger calc with unchanged and then changed winner.
- Expected: history appends only on actual type change.
- Status: Pending.

### T412 - DNA evolution event and copy
- Setup: dnaType changes.
- Action: process change.
- Expected: dna_evolved event emitted with required copy phrase.
- Status: Pending.

### T413 - App overlay dedupe and seen-state
- Setup: unseen dna_evolved and badge_unlocked events.
- Action: open app, display overlays, relaunch app.
- Expected: each event displayed once and marked seen.
- Status: Pending.

### T414 - Profile DNA card display
- Setup: user document contains dnaType.
- Action: open profile.
- Expected: prominent DNA card displays current value and fallback correctly.
- Status: Pending.

### T415 - Done-when proof (10-run path)
- Setup: seeded user with controlled 10-run data.
- Action: execute full path.
- Expected: DNA assigned and visible in profile; evidence captured.
- Status: Pending.

## Signoff Rule
Phase 4 cannot be marked complete until T401-T415 pass with evidence.
