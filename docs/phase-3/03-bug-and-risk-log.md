# Phase 3 Bug and Risk Log

## Current Known Issues (Post Wave 1)

### RISK-001: Client progression write conflicts with rules
- Severity: High
- Area: src/screens/run/PostRunSummaryScreen.tsx
- Detail: Client currently attempts updateDoc on users/{uid}, but firestore.rules blocks user doc writes from client.
- Impact: Potential failed writes/noisy errors and drift between UI expectations and server truth.
- Planned Fix: Move progression updates fully to cloud function trigger and remove client progression write path.
- Status: Resolved on 2026-04-09.

### RISK-002: Task feed source does not match daily assignment model
- Severity: High
- Area: src/services/taskService.ts and dashboard consumers
- Detail: Task feed currently reads global pool pattern, not per-user daily assignment.
- Impact: Cannot guarantee exactly 3 daily tasks or day-specific consistency.
- Planned Fix: Introduce user/day task assignment source and migrate consumers.
- Status: Mitigated on 2026-04-09 (daily task source with template fallback added).

### RISK-003: Cloud Functions not implemented for Phase 3 behaviors
- Severity: Critical
- Area: functions/index.js
- Detail: Streak, shield, level, and reminder automation missing.
- Impact: Phase 3 acceptance criteria cannot be met.
- Planned Fix: Implement run trigger + schedulers + helper logic with emulator tests.
- Status: Resolved on 2026-04-09 (logic implemented and emulator proof complete).

### RISK-004: Notification schedule and dedupe logic absent
- Severity: High
- Area: functions + app token wiring
- Detail: No active 10 PM / 11:30 PM reminder implementation with dedupe.
- Impact: Duplicate pushes or missed reminders.
- Planned Fix: Add scheduler jobs, user token lifecycle handling, and per-day dedupe keys.
- Status: Resolved on 2026-04-09 (scheduler + dedupe + token lifecycle implemented and emulator-validated).

### RISK-005: Timezone edge-case risk
- Severity: Medium
- Area: streak evaluator
- Detail: Streak must be evaluated using user homeTimezone to prevent manipulation.
- Impact: Incorrect streak updates for travelers.
- Planned Fix: Use homeTimezone-normalized day boundaries in all streak checks.
- Status: Mitigated and emulator-validated on 2026-04-09 (T10 pass).

### RISK-006: Scheduler scan scale risk
- Severity: Medium
- Area: functions/index.js scheduler loops
- Detail: Current scheduler implementation scans active users each run window.
- Impact: Could become costly/slow at larger scale.
- Planned Fix: Keep for current phase; later optimize with segmented queries or queueing if needed.
- Status: Open.

### RISK-007: Reanimated runtime integration risk
- Severity: Medium
- Area: App startup + navigation overlay path
- Detail: New full-screen level-up overlay depends on Reanimated dependency and Babel plugin.
- Impact: Possible build/runtime crash if cache/native setup is stale after dependency changes.
- Planned Fix: Clean Metro cache and rebuild app during validation.
- Status: Mitigated on 2026-04-13 (Android release build/install and real-device usage validated). iOS validation is deferred to Phase 4 for Android-first launch.

### RISK-008: Midnight task catalog flash (60-task visibility)
- Severity: High
- Area: src/services/taskService.ts
- Detail: Authenticated users can temporarily fall back to global auto templates when daily assignments are not yet available for local day-key filters.
- Impact: Incorrect task experience and confusion around daily task model.
- Planned Fix: Remove/limit authenticated fallback to global templates at midnight; prefer waiting state until user dailyTasks are available and day-key aligned.
- Status: Mitigated on 2026-04-11 (authenticated fallback removed; dailyTasks-only path with timezone-aware day key).

### RISK-009: Total Runs UI mismatch
- Severity: Medium
- Area: src/screens/profile/ProfileScreen.tsx and store mapping
- Detail: UI reads totalRuns while backend increments runCount.
- Impact: Profile can display 0 runs despite successful run processing.
- Planned Fix: Map profile total runs from runCount source field and keep state naming consistent.
- Status: Resolved on 2026-04-11.

### RISK-010: Shield policy and visibility gap
- Severity: Medium
- Area: functions/index.js and dashboard/profile UI
- Detail: Shield is consumed in backend but policy constraints (streak <= 5) and monthly refill are not implemented; UI does not visibly show inventory.
- Impact: Users cannot understand shield state or expected behavior.
- Planned Fix: Add monthly refill scheduler, enforce auto-consume condition, and expose shield count in UI.
- Status: Resolved on 2026-04-11 (monthly refill integrated in midnight flow, auto-consume cap applied, shield count visible in dashboard/profile).

### RISK-011: Free run streak-credit ambiguity
- Severity: Medium
- Area: functions/index.js run trigger logic
- Detail: Free runs currently participate in general valid-run streak path without minimum distance threshold policy.
- Impact: Streak can be credited for very short free runs.
- Planned Fix: Enforce minimum 1.4 km for free-run streak credit.
- Status: Resolved on 2026-04-11.

### RISK-012: Sparse GPS hard-reject causing missing totals/streak
- Severity: High
- Area: functions/index.js run trigger validation path
- Detail: Runs with low routePointCount were hard-flagged as sparse_gps, which prevented runCount/totalKm updates.
- Impact: User-visible mismatch where run log exists but profile totals/streak do not move.
- Planned Fix: Keep hard rejection only for invalid payload/impossible pace; downgrade sparse_gps to warning queue while still processing valid run updates.
- Status: Resolved on 2026-04-11.
- Verification: one-time sparse_gps backfill executed (runiq-dev) with 1 candidate applied (+1 runCount, +3.66 km) to reconcile previously impacted record.

### RISK-013: Profile outcome mismatch with backend status
- Severity: Medium
- Area: src/screens/profile/ProfileScreen.tsx
- Detail: Profile derived completion from distance only and could show "Task completed" even when backend marked run flagged.
- Impact: Confusing trust gap between what user sees and authoritative backend processing state.
- Planned Fix: Drive outcome from backend status/taskResult and show explicit flagged processing state.
- Status: Resolved on 2026-04-11.

### RISK-014: Failed task run still credits streak
- Severity: High
- Area: functions/index.js run trigger streak evaluator
- Detail: Streak eligibility logic credited all non-free runs, even when taskCompleted=false.
- Impact: Users could gain or protect streak from failed daily tasks, breaking expected task contract.
- Planned Fix: Gate streak eligibility by taskCompleted for task runs; keep free-run threshold at 1.4 km.
- Status: Resolved on 2026-04-12.

### RISK-015: RunTracking screen unmount can terminate active run
- Severity: High
- Area: src/screens/run/RunTrackingScreen.tsx cleanup effect
- Detail: Screen unmount cleanup called stopTracking() and BackgroundService.stop(), which could terminate a run outside explicit stop intent.
- Impact: Tracking continuity breaks during lifecycle transitions and creates perceived background unreliability.
- Planned Fix: Keep unmount cleanup limited to warmup watcher; only stop active tracking from explicit Stop Run flow.
- Status: Resolved on 2026-04-12.

### RISK-016: Background GPS watch can drop without self-recovery
- Severity: High
- Area: src/services/runTrackingService.ts watch runtime path
- Detail: Foreground watch error/stall path only logged failures and did not restart watcher, so long background runs could stop accumulating coordinates.
- Impact: Users observe "background not working" where elapsed run continues but distance/route progression stalls.
- Planned Fix: Add automatic watch recovery on error + watchdog-based stall detection with bounded restart attempts, periodic one-shot background GPS probe fallback, exclusive watch lock during active runs, and mandatory retried Android foreground service startup.
- Status: Resolved on 2026-04-12.

## Wave 3 Verification Evidence (2026-04-09)
- Emulator matrix summary: 10 passed, 0 failed, 0 skipped.
- Validated scenarios: streak increment, same-day idempotency, shield consume, no-shield reset, 10 PM and 11:30 PM reminders, level-up event emission, daily task generation count, replay safety, timezone correctness.
- Operational note: deterministic local scheduler testing now uses emulator HTTP invocation path and PHASE3_FORCE_SCHEDULE=1.

## Risk Posture Snapshot
- Open Critical risks: 0
- Open High risks: 0
- Open Medium risks: 1 (RISK-006 scheduler scale optimization)
- Deferred (non-blocking for Android-first launch): iOS smoke verification moved to Phase 4.

## Logging Protocol During Build
For every bug found during implementation, append:
- Date/time
- Repro steps
- Root cause
- Fix commit/file
- Verification proof (emulator output or test)
