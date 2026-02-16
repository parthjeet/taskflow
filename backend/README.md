# TaskFlow Backend

## Prerequisites

- **Python 3.12+**
- **uv**: Project dependency manager (replace `pip` / `poetry`)
  - Install via `curl -LsSf https://astral.sh/uv/install.sh | sh` (Linux/macOS)
  - Or `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"` (Windows)

## Setup

1. Install dependencies:
   ```bash
   uv sync
   ```

2. Initialize environment (handled automatically by scripts below).

## Development

Start the development server with auto-reload:

```bash
./scripts/dev.sh
# Runs: uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Access API docs at: http://127.0.0.1:8000/docs

## Tests

Run the test suite:

```bash
./scripts/test.sh
# Runs: uv run pytest -q
```

## Migrations

Create and apply migrations with Alembic:

```bash
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

Revision ID convention: use timestamp-based IDs in `YYYYMMDD_NNNN` format (for example `20260216_0001`) to reduce collision risk across contributors.
