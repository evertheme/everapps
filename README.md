# everapps — Requirements Backlog App

Convert requirements documents into reviewed, version-controlled backlogs and publish them to your project management tool.

## Features

- Upload requirements documents (`.docx`, `.pdf`, `.txt`, `.md`)
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
| `ENCRYPTION_KEY` | Yes | Fernet key for encrypting PM credentials |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | JWT lifetime (default: `60`) |

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

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI, SQLAlchemy, Alembic, PostgreSQL |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| LLM providers | OpenAI, Anthropic, Azure OpenAI, Ollama |
| PM integrations | JIRA, Asana, Trello, Azure DevOps |
| Infrastructure | Docker Compose, Nginx |

## Documentation

| Document | Description |
|---|---|
| [`docs/large-document-support.md`](docs/large-document-support.md) | Architecture and implementation of large document chunking |
| [`docs/deployment-cost-analysis.md`](docs/deployment-cost-analysis.md) | Infrastructure cost breakdown and scaling considerations |
| [`docs/future-enhancements.md`](docs/future-enhancements.md) | Roadmap and planned features |
