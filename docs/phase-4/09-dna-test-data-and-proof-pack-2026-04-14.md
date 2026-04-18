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
- [ ] User reached runCount 10
- [ ] DNA assigned from backend logic
- [ ] Profile displays assigned DNA
- [ ] Event flow and overlay behavior verified
- [ ] Test evidence attached to matrix and summary docs
