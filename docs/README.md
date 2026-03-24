# everapps — Documentation Index

This folder contains project documentation for the everapps application. Documents are kept here (rather than a GitHub Wiki) so they version alongside the code and remain accurate across branches.

---

## Documents

### [git-branching-strategy.md](./git-branching-strategy.md)

How the three long-lived branches (`develop`, `staging`, `main`) are managed, how feature branches are created and merged, how promotions between environments work, the hotfix protocol, and version tagging with Semantic Versioning.

**Read this if you need to:** understand the branch model, run a promotion, handle a hotfix, or investigate branch divergence.

---

### [cicd-pipeline-strategy.md](./cicd-pipeline-strategy.md)

The GitHub Actions CI/CD strategy: why tests run only on PRs (not on every push), path filtering so only affected services are tested, how the promotion workflows operate internally, Railway deployment integration, and the `GH_PAT` setup required by the promotion workflows.

**Read this if you need to:** understand why/when CI runs, set up the `GH_PAT` secret, configure Railway, or add new test jobs.

---

### [future-enhancements.md](./future-enhancements.md)

Two planned enhancements that extend everapps into a full AI-driven development pipeline: AI code generation from approved user stories and automated story progress tracking. Includes prerequisites, data models, new services, and open decisions.

**Read this if you need to:** plan or implement the AI code generation feature or the story pipeline tracking feature.

---

### [requirements-document-assistant.md](./requirements-document-assistant.md)

Product specification for the Requirements Document Assistant feature — AI-powered conversion of requirement documents into reviewed, version-controlled user story backlogs with PM tool export support.

**Read this if you need to:** understand the current core feature, its data model, or its integration with Jira/Asana/Trello/Azure DevOps.

---

### [large-document-support.md](./large-document-support.md)

Technical design for handling large requirement documents that exceed LLM context windows — chunking strategies, progressive processing, and reassembly.

**Read this if you need to:** work on document upload, chunking, or LLM processing logic.

---

### [deployment-cost-analysis.md](./deployment-cost-analysis.md)

Historical platform evaluation comparing Railway, Fly.io, Render, and Google Cloud Run across cost, complexity, and operational fit. The platform decision (Railway) has been made.

**Read this if you need to:** understand why Railway was chosen or revisit the platform decision.

---

## Workflow Quick Links

| Task | Where to go |
|------|-------------|
| Promote develop → staging | GitHub → Actions → **Promote develop → staging** → Run workflow |
| Promote staging → main | GitHub → Actions → **Promote staging → main** → Run workflow |
| Create a release tag (hotfix) | GitHub → Actions → **Create Release** → Run workflow |
| View Railway deployments | [railway.app](https://railway.app) dashboard |
