# CI/CD Pipeline Strategy

## Overview

This document defines the CI/CD pipeline rules for this project. The guiding principle is:

> **Test at the gate. Promote with confidence.**

The PR into `develop` is the single CI gate. All other events — promotions from `develop → staging → main` — carry identical, already-tested code and require no retesting.

This strategy is designed to work alongside the branching model described in [`git-branching-strategy.md`](./git-branching-strategy.md).

---

## The Problem with Naive CI Configuration

Without intentional trigger design, a single feature will trigger 10 job runs:

| Event | Workflow | Jobs run |
|-------|----------|----------|
| push to `feature/x` (per commit) | `feature-branch-tests.yml` | backend + frontend |
| open PR into `develop` | `ci.yml` (pull_request) | backend + frontend |
| PR merged → push to `develop` | `ci.yml` (push) | backend + frontend — **duplicate** |
| ff-only push to `staging` | `ci.yml` (push) | backend + frontend — **duplicate** |
| ff-only push to `main` | `ci.yml` (push) | backend + frontend — **duplicate** |

Runs 3–5 are byte-for-byte the same code that already passed run 2. There is also no path filtering, so a CSS-only change triggers the entire Python test suite.

---

## Optimized Trigger Rules

### Where CI runs

| Event | CI runs? | Reason |
|-------|----------|--------|
| push to a feature branch | No | Noisy; PR is the real gate |
| open / update PR into `develop` | **Yes — full suite** | This is the merge gate |
| open / update PR into `staging` | Yes — path-filtered | Same code; passes quickly via cache |
| open / update PR into `main` | Yes — path-filtered | Same code; passes quickly via cache |
| push to `develop` after merge | No | Already passed on the PR |
| push to `staging` after promotion | No | Already passed; Railway deploys immediately |
| push to `main` after promotion | No | Already passed; Railway deploys immediately |

### Why promotion PRs still trigger CI

Promotion PRs (`develop → staging`, `staging → main`) carry no new code, so tests always pass quickly (especially with dependency caching). Having CI run on them keeps GitHub's required-check UI happy and provides a visible audit trail, while still being cheap to run.

---

## Path Filtering

Tests are split by service so only the affected stack runs:

| Files changed | Backend tests | Frontend tests |
|---------------|--------------|----------------|
| `backend/**` only | Yes | No |
| `frontend/**` only | No | Yes |
| Both | Yes | Yes |
| Neither (e.g. docs, config) | No | No |

A `changes` job runs first to detect which paths were touched, and each test job only starts if its path matches.

---

## Workflow Architecture

```mermaid
flowchart TD
    PR["pull_request event"] --> changes["changes job (dorny/paths-filter)"]
    changes -->|"backend/**"| backend["backend-tests job"]
    changes -->|"frontend/**"| frontend["frontend-tests job"]
    backend -->|"pass"| gate["branch protection gate"]
    frontend -->|"pass"| gate
    gate -->|"all required checks pass"| merge["merge allowed"]
```

---

## Railway Configuration

### Remove "Wait for CI" on branch deploys

Railway should **not** wait for CI on pushes to `develop`, `staging`, or `main`. There is no CI running on those push events — it was already enforced on the PR before the merge.

In the Railway dashboard, for **each environment**:

1. Navigate to **Settings → Source**
2. Disable **"Wait for CI checks before deploying"** (or equivalent toggle)

Railway will then deploy immediately when a branch is updated. This is safe because GitHub branch protection already guarantees that no code reaches any of the three branches without passing CI.

### Deploy trigger

Railway is connected to each branch and deploys on every push:

| Branch | Railway Environment | Deploys when |
|--------|---------------------|--------------|
| `develop` | Development | PR is merged into `develop` |
| `staging` | Staging | Promotion PR is merged into `staging` |
| `main` | Production | Promotion PR is merged into `main` |

---

## GitHub Branch Protection Settings

### `develop`

- Require pull requests before merging
- Require status checks to pass:
  - `Backend Tests` (when backend files changed)
  - `Frontend Tests` (when frontend files changed)
- Require branches to be up to date before merging
- Do not allow bypassing these settings

### `staging` and `main`

- Require pull requests before merging
- No required CI status checks (promotions carry no new code)
- Require linear history
- Do not allow bypassing these settings

> **Note on "no required CI" for staging/main:** Because promotions are ff-only merges of already-tested code, requiring CI on these branches would add latency with no security benefit. The branch protection on `develop` is where the guarantee is established.

---

## Workflow Files

### `.github/workflows/ci.yml`

This is the only workflow file. `feature-branch-tests.yml` is deleted.

```yaml
name: CI

on:
  pull_request:
    branches: [develop, staging, main]

jobs:
  changes:
    name: Detect Changed Paths
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
            frontend:
              - 'frontend/**'

  backend-tests:
    name: Backend Tests
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: backend/requirements.txt
      - name: Install dependencies
        run: pip install -r requirements.txt
        working-directory: backend
      - name: Run pytest
        run: pytest
        working-directory: backend
        env:
          UPLOAD_DIR: /tmp/everapps_test_uploads

  frontend-tests:
    name: Frontend Tests
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json
      - name: Install dependencies
        run: npm ci
        working-directory: frontend
      - name: Lint
        run: npm run lint
        working-directory: frontend
      - name: Run tests
        run: npm test -- --ci --coverage --passWithNoTests
        working-directory: frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1
```

---

## Result: Test Runs Per Feature

| Event | Before | After |
|-------|--------|-------|
| push to feature branch (per commit) | 2 jobs | 0 |
| open PR into `develop` | 2 jobs | 1–2 (path-filtered) |
| push to `develop` after merge | 2 jobs | 0 |
| push to `staging` after promotion | 2 jobs | 0 |
| push to `main` after promotion | 2 jobs | 0 |
| **Total per feature** | **10 job runs** | **1–2 job runs** |

---

## Edge Cases

### PR that only changes docs or config

If a PR changes only files outside `backend/` and `frontend/` (e.g. `docs/`, `.env.example`, `docker-compose.yml`), neither test job will run. The PR can still be merged because no required status checks are triggered.

If you want to block merges on doc-only PRs without tests, add a catch-all job:

```yaml
  no-tests-needed:
    name: No Tests Required
    needs: changes
    if: needs.changes.outputs.backend == 'false' && needs.changes.outputs.frontend == 'false'
    runs-on: ubuntu-latest
    steps:
      - run: echo "No testable files changed."
```

Then add `No Tests Required` as an optional (not required) status check in branch protection.

### Hotfix PRs

Hotfix branches target `main` directly. The PR into `main` triggers CI on `backend/**` and/or `frontend/**` as normal. After merging and back-propagating (`main → staging → develop`), no additional CI runs — same code.
