---
agentName: 'Viper'
hasSidecar: false
module: 'stand-alone'
agentFile: '_bmad-output/bmb-creations/lovable-prompt-engineer.agent.yaml'
validationDate: '2026-02-17'
stepsCompleted:
  - v-01-load-review.md
  - v-02a-validate-metadata.md
  - v-02b-validate-persona.md
  - v-02c-validate-menu.md
  - v-02d-validate-structure.md
  - v-02e-validate-sidecar.md
  - v-03-summary.md
validationOutcome: 'PASS - all warnings resolved via Fix in Place'
---

# Validation Report: Viper (Lovable AI Prompt Engineer)

## Agent Overview

**Name:** Viper
**hasSidecar:** false
**module:** stand-alone
**File:** `_bmad-output/bmb-creations/lovable-prompt-engineer.agent.yaml`

---

## Validation Findings

### Metadata Validation

**Status:** ⚠️ WARNING (1 non-blocking issue)

**Checks:**
- [x] id: kebab-case, no spaces, unique — `_bmad/agents/lovable-prompt-engineer/lovable-prompt-engineer.md`
- [x] name: clear display name — `Viper` (distinct from title)
- [x] title: concise function description — `Lovable AI Prompt Engineer`
- [x] icon: appropriate emoji/symbol — `✍️` (single emoji, visually representative)
- [x] module: correct format — `stand-alone` (lowercase, hyphenated)
- [x] hasSidecar: matches actual usage — `false` (no sidecar references present)

**Detailed Findings:**

*PASSING:*
- All 6 required fields present and non-empty
- id follows `_bmad/agents/{name}/{name}.md` pattern
- name is a persona name, not a title or filename
- icon is single emoji, visually representative of prompt engineering
- module correctly lowercase hyphenated
- hasSidecar=false with no sidecar path references — consistent
- name != title — no anti-pattern duplication

*WARNINGS:*
- Title "Lovable AI Prompt Engineer" kebab-cases to `lovable-ai-prompt-engineer` but agent-name/filename is `lovable-prompt-engineer` (missing "ai" segment). Non-blocking — agent-name was established in discovery before title was finalized.

*FAILURES:*
- None

### Persona Validation

**Status:** ⚠️ WARNING (4 non-blocking issues)

**Checks:**
- [x] role: specific, not generic — "Prompt engineering specialist for Lovable AI"
- [x] identity: defines who agent is — "Precision-obsessed prompt architect"
- [x] communication_style: speech patterns described — "Sharp and surgical"
- [x] principles: first principle activates domain knowledge — "Channel expert prompt engineering..."
- [x] principles: 5 count within 3-7 range
- [x] cross-field consistency: all four fields aligned, no contradictions
- [x] persona supports menu items (GP, SC)

**Detailed Findings:**

*PASSING:*
- All 4 persona fields present and substantive
- Role is specific to Lovable AI prompt engineering, not generic
- Role aligns with both menu commands (GP generates prompts, SC shows constraints)
- Identity is distinctive ("precision-obsessed prompt architect who treats every word as load-bearing")
- Identity provides behavioral context grounded in experience ("learned from watching AI code generators fail")
- Communication style passes forbidden-word check (no "ensures", "experienced", "believes in", etc.)
- Communication style passes purity test — describes voice characteristics
- First principle correctly uses "Channel expert [domain]: draw upon deep knowledge of [frameworks]" pattern
- All 5 principles pass the "obvious test" — none are generic job duties
- No contradictions between principles
- No overlap between persona fields (role/identity/communication/principles separated)
- Persona as a whole is coherent and purpose-aligned

*WARNINGS:*
- Role uses third-person voice ("Prompt engineering specialist...") instead of first-person as recommended by agent-architecture.md. Non-blocking — many valid examples in persona-properties.md also use non-first-person.
- Communication style contains one behavioral word ("does it") mixed with speech patterns. Non-blocking — describes the communication flow pattern (state → do → confirm).
- Communication style is 3 sentences; recommended format is "1-2 sentences MAX". Non-blocking — content is concise despite sentence count.
- Principle #5 ("Read the actual source files before writing the prompt") is borderline task-like. Non-blocking — the underlying philosophy is "verify, don't assume" which is a belief.

*FAILURES:*
- None

### Menu Validation

**Status:** ✅ PASS

**hasSidecar:** false

**Checks:**
- [x] Triggers follow `XX or fuzzy match on command` format — GP, SC
- [x] Descriptions start with `[XX]` code — `[GP]`, `[SC]`
- [x] No reserved codes (MH, CH, PM, DA) — GP, SC are unique custom codes
- [x] Action handlers valid (#prompt-id) — `#generate-prompt`, `#show-constraints` both reference existing prompts
- [x] Configuration appropriate menu links — `action` handler type correct for Simple Agent (hasSidecar: false)

**Detailed Findings:**

*PASSING:*
- Menu section exists with proper YAML structure
- 2 menu items defined, each with required fields (trigger, action, description)
- GP trigger: `GP or fuzzy match on generate-prompt` — correct 2-letter code format
- SC trigger: `SC or fuzzy match on show-constraints` — correct 2-letter code format
- Codes are unique within agent (GP, SC)
- No reserved codes used (MH, CH, PM, DA all avoided)
- Descriptions: `[GP] Generate Lovable prompt for a story`, `[SC] Show standard constraint block` — clear, code-prefixed
- Action `#generate-prompt` maps to existing prompt id `generate-prompt`
- Action `#show-constraints` maps to existing prompt id `show-constraints`
- Handler type `action` is correct for Simple Agent (hasSidecar: false)
- No sidecar file references in menu handlers — consistent with hasSidecar: false
- Menu aligns with agent purpose: GP is core function, SC is utility
- 2 commands is appropriate scope for a focused single-purpose agent

*WARNINGS:*
- None

*FAILURES:*
- None

### Structure Validation

**Status:** ✅ PASS

**Configuration:** Agent WITHOUT sidecar

**hasSidecar:** false

**Checks:**
- [x] Valid YAML syntax — parses cleanly, no errors
- [x] Required sections present — metadata, persona, prompts, menu
- [x] Field types correct — arrays (principles, prompts, menu), strings, boolean (hasSidecar)
- [x] Consistent 2-space indentation throughout
- [x] Configuration appropriate structure — no sidecar refs for hasSidecar: false

**Detailed Findings:**

*PASSING:*
- YAML parses without errors
- 2-space indentation consistent throughout all 66 lines
- Special characters properly escaped (icon `'✍️'` quoted)
- No duplicate keys in any section
- Frontmatter correctly omitted (compiler auto-generates)
- All required sections present: `agent.metadata`, `agent.persona`, `agent.prompts`, `agent.menu`
- No empty sections
- Arrays properly formatted: principles (5 items), prompts (2 items), menu (2 items)
- No malformed YAML structures
- No sidecar-folder path in metadata (correct for hasSidecar: false)
- No critical_actions section (correct — none needed)
- Menu handlers use only internal `#prompt-id` references
- 66 lines total, well under ~250 line limit
- Compilation DO NOT checklist: no frontmatter, no activation XML, no MH/CH/PM/DA, no handlers, no rules section

*WARNINGS:*
- None

*FAILURES:*
- None

### Sidecar Validation

**Status:** N/A

**hasSidecar:** false

**Checks:**
- [x] No sidecar-folder path in metadata — confirmed
- [x] No sidecar references in critical_actions — no critical_actions section present
- [x] No sidecar references in menu handlers — only `#prompt-id` references used

*N/A — Agent has hasSidecar: false, no sidecar required*

---

## Fix in Place Applied

All 5 warnings resolved in `lovable-prompt-engineer.agent.yaml`:

1. Title changed: `Lovable AI Prompt Engineer` → `Lovable Prompt Engineer` (matches filename derivation)
2. Role rewritten in first-person: `I am a prompt engineering specialist...`
3. Communication style behavioral word removed: `does it` excised
4. Communication style condensed: 3 sentences → 2 sentences
5. Principle #5 reframed as belief: `Stale assumptions produce stale instructions - always verify...`

---

## Final Outcome

**Status:** ✅ PASS — 0 failures, 0 warnings (all resolved)
**Agent:** Viper (Lovable Prompt Engineer)
**File:** `_bmad-output/bmb-creations/lovable-prompt-engineer.agent.yaml`
**Lines:** 65
**Date:** 2026-02-17
