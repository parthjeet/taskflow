# Getting Started with LPE

Welcome to LPE! This guide will help you get up and running.

---

## What This Module Does

LPE generates high-quality, self-contained prompts for Lovable AI. It reads your project's story files, architectural docs, and source code, then assembles structured prompts with automatic constraint injection — so Lovable produces clean, architecture-compliant code on the first try.

---

## Installation

If you haven't installed the module yet:

```bash
bmad install lpe
```

Follow the prompt to configure where generated Lovable prompts are saved.

---

## First Steps

### 1. Have a Story Ready

LPE works with story files created by the BMM `create-story` workflow. Your story should be in `_bmad-output/implementation-artifacts/`.

### 2. Generate Your First Prompt

```
GP 2-3
```

Replace `2-3` with your story identifier. Viper will:
1. Resolve the story file
2. Load context (epics, API contract, architecture, source files)
3. Assemble a structured prompt
4. Save it and display it for copy-paste

### 3. Copy to Lovable

Copy the displayed prompt into the Lovable AI website. The prompt includes everything Lovable needs — no additional context required (except attaching the master doc).

---

## Common Use Cases

### Initial Prompt Generation
Run `GP {story-id}` when a UI story is ready for development. Viper produces a complete prompt with Objective, Context, Implementation, Constraints, and Verification sections.

### Remediation Prompt
Run `GP {story-id}` after code review finds issues. Viper auto-detects unchecked review follow-ups (`- [ ]` items) and produces a targeted corrective prompt.

### View Constraints
Run `SC` to see the current standard constraint block that gets injected into every prompt. Useful for verifying guardrails reflect the actual codebase.

---

## What's Next?

- Check out the [Agents Reference](agents.md) to learn about Viper's capabilities
- See [Examples](examples.md) for real-world usage scenarios

---

## Need Help?

If you run into issues:
1. Verify the story file exists in `_bmad-output/implementation-artifacts/`
2. Check that `epics.md` and `API_CONTRACT.md` are present
3. Review your module configuration in `module.yaml`
