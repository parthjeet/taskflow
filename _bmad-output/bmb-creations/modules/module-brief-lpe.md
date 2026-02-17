# Module Brief: lpe

**Date:** 2026-02-17
**Author:** parth
**Module Code:** lpe
**Module Type:** Standalone
**Status:** Ready for Development

---

## Executive Summary

A precision module that transforms story identifiers into self-contained, architecture-aware Lovable AI prompts — eliminating the prompt quality gap that caused UI stories to generate 2x the code review findings of backend stories. One story ID in, one clean prompt out.

**Module Category:** AI Prompt Engineering / Code Generation Support
**Target Users:** Project leads using Lovable AI for frontend development in BMAD-driven projects
**Complexity Level:** Low (single agent, no workflows, no external tooling)

---

## Module Identity

### Module Code & Name

- **Code:** `lpe`
- **Name:** `LPE: Lovable Prompt Engineer`

### Core Concept

LPE packages a single precision-focused agent (Viper) that reads project artifacts — story files, epics, API contracts, architecture docs, and source files — and assembles structured Lovable AI prompts with automatic constraint injection and explicit architectural context. It supports both initial prompt generation and auto-detected remediation mode for code review follow-ups.

### Personality Theme

Tactical precision. Sharp, surgical, no filler. The name "Viper" embodies the module's ethos: fast, precise, strikes once. The delight is in how cleanly it works, not in personality flourishes.

---

## Module Type

**Type:** Standalone

LPE is a brand new domain — AI prompt engineering for Lovable. It does not extend BMM, CIS, or any existing module. It has its own identity, its own agent, and its own purpose. It reads BMM output artifacts but operates independently.

---

## Unique Value Proposition

**What makes this module special:**

For BMAD project leads using Lovable AI for frontend development, LPE provides deterministic, architecture-aware prompt generation unlike manually writing Lovable prompts because it auto-gathers all project context from a single story ID and injects architectural constraints that prevent the most common code review failures.

**Why users would choose this module:**

- **Deterministic context gathering** — story ID is the only input; all relevant files are resolved automatically
- **Auto-detection** of initial vs. remediation mode from story status and unchecked review follow-ups
- **Standard constraint injection** — architectural guardrails are included every time, regardless of whether the story mentions them
- **Explicit import paths** — spells out exact imports rather than letting Lovable guess
- **Dual output** — saved to file for traceability AND displayed for copy-paste
- **Source file verification** — reads actual current code before writing prompts, preventing stale instructions

---

## User Scenarios

### Target Users

- **Primary:** parth (Project Lead, intermediate skill level) — invokes LPE when UI-track stories are ready for Lovable development or when code review findings need remediation prompts
- **Input:** Story identifier (e.g., "2-2" or "2-2-task-detail-page-with-adapter-pattern")
- **Output:** Saved prompt file + displayed prompt text ready to copy-paste into Lovable AI

### Primary Use Case

User has a story file ready for development. They invoke Viper with `GP {story-id}`. Viper reads the story, gathers all context (epics, API contract, architecture, source files), assembles a structured prompt, saves it, and displays it for copy-paste into Lovable.

### User Journey

**Scenario 1: Initial Prompt Generation**
1. Story `2-3` is created via `create-story` workflow and marked ready for dev
2. User runs `GP 2-3`
3. Viper resolves the story file, loads epics Lovable prompt section, API contract, architecture docs, and referenced source files
4. Viper assembles a structured prompt: Objective, Context, Implementation, Constraints, Verification
5. Prompt is saved to `_bmad-output/lovable-prompts/2-3-prompt.md` and displayed
6. User copies prompt into Lovable AI website — gets clean, architecture-compliant code

**Scenario 2: Remediation Prompt**
1. Code review on story `2-3` finds 3 issues, recorded as unchecked `- [ ]` items in Review Follow-ups
2. User runs `GP 2-3` again
3. Viper auto-detects remediation mode from the unchecked follow-ups
4. Viper reads the actual current source files that need fixing
5. Viper produces a targeted remediation prompt with specific corrective instructions per finding
6. Prompt saved as `_bmad-output/lovable-prompts/2-3-remediation-1.md` and displayed

**Scenario 3: Constraint Save**
- User works on a story touching the settings page
- Would normally forget to mention localStorage restrictions (adapter pattern only)
- Viper's standard constraint block catches it automatically — injected every time, every prompt
- Lovable respects the boundary; no architectural drift

---

## Agent Architecture

### Agent Count Strategy

Single agent. The domain is tightly scoped: read a story, gather context, produce a prompt. No need for separate analyst/writer agents when one precision-focused agent handles the entire pipeline in a single pass.

### Agent Roster

| Agent | Name | Role | Expertise |
|-------|------|------|-----------|
| Lovable Prompt Engineer | Viper ✍️ | Prompt engineering specialist for Lovable AI | Story analysis, context gathering, constraint injection, structured prompt assembly |

### Agent Interaction Model

No inter-agent interaction — single agent module. Viper operates independently via direct commands.

### Agent Communication Style

Sharp and surgical. Short declarative sentences. States what will be done, does it, confirms completion. No filler, no hedging.

---

## Workflow Ecosystem

### Core Workflows (Essential)

| Workflow | Purpose | Flow |
|----------|---------|------|
| Generate Prompt (Initial) | Produce a Lovable-ready prompt from a story ID | Story ID → resolve story file → gather context (epics, API contract, architecture, source files) → assemble structured prompt → save + display |
| Generate Prompt (Remediation) | Produce a corrective prompt from review findings | Story ID → detect unchecked review follow-ups → read current source files → assemble fix prompt → save + display |

Note: These are implemented as agent prompt commands (`GP`), not step-file workflows.

### Feature Workflows (Specialized)

None. The module is intentionally lean — all capability is in the agent commands.

### Utility Workflows (Support)

| Workflow | Purpose | Flow |
|----------|---------|------|
| Show Constraints | Display standard architectural constraint block | Read API contract + types + client → render constraint block |

Implemented as agent prompt command (`SC`).

---

## Tools & Integrations

### MCP Tools

None. Viper reads project files directly using standard file access (Read, Glob, Grep).

### External Services

None. Prompts are copy-pasted manually into the Lovable AI website. Output saved locally to `_bmad-output/lovable-prompts/`.

### Integrations with Other Modules

Soft read-only dependencies on BMM output artifacts:
- Story files from `create-story` workflow (`_bmad-output/implementation-artifacts/`)
- Epics from planning phase (`_bmad-output/planning-artifacts/epics.md`)
- Sprint status (`_bmad-output/implementation-artifacts/sprint-status.yaml`)
- Review follow-ups from `code-review` workflow

LPE consumes BMM output but does not call BMM agents or workflows directly.

---

## Creative Features

### Personality & Theming

Tactical precision. Viper's identity is the personality — a precision-obsessed prompt architect who treats every word as load-bearing. The module's tone is clean, focused, and no-nonsense.

### Easter Eggs & Delighters

None — intentionally on-brand. Viper doesn't do cute. The delight is in how cleanly it works.

### Module Lore

Born from the prompt quality gap identified in Epic 1's retrospective: UI stories averaged ~2x the review findings of backend stories due to insufficient prompt detail and missing architectural constraints. Viper exists to close that gap permanently.

---

## Next Steps

1. **Review this brief** — Ensure the vision is clear
2. **Run create-module workflow** — Build the module structure
3. **Create agents** — Viper already created and validated (`_bmad-output/bmb-creations/lovable-prompt-engineer.agent.yaml`)
4. **Install module** — Package as standalone with `module.yaml` containing `unitary: true`
5. **Test module** — Run `GP` on a real story and validate prompt quality

---

_brief created on 2026-02-17 by parth using the BMAD Module workflow_
