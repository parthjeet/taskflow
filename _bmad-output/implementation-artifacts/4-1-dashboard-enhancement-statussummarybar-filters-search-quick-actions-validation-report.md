# Validation Report: Story 4.1 Dashboard Enhancement

Date: 2026-03-02
Workflow: validate-create-story (manual execution from checklist)
Story File: `_bmad-output/implementation-artifacts/4-1-dashboard-enhancement-statussummarybar-filters-search-quick-actions.md`

## Outcome

- Decision: **Needs revision before dev-story**
- Critical issues: **2**
- Enhancements: **4**
- Optimizations: **4**

## Critical Issues (Must Fix)

1. **Quick-action click behavior is underspecified and likely to cause navigation regressions.**
   - Why this is critical: Task cards are currently full-card clickable (`onClick` navigates to detail), so quick-action buttons can accidentally trigger navigation unless propagation is explicitly blocked.
   - Evidence:
     - Story quick actions defined but no propagation guard requirement: `4-1...md:59-67`
     - Full-card navigation exists now: `taskflow-ui/src/components/TaskCard.tsx:31-37`
   - Required story fix:
     - Add explicit requirement: quick-action controls must call `event.stopPropagation()` and must not trigger card-level navigation.
     - Add test requirement for this behavior.

2. **"Edit" quick action behavior is ambiguous against current routing and can produce inconsistent implementations.**
   - Why this is critical: Story requires an Edit quick action but does not define destination or behavior, while app has no dedicated edit route.
   - Evidence:
     - Quick actions include Edit without acceptance/test criteria: `4-1...md:64`, `4-1...md:23-25`, `4-1...md:69-76`
     - Current routes only `/`, `/tasks/:id`, `/team`, `/settings`: `taskflow-ui/src/App.tsx:21-25`
   - Required story fix:
     - Define one canonical behavior, e.g. "Edit quick action navigates to `/tasks/:id` and opens the existing edit dialog".
     - Add AC and test for Edit action.

## Enhancement Opportunities (Should Add)

1. **Sort-contract transition lacks explicit test migration instructions.**
   - Impact: Story removes dashboard `status` sort and adds `created`; existing tests still assert status sort parity and will fail or be stale unless updated.
   - Evidence:
     - Story sort change: `4-1...md:52`
     - Existing status-sort tests: `taskflow-ui/src/test/mock-task-filters.test.ts:302`, `:323`, `:328`, `:335`
   - Recommendation: Add explicit subtask to update adapter/dashboard sort tests to `created`/`updated`/`priority` expectations.

2. **Path-safety guidance conflicts with planned cleanup scope.**
   - Impact: Story says all file changes must be `taskflow-ui/src/...` but required cleanup includes `tailwind.config.ts` and dependency changes.
   - Evidence:
     - Path safety rule: `4-1...md:88`
     - Non-`src` edits required: `4-1...md:38-41`
   - Recommendation: Replace with "Prefer `taskflow-ui/src/...`; `taskflow-ui/tailwind.config.ts` and `taskflow-ui/package.json` allowed for cleanup only."

3. **Filter persistence requirements omit malformed localStorage handling.**
   - Impact: Corrupted JSON in `taskflow-dashboard-filters` can break dashboard initialization.
   - Evidence: Persistence required but no parse-failure behavior: `4-1...md:53`, `:95`, `:110-113`
   - Recommendation: Require defensive `try/catch` parse with fallback defaults and key reset.

4. **Assignee filter semantics should be explicitly preserved (active members + unassigned).**
   - Impact: Rework may regress existing behavior.
   - Evidence:
     - Existing active-member behavior helper: `taskflow-ui/src/lib/dashboard/tasks.ts:55-57`
     - Existing unassigned option in UI: `taskflow-ui/src/pages/Index.tsx:107-110`
   - Recommendation: Add explicit requirement in Tasks/Dev Notes for `All`, `Unassigned`, and active members only.

## Optimizations (Nice to Have)

1. **Scope cleanup to named items only (App.css, NavLink, Sonner, dark/sidebar artifacts) to avoid broad churn.**
   - Evidence: Cleanup AC is broad and can be interpreted as sweeping deletion: `4-1...md:26`, `:35-41`

2. **Define single source of truth for derived UI state after optimistic mutations.**
   - Recommendation: Require StatusSummaryBar counts and filtered list to derive from the same `tasks` state slice in `Index.tsx`.

3. **Clarify blocked reason display truncation expectation.**
   - Impact: Current card truncates long reasons (`TaskCard.tsx:61`); story should decide whether full or truncated-with-tooltip is acceptable.

4. **Add explicit test for quick-action loading guards per action.**
   - Recommendation: Separate tests for inline status, mark done, and delete to ensure no duplicate submissions.

## LLM Optimization (Token Efficiency & Clarity)

1. Replace broad cleanup language with a finite checklist of allowed deletions/files.
2. Convert ambiguous quick-action statements into deterministic behavior bullets (input, action, expected state, rollback).
3. Move critical guardrails (stopPropagation, malformed-localStorage fallback, in-flight guards) from narrative text into the Task checklist where implementation happens.
4. Add a compact "Definition of Done" block listing exact commands and required passing test files for Story 4.1.

## Suggested Patch Targets in Story File

- Update Task 6 with click-propagation and Edit-action behavior details.
- Expand AC set with one explicit Edit quick-action criterion.
- Add test subtasks for Edit action and quick-action no-navigation guarantee.
- Amend Technical Requirements path-safety wording.
- Add persistence error-handling requirement.

