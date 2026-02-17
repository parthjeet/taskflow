# Agent Creation Complete!

## Agent Summary

- **Name:** Viper
- **Title:** Lovable AI Prompt Engineer
- **Icon:** ✍️
- **Module:** stand-alone
- **hasSidecar:** false
- **Purpose:** Write high-quality, self-contained prompts for Lovable AI to complete UI stories in the TaskFlow project
- **Status:** Ready for installation
- **Created:** 2026-02-17

## File Locations

- **Agent YAML:** `_bmad-output/bmb-creations/lovable-prompt-engineer.agent.yaml`
- **Agent Plan:** `_bmad-output/bmb-creations/agent-plan-lovable-prompt-engineer.md`

## Commands

| Code | Command | Description |
|------|---------|-------------|
| GP | generate-prompt | Generate Lovable prompt for a story |
| SC | show-constraints | Show standard constraint block |

## Key Design Decisions

1. Auto-detection of initial vs. remediation mode (from story status + unchecked review follow-ups)
2. Deterministic context gathering — story identifier is the only input needed
3. Standard prompt structure: Objective, Context, Implementation/Issues, Constraints, Verification
4. Source file reading for remediation — reads actual current code, not just review descriptions
5. Dual output — save to file for traceability AND display for copy-paste
6. Explicit import paths — spell out exact imports rather than letting Lovable guess

## Installation

Package as a standalone module with `module.yaml` containing `unitary: true`.
See: https://github.com/bmad-code-org/BMAD-METHOD/blob/main/docs/modules/bmb-bmad-builder/custom-content-installation.md#standalone-content-agents-workflows-tasks-tools-templates-prompts

## Workflow Status

- **Workflow:** create-agent
- **Completion:** 2026-02-17
- **Steps completed:** 1-8 (all)
