# Phase 4 Bug and Risk Log

## Current Known Risks (Initial)

### RISK-401: Badge engine not implemented
- Severity: Critical
- Area: functions/index.js
- Detail: No evaluateBadges flow currently exists.
- Impact: Badge requirements cannot be met.
- Planned Fix: Add server-side badge evaluator and idempotent write policy.
- Status: Open.

### RISK-402: DNA engine not implemented
- Severity: Critical
- Area: functions/index.js
- Detail: No calculateDNA flow currently exists.
- Impact: DNA assignment after 10th run is impossible.
- Planned Fix: Add 10th-run trigger and 30-run scoring pipeline.
- Status: Open.

### RISK-403: Event system only handles level_up
- Severity: High
- Area: src/navigation/AppNavigator.tsx
- Detail: App event listener filters only level_up events.
- Impact: No badge or DNA overlays can surface.
- Planned Fix: Add listeners for badge_unlocked and dna_evolved with dedupe.
- Status: Open.

### RISK-404: Profile DNA visibility is too weak
- Severity: Medium
- Area: src/screens/profile/ProfileScreen.tsx
- Detail: DNA is shown as a small line of text.
- Impact: Fails prominent identity-card requirement.
- Planned Fix: Introduce dedicated visual DNA card section.
- Status: Open.

### RISK-405: dnaType default mismatch risk
- Severity: Medium
- Area: src/services/userService.ts and src/stores/useUserStore.ts
- Detail: userService default uses discovering while store type enum expects known types or null.
- Impact: Potential display inconsistency and weak typing behavior.
- Planned Fix: Normalize initialization and display fallback contract.
- Status: Open.

### RISK-406: Comeback king needs streak return evidence
- Severity: High
- Area: functions/index.js and streak history data
- Detail: comeback_king depends on break-and-return behavior; current data path may be insufficient.
- Impact: Incorrect DNA assignment priority.
- Planned Fix: Use streakHistory (or equivalent) as authoritative source before priority override.
- Status: Open.

### RISK-407: Badge duplicate award risk on replay
- Severity: High
- Area: users/{uid}/badges writes
- Detail: Trigger retries/replays can create duplicates if not idempotent.
- Impact: Data inflation and inconsistent badge UX.
- Planned Fix: Deterministic badge IDs and existence checks before write.
- Status: Open.

### RISK-408: Milestone animation over-trigger risk
- Severity: Medium
- Area: App overlay logic
- Detail: If all badges trigger full-screen UI, user experience becomes noisy.
- Impact: Violates milestone-only celebration rule.
- Planned Fix: Gate overlay by milestone flag in event payload.
- Status: Open.

### RISK-409: Query cost and latency during DNA scoring
- Severity: Medium
- Area: calculateDNA run-window fetch
- Detail: Poorly constrained queries can increase processing cost.
- Impact: Slow trigger execution and potential retries.
- Planned Fix: Query only required fields and strict limit(30) with stable order.
- Status: Open.

### RISK-410: Event seen-state race condition
- Severity: Low
- Area: users/{uid}/events update flow
- Detail: Concurrent snapshots can show same event twice if seen-mark flow is delayed.
- Impact: Duplicate overlay display.
- Planned Fix: Keep one-active-overlay guard and immediate seen update after display.
- Status: Open.

## Risk Posture Snapshot
- Open Critical risks: 2
- Open High risks: 4
- Open Medium risks: 3
- Open Low risks: 1

## Logging Protocol During Build
For each bug discovered, append:
- Date/time
- Repro steps
- Root cause
- Fix file
- Verification proof (emulator output or app evidence)
