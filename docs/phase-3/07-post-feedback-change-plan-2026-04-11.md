# Phase 3.1 Post-Feedback Change Plan (2026-04-11)

## Why This Document
This plan captures user-reported production behavior gaps and requested logic changes after Phase 3 baseline rollout.

## User-Reported Issues (Confirmed)
1. Shield usage is active in backend, but shield inventory is not visible in app UI.
2. Around midnight, users can temporarily see the full auto task catalog (60 tasks) instead of daily assignments.
3. Total Runs displays 0 because profile UI reads totalRuns while backend updates runCount.

## Requested Logic Changes
1. Show shield count in app UI.
2. Grant 1 shield at start of each month.
3. Auto-apply shield only when current streak is up to 5 days.
4. Improve run log and overall app smoothness (especially recent runs section).
5. Free run should count for streak only if distance is at least 1.4 km.
6. Clarify Run tab purpose to avoid duplication with Dashboard.
7. Clarify level-up trigger behavior.

## Level-Up Visibility Rule (Current Behavior)
Level-up celebration is shown when all conditions are true:
1. A run is processed and increases level in backend.
2. Backend writes an unseen level_up event into users/{uid}/events.
3. User is authenticated and appState is main.
4. App listener receives seen=false level_up event and renders overlay once.
5. When overlay finishes, event is marked seen=true.

Notes:
- If user levels up while app is closed, overlay appears next time app opens in main state while event is still unseen.
- Same-day additional runs do not keep increasing streak, so level-up can only happen when a newly credited day crosses threshold.

## Implementation Scope (Phase 3.1)

### A) Shield UX + Monthly Shield Logic
Backend:
- Add monthly scheduler to grant 1 shield with idempotency marker lastShieldGrantMonth.
- Update midnight shield consumption rule to auto-apply shield only when currentStreak <= 5.

App:
- Add shield card/chip on dashboard hero section showing shieldsAvailable.
- Add simple shield visibility line in profile stats/info block for parity.

Acceptance:
- User can always see current shield count in UI.
- On first scheduler pass each month, shield count becomes at least 1 (without duplicate grants).
- If missed day and currentStreak > 5, shield is not auto-consumed.

### B) Midnight 60-Task Visibility Fix
Problem:
- Task service falls back to auto templates when no dailyTasks match local day key.

Fix:
- Stop rendering full auto catalog as midnight fallback for authenticated users.
- For authenticated users, prefer dailyTasks only; if dailyTasks not generated yet, show loading/empty state and retry.
- Keep auto fallback only for unauthenticated or explicit dev mode if needed.
- Align day-key filtering with user homeTimezone-derived key, not only local device date.

Acceptance:
- At midnight transition, user never sees full 60-task catalog on dashboard/run task modal.
- User sees either assigned daily tasks or neutral loading/empty state until assignment exists.

### C) Total Runs Field Consistency
Fix:
- Update profile and any store mapping to read runCount as source of truth.
- Optionally mirror runCount into totalRuns in UI state for compatibility display.

Acceptance:
- Total Runs in profile matches backend runCount.

### D) Performance and Smoothness
Fix candidates:
- Replace mapped ScrollView run history with FlatList in profile recent runs section.
- Keep list payload lightweight and avoid expensive inline rendering work.
- Ensure route polyline parsing remains in run detail screen only.
- Add memoization for run item renderer and stable keys.

Acceptance:
- Noticeably smoother profile screen interaction while scrolling recent runs.
- No frame drop spikes caused by list rendering path for normal data volume.

### E) Free Run Streak Eligibility >= 1.4 km
Backend rule:
- Free run contributes to streak only if distanceKm >= 1.4.
- If free run < 1.4 km: keep run log and total stats updates, but do not set ranTodayFlag/lastRunDate/currentStreak credit.

Acceptance:
- Free run at 1.39 km does not protect or increment streak.
- Free run at 1.4 km or above behaves as valid streak-credit run.

### F) Run Tab Product Direction
Current:
- Run tab opens task selection modal and can feel similar to dashboard tasks.

Recommended direction:
- Dashboard: progress and status view (streak, shields, level, today context).
- Run tab: action hub (Start Task Run, Start Free Run, quick resume, warm-up shortcuts).

Acceptance:
- Clear separation of browse/status (Dashboard) vs action/start (Run).

## File Touch Plan
Backend:
- functions/index.js

App:
- src/services/taskService.ts
- src/screens/dashboard/DashboardScreen.tsx
- src/screens/profile/ProfileScreen.tsx
- src/navigation/AppNavigator.tsx (only if run tab UX adjustments start now)
- src/stores/useUserStore.ts (field mapping consistency if needed)

Docs:
- docs/phase-3/README.md
- docs/phase-3/02-open-items-and-left-work.md
- docs/phase-3/03-bug-and-risk-log.md

## Test Plan Additions
1. Shield visibility UI test: dashboard and profile show same shield value.
2. Monthly shield grant idempotency test: rerun scheduler same month does not duplicate.
3. Shield policy test: missed day at streak 4 uses shield; missed day at streak 8 does not auto-use shield.
4. Midnight task feed test: no 60-template flash, only daily tasks or waiting state.
5. Total runs test: profile count equals user.runCount after run trigger.
6. Free run threshold test: 1.39 km no streak credit, 1.4 km streak credit.

## Delivery Order
1. Data correctness fixes first (Total Runs mapping, free run threshold).
2. Midnight task feed behavior fix.
3. Shield policy + monthly grant.
4. UI additions for shield count.
5. Performance pass for recent runs list.
6. Optional Run tab product polish.

## Status
- Planned and documented on 2026-04-11.
- Implementation update on 2026-04-11:
	- Done: free-run streak threshold (1.4 km), total runs mapping to runCount, midnight task-feed fallback removal for authenticated users, shield visibility in dashboard/profile, shield auto-consume cap (<=5 streak), and monthly shield refill at local month start.
	- Done: recent-runs rendering migrated to FlatList with memoized view-model and virtualized list rendering.
	- Done: dedicated Run-tab action-hub implemented (free run quick start + daily task launch flow).
	- Done: task completion rule upgraded to distance-plus-pace policy.
	  - Pass when distance >= targetKm and achieved pace <= target pace.
	  - Example: target 2 km in 20 min (10:00/km), run 3 km in 30 min (10:00/km) => pass; run 3 km in 40 min (13:20/km) => fail.
	- Done: backend run trigger now writes taskDistanceQualified/taskPaceQualified and taskFailureReason, and updates daily task status with completion/failure result.
	- Done: sparse GPS path downgraded to warning review (admin queue warning) instead of hard rejection; valid runs continue to update run count and total km when payload/pace sanity checks pass.
	- Done: profile run outcome now respects backend status and shows "GPS review needed" for flagged runs.
	- Done: background tracking service re-enabled for better app-background continuity during runs.
	- Done: one-time sparse_gps historical backfill executed in runiq-dev.
	  - Candidates found: 1
	  - Applied: 1 run (runId 1775916835142)
	  - Restored totals: +1 runCount, +3.66 km for affected user
	  - Safety note: streak was intentionally not recalculated retroactively.
	- Done: backend hotfix deployed to production function onRunLogCreated (asia-south1) in runiq-dev.
	- Done: follow-up backend deployment completed on 2026-04-12 for streak-credit gating hotfix.
	  - Command: firebase deploy --only functions:onRunLogCreated
	  - Project: runiq-dev
	  - Function/region: onRunLogCreated (asia-south1)
	  - Result: Successful update operation.
	- Done: streak-credit policy tightened for task runs.
	  - Task runs now credit streak only when taskCompleted=true.
	  - Failed task attempts still save run and totals, but do not set ranTodayFlag/lastRunDate/currentStreak credit.
	  - Added explicit streakCreditSkippedReason value: task_not_completed.
	- Done: RunTracking screen unmount cleanup hardened.
	  - Removed automatic stopTracking()/BackgroundService.stop() from unmount cleanup.
	  - Active run now stops only through explicit Stop Run action, improving background continuity expectations.
	- Done: runTrackingService background resiliency hardening.
	  - Added auto-restart on GPS watch error callbacks.
	  - Added watchdog stall detection to recover dropped watchers during active runs.
	  - Added restart rate-limit window to prevent recovery thrash loops.
	  - Added periodic one-shot background GPS probe fallback to continue point capture when watch callbacks are temporarily suppressed by OEM/device behavior.
	  - Added exclusive global watch lock for runTrackingService during active runs to prevent warmup/other watchers from replacing the run watch.
	  - Switched run watch provider preference to fused mode.
	  - Android background foreground-service startup now retries and is treated as required at run start (fail-fast if unavailable).
	- Done: profile flagged-run UX clarity polish (2026-04-13).
	  - Added in-card "What happened?" popup that surfaces backend flagReason code and explanation for reviewed runs.
	  - Daily task feed now caps visible task count by tier and prioritizes strict today dayKey records to prevent overflow lists.
	- Done: Run Detail reviewed-run UX parity (2026-04-13).
	  - Added reviewed-run details card and "What happened?" popup with backend flagReason code + explanation.
	- Done: follow-up hotfix implementation date recorded as 2026-04-12.
	- Done: Android-first signoff recorded after real-device validation.
	- Deferred to Phase 4: iOS parity smoke verification.
