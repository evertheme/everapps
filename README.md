# everapps — Requirements Backlog App

Convert requirements documents into reviewed, version-controlled backlogs and publish them to your project management tool.

## Features

- Upload requirements documents (`.docx`, `.pdf`, `.txt`, `.md`)
- **Requirements Document Assistant** — AI-powered gap analysis maps your document against an industry-standard 12-section taxonomy (IEEE 29148 / BRD / PRD), scores each section for completeness, and highlights missing or thin content before you generate stories; Phase 2 adds interactive gap fill — use AI to draft missing sections, edit the drafts, approve them, and save the improved document as a new version
- **Requirements Wizard** — guided 4-step wizard for projects with no document yet: answer questions about product name, executive summary, business objectives, and must-have features; AI suggests content at each step; results are saved as a starter requirements document ready for gap analysis or story generation
- Downloadable requirements document template (`.docx`) pre-structured to the 12-section taxonomy — fill it in and upload it straight back
- Structure-aware processing that detects and preserves document sections
- Full document support — large documents are automatically split into provider-optimised chunks so nothing is truncated
- AI-powered user story generation (OpenAI, Anthropic, Azure OpenAI, Ollama)
- Automated story review for ambiguity and missing requirements
- Inline story editing with full version history
- One-click export to JIRA, Asana, Trello, or Azure DevOps
- Per-user authentication and project isolation

## How It Works

After registering an account and creating a project, the core workflow is:

1. **Upload** a requirements document — the parser extracts text and detects section headings per format (DOCX heading styles, Markdown `#` headers, heuristic detection for PDF/TXT).
2. **Generate** — the AI analyses the document and produces structured user stories with titles, descriptions, acceptance criteria, priority, and story points. Large documents are split into chunks sized to the active LLM's context window and processed in parallel.
3. **Review** — each story is checked by a second AI pass for ambiguity and missing requirements.
4. **Edit** — refine stories inline; every change creates a new version.
5. **Export** — push approved stories to your PM tool in one click.

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env — set SECRET_KEY, ENCRYPTION_KEY, and your LLM API key
docker-compose up --build
```

App available at **http://localhost** (port 80 via Nginx).

## Development (hot reload)

```bash
cp .env.example .env
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API (FastAPI) | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

## Environment Variables

Copy `.env.example` and fill in the required values. All variables with defaults are optional.

### Application

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | JWT signing secret (min 32 chars) |
| `ENCRYPTION_KEY` | Yes | Fernet key for encrypting PM credentials — generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `DATABASE_URL` | Yes* | Full PostgreSQL connection string — `postgresql://user:pass@host:5432/db` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:3000,http://localhost`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime (default: `60`) |

\* `DATABASE_URL` can be omitted if the individual `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` variables are set — the app constructs the URL from them automatically. This is the recommended approach on Railway.

### LLM — Server defaults

These are used when a user has not configured their own LLM provider in the UI.

| Variable | Default | Description |
|---|---|---|
| `DEFAULT_LLM_PROVIDER` | `openai` | Active provider (`openai`, `anthropic`, `azure_openai`, `ollama`) |
| `DEFAULT_LLM_MODEL` | `gpt-4o` | Model name for the default provider |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `AZURE_OPENAI_API_KEY` | — | Azure OpenAI API key |
| `AZURE_OPENAI_ENDPOINT` | — | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | — | Azure deployment name |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |

### Document processing

Chunk size is resolved automatically per LLM provider (~60% of its context window), so GPT-4o and Claude users will typically process an entire document in a single call.

| Variable | Default | Description |
|---|---|---|
| `DOC_CHUNK_OVERLAP` | `200` | Chars of overlap between adjacent chunks |
| `DOC_MAX_CONCURRENT_CHUNKS` | `3` | Max parallel LLM calls during story generation |

## Running Tests

Tests run entirely locally — no running Docker or live services required.

### Backend

Uses **pytest** with an in-memory SQLite database (no PostgreSQL needed) and mocked LLM/PM calls.

```bash
cd backend
pip install -r requirements.txt
pytest                          # all tests + coverage report
pytest tests/test_auth.py       # single file
pytest -k "test_login"          # tests matching a name pattern
pytest -x                       # stop on first failure
pytest --no-cov                 # skip coverage (faster)
```

`conftest.py` sets required environment variables automatically — no `.env` needed for tests.

### Frontend

Uses **Jest** + **React Testing Library**. API calls are intercepted with `axios-mock-adapter`.

```bash
cd frontend
npm install
npm test                        # run all tests once
npm run test:watch              # interactive watch mode
npm run test:coverage           # with coverage report
```

### Test coverage

| Area | Backend (pytest) | Frontend (Jest + RTL) |
|---|---|---|
| Authentication | register, login, JWT validation, `/me` | Login page, Register page, `auth.ts` helpers |
| Projects | full CRUD + auth guards | — |
| Documents | upload, multi-format parser, versioning | — |
| Stories | CRUD, versioning, LLM generation, LLM review | StoryCard component |
| LLM providers | factory, all four providers, generator + reviewer | — |
| PM integrations | CRUD, export, credentials not exposed, Asana + Trello | ExportModal component |
| Utilities | Fernet encrypt/decrypt | `cn()`, `formatDate()`, color maps |
| API client | — | Token injection, error propagation |
| Review UI | — | ReviewPanel component |
| Requirements assistant — Phase 1 (gap analysis) | taxonomy service (11 tests), gap analysis service with mocked LLM (4 tests), API endpoints (10 tests) | GapAnalysisPanel component (28 tests), RequirementCompleteness widget (13 tests) |
| Requirements assistant — Phase 2 (interactive gap fill) | draft_gap_fill service (3 tests), approve_section service (3 tests), save_gap_fill_document service (3 tests), API endpoints (9 tests) | Covered by updated GapAnalysisPanel tests (fill, approve, save interactions) |
| Requirements wizard | save_wizard_document service (3 tests), generate_wizard_suggestions service (1 test), API endpoints (7 tests) | — |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| LLM providers | OpenAI, Anthropic, Azure OpenAI, Ollama |
| PM integrations | JIRA, Asana, Trello, Azure DevOps |
| Infrastructure | Docker Compose + Nginx (local) · Railway (production) |

## CI/CD Pipeline

### Branch strategy

| Branch | Railway Environment | Deploys on push |
|---|---|---|
| `develop` | development | Yes |
| `staging` | staging | Yes |
| `main` | production | Yes |

Typical promotion flow:

1. Create a feature branch off `develop`
2. Open a PR → GitHub Actions runs backend and frontend tests
3. Merge into `develop` → Railway deploys to the development environment
4. Open a PR from `develop` → `staging` → Railway deploys to staging
5. Open a PR from `staging` → `main` → Railway deploys to production

### GitHub Actions CI

Two workflows run automatically:

**`ci.yml`** — on every push and pull request targeting `develop`, `staging`, or `main`:

- **Backend** — `pytest` with SQLite in-memory (no external services needed)
- **Frontend** — `next lint` then `jest`

Configure GitHub branch protection rules on `develop`, `staging`, and `main` to require the `CI` status check before merging.

**`feature-branch-tests.yml`** — on every push to any branch *other than* `develop`, `staging`, and `main`:

- Runs the same backend and frontend test suites so failures are caught before a PR is opened.

Workflow files: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) · [`.github/workflows/feature-branch-tests.yml`](.github/workflows/feature-branch-tests.yml)

## Deploying to Railway

The repo is structured as a Railway monorepo with two services (`backend/` and `frontend/`) each containing a `railway.toml` and `Dockerfile`. Set the **Root Directory** for each service to `backend` or `frontend` accordingly.

Create one Railway project with three environments — **development**, **staging**, and **production** — each watching the corresponding Git branch (`develop`, `staging`, `main`). Every environment gets its own Postgres instance and its own set of environment variables.

### Required environment variables

**Backend service** (set per environment)

| Variable | Value |
|---|---|
| `SECRET_KEY` | Random string ≥ 32 chars — unique per environment |
| `ENCRYPTION_KEY` | Fernet key (see above) — unique per environment |
| `PGHOST` | `${{Postgres.PGHOST}}` |
| `PGPORT` | `${{Postgres.PGPORT}}` |
| `PGUSER` | `${{Postgres.PGUSER}}` |
| `PGPASSWORD` | `${{Postgres.POSTGRES_PASSWORD}}` |
| `PGDATABASE` | `${{Postgres.POSTGRES_DB}}` |
| `CORS_ORIGINS` | `https://yourdomain.com` (public URL for that environment) |
| `OPENAI_API_KEY` | Your OpenAI key (or leave blank and configure per-user in the UI) |

**Frontend service** (set per environment)

| Variable | Value |
|---|---|
| `BACKEND_URL` | `http://<backend-private-domain>:<port>` — find the private domain in the backend service → Settings → Private Networking |

### How startup works

The backend `start.sh` script:
1. Constructs `DATABASE_URL` from `PG*` variables if not already set
2. Waits up to 60 s for the database to accept connections
3. Runs `alembic upgrade head`
4. Starts Uvicorn

This means the healthcheck at `/health` only becomes reachable once migrations have completed — no race conditions.

## Requirements Document Template

A pre-formatted `.docx` template aligned to the 12-section taxonomy is served statically at `/templates/requirements-template.docx` and linked from the Requirements page in the app.

To regenerate it after changing the taxonomy (e.g. adding sections):

```bash
pip install python-docx       # one-time
python scripts/generate_requirements_template.py
```

The script overwrites `frontend/public/templates/requirements-template.docx`.

## Documentation

| Document | Description |
|---|---|
| [`docs/requirements-document-assistant.md`](docs/requirements-document-assistant.md) | Specification for the AI-powered Requirements Document Assistant (all phases) |
| [`docs/large-document-support.md`](docs/large-document-support.md) | Architecture and implementation of large document chunking |
| [`docs/deployment-cost-analysis.md`](docs/deployment-cost-analysis.md) | Infrastructure cost breakdown and scaling considerations |
| [`docs/future-enhancements.md`](docs/future-enhancements.md) | Roadmap and planned features |
