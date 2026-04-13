# Phase 3 Emulator Test Matrix

## Purpose
Run all critical Phase 3 scenarios locally without waiting for real-time schedules.

## Test Cases

### T01 - Run increments streak
- Setup: user has currentStreak = N, ranTodayFlag = false.
- Action: write valid runLog entry.
- Expected: streak becomes N+1 (or correct consecutive logic), run marked processed.
- Status: PASS (Validated 2026-04-09)

### T02 - Multiple runs same day do not double-increment
- Setup: user already credited for today.
- Action: write second valid runLog entry same local day.
- Expected: no extra streak increment.
- Status: PASS (Validated 2026-04-09)

### T03 - Midnight with shield available
- Setup: user did not run today, shieldsAvailable > 0.
- Action: invoke midnight evaluator.
- Expected: shield consumed, streak preserved, event/log written.
- Status: PASS (Validated 2026-04-09)

### T04 - Midnight without shield
- Setup: user did not run today, shieldsAvailable = 0.
- Action: invoke midnight evaluator.
- Expected: streak reset and level reset policy applied.
- Status: PASS (Validated 2026-04-09)

### T05 - 10 PM reminder
- Setup: user inactive today and notification eligible.
- Action: invoke reminder evaluator for 10 PM window.
- Expected: reminder push queued/sent exactly once.
- Status: PASS (Validated 2026-04-09)

### T06 - 11:30 PM final warning
- Setup: still inactive after 10 PM reminder and shield present.
- Action: invoke final-warning evaluator.
- Expected: final warning sent exactly once.
- Status: PASS (Validated 2026-04-09)

### T07 - Level gate crossing
- Setup: user streak near milestone threshold.
- Action: process streak increment crossing threshold.
- Expected: level updated, level-up event document created.
- Status: PASS (Validated 2026-04-09)

### T08 - Daily task generation count
- Setup: active user with level and task history.
- Action: invoke daily task generation.
- Expected: exactly 3 tasks assigned for day (plus premium bonus when applicable by policy).
- Status: PASS (Validated 2026-04-09)

### T09 - Retry safety (idempotency)
- Setup: same trigger input replayed.
- Action: rerun trigger/scheduler.
- Expected: no double increment, no double shield consume, no duplicate notifications.
- Status: PASS (Validated 2026-04-09)

### T10 - Timezone correctness
- Setup: users in different homeTimezone values.
- Action: run midnight/reminder evaluators.
- Expected: local-day logic respected for each user.
- Status: PASS (Validated 2026-04-09)

## Wave 1 Verification Notes (2026-04-09)
- Syntax check passed for functions/index.js.
- Changed app files lint check passed.
- Full emulator scenario execution still pending.

## Wave 2 Verification Notes (2026-04-09)
- Token sync service implemented and lint/type checks passed.
- Level-up Reanimated overlay implementation completed.
- Reanimated package installed and Babel plugin configured.
- End-to-end device and emulator behavior validation still pending.

## Wave 3 Verification Notes (2026-04-09)
- Emulator stack started with Java 21 and full services: functions, firestore, pubsub, eventarc.
- Added deterministic scheduler validation path by invoking scheduled functions via emulator HTTP endpoints.
- Enabled emulator-only schedule window bypass with PHASE3_FORCE_SCHEDULE=1 for minute-window independent tests.
- Executed command: node scripts/phase3_emulator_matrix.js.
- Result summary: passCount=10, failCount=0, skipCount=0.
- Key evidence:
	- T01 PASS: currentStreak=5 expected=5
	- T02 PASS: no same-day double increment
	- T03 PASS: shield consume path
	- T04 PASS: no-shield reset path
	- T05 PASS: 10 PM dedupe marker updated
	- T06 PASS: 11:30 PM dedupe marker updated
	- T07 PASS: level gate + level_up event
	- T08 PASS: dailyTasksCount=3
	- T09 PASS: idempotent replay
	- T10 PASS: timezone date-key behavior

## Android Real-Device Verification (2026-04-13)
- Scenario: Active run with app backgrounded and screen off on Android production build.
- Result: PASS.
- Evidence summary: user-confirmed stable distance/point progression in background with latest hardening stack (watch recovery, watchdog, probe fallback, watch lock, required service startup).
- Launch impact: Android-first Play Store path approved from Phase 3 perspective.

## Signoff Rule
Phase 3 cannot be marked complete until T01-T10 are all passed with evidence.

## Signoff Status
- T01-T10 all passed with emulator evidence on 2026-04-09.
- Android real-device background continuity validation passed on 2026-04-13.
