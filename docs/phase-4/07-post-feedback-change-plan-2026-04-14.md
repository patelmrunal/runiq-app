# Phase 4 Post-Feedback Change Plan (2026-04-14)

## Why This Document
This plan captures expected feedback loops after baseline Phase 4 rollout and defines a controlled refinement path.

## Expected Feedback Themes
1. Badge unlock frequency feels too noisy.
2. DNA label is assigned but explanation is unclear.
3. Comeback king assignment appears unexpected to users.
4. Badge detail visibility is insufficient in-app.
5. Evolution overlay timing conflicts with run summary flow.

## Planned Refinement Scope

### A) Badge Celebration Tuning
- Add stricter milestone gate.
- Add cooldown to avoid stacked overlays in same session.
- Keep non-milestone badges to lightweight in-card confirmation.

### B) DNA Explainability
- Add short reason text on profile DNA card (for example: Mostly morning runs).
- Add optional DNA history list if product approves.

### C) Comeback Logic Transparency
- Add debug/admin note fields to validate comeback path during QA.
- If needed, expose a user-safe summary in profile.

### D) UI Flow Polishing
- Ensure overlays do not interrupt critical navigation transitions.
- Prevent duplicate overlay display on reconnect/snapshot rebroadcast.

## File Touch Plan
- src/navigation/AppNavigator.tsx
- src/screens/profile/ProfileScreen.tsx
- src/screens/run/PostRunSummaryScreen.tsx (if sequencing adjustment is needed)
- functions/index.js (only if logic adjustment is approved)
- docs/phase-4/*.md

## Test Additions After Feedback
1. Overlay cooldown and queue behavior.
2. DNA reason text correctness for each DNA type.
3. Regression test for idempotent badge writes after logic tweaks.

## Status
- Planned only.
- Activate this plan after first full Phase 4 baseline pass.
- Baseline implementation completed on 2026-04-18.
- Matrix baseline signoff criteria completed on 2026-04-19 (T401-T415 PASS).
- Next activation point: first production feedback cycle.
