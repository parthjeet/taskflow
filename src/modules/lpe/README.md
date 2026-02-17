# LPE: Lovable Prompt Engineer

Precision prompt generation for Lovable AI.

Single-agent module that transforms story identifiers into self-contained, architecture-aware Lovable AI prompts.

---

## Overview

LPE closes the prompt quality gap for Lovable AI code generation. It reads your project's story files, epics, API contracts, architecture docs, and source files — then assembles structured prompts with automatic constraint injection and explicit architectural context. Supports both initial prompt generation and auto-detected remediation mode for code review follow-ups.

---

## Installation

```bash
bmad install lpe
```

---

## Quick Start

1. Create a story via the BMM `create-story` workflow
2. Invoke Viper: `GP {story-id}` (e.g., `GP 2-3`)
3. Copy the generated prompt into Lovable AI
4. If code review finds issues, run `GP {story-id}` again — Viper auto-detects remediation mode

---

## Components

### Agents

| Agent | Name | Icon | Role |
|-------|------|------|------|
| Lovable Prompt Engineer | Viper | ✍️ | Prompt engineering specialist for Lovable AI |

### Workflows

No step-file workflows. All capability delivered through agent prompt commands:

| Command | Description |
|---------|-------------|
| `[GP]` | Generate Lovable prompt for a story (auto-detects initial vs. remediation) |
| `[SC]` | Show standard architectural constraint block |

---

## Configuration

The module supports these configuration options (set during installation):

| Variable | Description | Default |
|----------|-------------|---------|
| `lovable_prompts_folder` | Where generated Lovable prompts are saved | `{output_folder}/lovable-prompts` |

Core config variables (`user_name`, `communication_language`, `output_folder`) are inherited automatically.

---

## Module Structure

```
lpe/
├── module.yaml
├── README.md
├── TODO.md
├── docs/
│   ├── getting-started.md
│   ├── agents.md
│   └── examples.md
├── agents/
│   └── lovable-prompt-engineer.agent.yaml
└── workflows/
    └── README.md
```

---

## Documentation

- [Getting Started](docs/getting-started.md)
- [Agents Reference](docs/agents.md)
- [Examples](docs/examples.md)

---

## Development Status

- [x] Agent: Viper (created and validated)
- [x] Module structure
- [ ] Installation testing
- [ ] End-to-end prompt generation testing

See TODO.md for detailed status.

---

## Author

Created by parth via BMAD Module workflow on 2026-02-17.

---

## License

Part of the BMAD framework.
