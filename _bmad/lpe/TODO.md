# TODO: LPE: Lovable Prompt Engineer

Development roadmap for lpe module.

---

## Agents to Build

- [x] Viper (Lovable Prompt Engineer)
  - Agent YAML: `_bmad-output/bmb-creations/lovable-prompt-engineer.agent.yaml`
  - Validated: 2026-02-17 (PASS — 0 failures, 0 warnings)
  - **Action:** Copy to `_bmad/lpe/agents/lovable-prompt-engineer.agent.yaml` during installation

---

## Workflows to Build

No step-file workflows needed. All capability via agent prompt commands (`GP`, `SC`).

---

## Installation Testing

- [ ] Test installation with `bmad install lpe`
- [ ] Verify module.yaml prompts work correctly
- [ ] Verify Viper agent is discoverable
- [ ] Verify `lovable_prompts_folder` resolves correctly

---

## End-to-End Testing

- [ ] Run `GP` on a real story — verify prompt quality
- [ ] Run `GP` on a story with unchecked review follow-ups — verify remediation mode
- [ ] Run `SC` — verify constraint block reflects current codebase
- [ ] Verify prompt saves to `lovable_prompts_folder`
- [ ] Verify prompt displays for copy-paste

---

## Documentation

- [x] README.md
- [x] TODO.md
- [x] docs/getting-started.md
- [x] docs/agents.md
- [x] docs/examples.md

---

## Next Steps

1. Install module via `bmad install lpe`
2. Copy Viper agent YAML to installed location
3. Test `GP` on a real story
4. Iterate based on prompt quality

---

_Last updated: 2026-02-17_
