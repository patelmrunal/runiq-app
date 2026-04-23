# Phase 5 Carry-Over From Phase 4 (2026-04-23)

## Purpose
This file captures unresolved or deferred work from Phase 4 so execution can continue in Phase 5 without context loss.

## Source Files
- docs/phase-4/00-carry-over-from-phase-3.md
- docs/phase-4/02-open-items-and-left-work.md
- docs/phase-4/07-post-feedback-change-plan-2026-04-14.md

## Carry-Over Items

### Ops and Platform
- Tune scheduler batching strategy if user count grows (current implementation scans active users).
- Decide whether notification audit documentation is required in addition to user dedupe fields.
- Execute iOS device smoke validation for parity signoff (deferred from Android-first Phase 3).
- Complete Play Console manual follow-ups:
  - Enter finalized Data Safety selections from Phase 3 file 09 into Play Console and save draft.
  - Confirm Privacy Policy URL in Play Console matches the in-app configured URL.
  - Add short pre-permission rationale for notifications (recommended checklist item).

### Data Contract and Product Clarifications
- Confirm users/{uid}/badges write shape fields (earnedAt, triggerRunId, category, year, milestone).
- Confirm users/{uid}/events payload schema for new event types.
- Decide whether dnaHistory should be full history or capped history.
- Confirm final milestone badge list that should trigger full-screen animation.
- Confirm final DNA label display text format on profile card.
- Confirm fallback label policy when no winner threshold is met (Still Discovering expected).

### UX and Post-Feedback Refinements
- Add optional in-app setting to disable non-critical push categories.
- Add/confirm level-up copy and unlock message content from product.
- Confirm premium bonus challenge task scope timing (immediate vs later).
- Confirm streak-break level reset policy (reset to Level 1 vs softer policy).
- Confirm final copy for shield warning and streak reset empathy message.
- Execute post-feedback test additions:
  - Overlay cooldown and queue behavior.
  - DNA reason text correctness for each DNA type.
  - Regression test for idempotent badge writes after any logic tweaks.

## Initial Phase 5 Handling Recommendation
1. Treat this file as the Phase 5 backlog seed.
2. In Phase 5 planning, classify each item as Must Do, Should Do, or Defer.
3. Move committed items into Phase 5 execution plan and keep this file as the carry-over audit trail.
