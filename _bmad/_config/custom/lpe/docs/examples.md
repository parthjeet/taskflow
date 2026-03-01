# Examples & Use Cases

Practical examples for using LPE.

---

## Example 1: Initial Prompt Generation

**Situation:** Story `2-3` (Task Detail Page with Adapter Pattern) is ready for development.

**Command:** `GP 2-3`

**What Viper does:**
1. Resolves story file: `_bmad-output/implementation-artifacts/2-3-task-detail-page-with-adapter-pattern.md`
2. Loads epics.md Lovable prompt section for story 2-3
3. Reads API_CONTRACT.md for endpoint definitions
4. Reads architecture.md for patterns
5. Reads referenced source files (existing components, types, API client)
6. Assembles prompt with standard structure

**Output:** Structured prompt saved to `_bmad-output/lovable-prompts/2-3-prompt.md` and displayed.

---

## Example 2: Remediation Prompt

**Situation:** Code review on story `2-3` found 3 issues. Review follow-ups section has:
```
### Review Follow-ups (AI)
- [ ] Fix import path for apiClient
- [ ] Add error boundary around task detail
- [x] Update type definitions (already fixed)
```

**Command:** `GP 2-3`

**What Viper does:**
1. Detects 2 unchecked `- [ ]` items — switches to remediation mode
2. Reads the actual current source files that need fixing
3. Produces a corrective prompt targeting only the 2 unchecked items

**Output:** Remediation prompt saved to `_bmad-output/lovable-prompts/2-3-remediation-1.md` and displayed.

---

## Example 3: Viewing Constraints

**Command:** `SC`

**What Viper does:**
1. Reads API_CONTRACT.md, client.ts, and types.ts
2. Renders the current standard constraint block

**Output:** Displays the constraint block showing current architectural guardrails (no package additions, adapter boundary enforcement, import paths, UI primitives, etc.)

---

## Tips

- Always run `GP` rather than writing prompts manually — even for "simple" stories
- The constraint block catches architectural violations you wouldn't think to mention
- Remediation mode reads actual source files, not just review descriptions — corrections are precise
- Prompts reference `docs/task_flow_master_doc.md` — make sure to attach it in Lovable separately
- Saved prompt files include metadata headers for traceability

---

## Troubleshooting

### "Story file not found"
Verify the story file exists in `_bmad-output/implementation-artifacts/` and matches the identifier format.

### Prompt missing context
Ensure `epics.md`, `API_CONTRACT.md`, and `architecture.md` are present in their expected locations.

### Remediation not triggering
Check that the story has unchecked `- [ ]` items in the `### Review Follow-ups (AI)` section. Checked `- [x]` items are skipped.
