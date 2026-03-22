# everapps — Deployment Platform Cost Analysis

**Prepared:** March 2026  
**Project:** everapps  
**Stack:** FastAPI · Next.js 14 · PostgreSQL 16 · Nginx · Docker  

---

## 1. Stack Overview

everapps runs as a multi-service Docker Compose application. Any deployment platform must support the following:

| Service | Technology | Resource Baseline |
|---|---|---|
| Backend API | Python 3.12 · FastAPI · Uvicorn | 0.5–1 vCPU · 1–2 GB RAM |
| Frontend | Next.js 14 standalone build | 0.25–0.5 vCPU · 512 MB–1 GB RAM |
| Database | PostgreSQL 16 | 1–2 GB RAM · 20 GB storage |
| Reverse Proxy | Nginx 1.25 | Handled by platform in cloud deployments |
| File Storage | Upload volume (50 MB max per file) | 10–50 GB object/volume storage |

> **Note:** LLM API costs (OpenAI, Anthropic, Azure OpenAI) are entirely separate from infrastructure
> costs and can easily exceed infra spend at scale. They are not included in the estimates below.

---

## 2. Usage Tiers Defined

All cost tables use two scenarios:

| Tier | Description |
|---|---|
| **Starter** | Low traffic · solo dev or small team · no high availability · ~720 hrs/month uptime |
| **Growth** | Moderate sustained traffic · small team · production-hardened · some redundancy |

---

## 3. Platform Cost Estimates

### 3.1 Railway

**Model:** Usage-based (per second) · Hobby plan includes $20 monthly usage credit  
**Rates:** `$0.00000772 / vCPU-sec` · `$0.00000386 / GB-sec` · `$0.05 / GB egress`

| Component | Config | Monthly Cost |
|---|---|---|
| Backend service | 0.5 vCPU · 1 GB RAM | ~$20 |
| Frontend service | 0.25 vCPU · 512 MB RAM | ~$10 |
| Postgres service | 0.5 vCPU · 512 MB + 5 GB volume | ~$14 |
| Included usage credit (Hobby) | — | −$20 |
| Hobby plan fee | — | +$5 |
| **Starter Total** | | **~$29 / month** |

**Growth estimate:** ~$80–120 / month (Pro plan at $20/month + higher resource allocation)

**Pros:**
- Closest to Docker Compose mental model — deploy each service directly
- Built-in Postgres with volume backups
- GitHub-native CI/CD; auto-deploys on push with zero config
- Usage-based billing prevents over-provisioning

**Cons:**
- Hobby plan has a 5 GB volume cap and 50 services/project limit
- No SLA on Hobby plan
- Less enterprise compliance coverage than AWS/Azure

---

### 3.2 Fly.io

**Model:** Usage-based per Machine (CPU + RAM preset bundles)  
**Rates:** Shared-1x (1 shared vCPU) ~$1.94–$10.70/month depending on RAM; dedicated VMs from $31/month

| Component | Machine | Monthly Cost |
|---|---|---|
| Backend | shared-2x · 2 GB RAM | ~$10.70 |
| Frontend | shared-1x · 1 GB RAM | ~$5.35 |
| Fly Postgres | shared-1x · 1 GB RAM | ~$5.35 |
| Upload volume (10 GB) | Persistent volume | ~$1.50 |
| **Starter Total** | | **~$23 / month** |

**Growth estimate:** ~$90–130 / month (performance-1x VMs, HA Postgres, larger volumes)

**Pros:**
- Among the cheapest options for always-on containers
- Native volume support for the uploads directory
- Anycast global edge network built in
- `fly deploy` CLI integrates cleanly with GitHub Actions

**Cons:**
- Smaller ecosystem and community vs AWS/GCP/Azure
- Fly Postgres is not fully managed (no automated minor version upgrades)
- Limited compliance certifications

---

### 3.3 Google Cloud Run + Cloud SQL

**Model:** Serverless containers — scales to zero when idle  
**Rates:** `$0.00002400 / vCPU-sec` active · `$0.00000250 / GiB-sec` · free tier: 2M requests, 180K vCPU-sec, 360K GiB-sec / month

| Component | Config | Monthly Cost |
|---|---|---|
| Backend (Cloud Run) | 0.5 vCPU · 1 GB · scales to zero | ~$5–15 |
| Frontend (Cloud Run) | 0.25 vCPU · 512 MB · scales to zero | ~$3–8 |
| Cloud SQL (Postgres) | db-f1-micro · 20 GB SSD | ~$13 |
| Cloud Storage (uploads) | Standard class | ~$0.50 |
| **Starter Total** | | **~$22–37 / month** |

> The cost range is wide because Cloud Run only charges for active request processing time.
> A low-traffic app that handles a few hundred requests per day could sit at the low end.
> An always-on minimum instance (to avoid cold starts) pushes it toward the higher end.

**Growth estimate:** ~$110–180 / month (min-instances=1 for both services, Cloud SQL db-g1-small)

**Pros:**
- Scale-to-zero makes it the most cost-efficient for uneven/low traffic
- Cloud Build provides a managed CI/CD pipeline at no extra charge
- Generous free tier covers many small workloads entirely
- Strong compliance posture (SOC 2, ISO 27001, HIPAA)

**Cons:**
- Cold starts (2–5 seconds) affect first-request latency unless min-instances is set
- Next.js standalone on Cloud Run requires some build configuration adjustments
- Cloud SQL db-f1-micro is shared core; not suitable for sustained production load

---

### 3.4 Render

**Model:** Fixed monthly instance pricing (prorated by second, but predictable)

| Component | Instance Type | Monthly Cost |
|---|---|---|
| Backend (FastAPI) | Standard · 2 GB · 1 vCPU | $25 |
| Frontend (Next.js) | Starter · 512 MB | $7 |
| Postgres | Basic-1gb | $19 |
| **Starter Total** | | **$51 / month** |

> Using Starter (512 MB) for FastAPI is possible but risky for LLM response handling.
> Standard is the safe minimum for the backend.

**Growth estimate:** ~$165–200 / month (Pro backend, Pro Postgres, Professional workspace at $19/user/month)

**Pros:**
- Most predictable pricing — fixed instance cost, no surprise bills
- Zero-downtime deploys and instant rollbacks built in
- Preview environments on pull requests on Professional plan
- Managed Postgres with PITR on paid tiers

**Cons:**
- More expensive than usage-based alternatives for low-traffic apps
- Free instances spin down after 15 minutes of inactivity
- Horizontal autoscaling requires Professional plan ($19/user/month)

---

### 3.5 AWS ECS Fargate + RDS + ALB

**Model:** Pay per task-second (vCPU + memory) + managed services  
**Rates:** `$0.04048 / vCPU-hour` · `$0.004445 / GB-hour` (us-east-1, on-demand)

| Component | Config | Monthly Cost |
|---|---|---|
| Backend (Fargate task) | 0.5 vCPU · 1 GB RAM · 720 hrs | ~$18 |
| Frontend (Fargate task) | 0.5 vCPU · 512 MB RAM · 720 hrs | ~$16 |
| RDS PostgreSQL | db.t3.micro · 20 GB gp2 | ~$15 |
| Application Load Balancer | — | ~$18 |
| S3 (upload storage) | Standard storage class | ~$0.50 |
| ECR (container registry) | ~5 GB images | ~$2 |
| **Starter Total** | | **~$70 / month** |

> Add **~$32 / month** for a NAT Gateway if tasks run in private subnets (recommended for production).
> Total with NAT: **~$102 / month**

**Growth estimate:** ~$200–300 / month (larger task sizes, RDS db.t3.small, multi-AZ, NAT Gateway)

**Fargate Spot savings:** 60–70% discount on interruptible workloads — suitable for the frontend or
background tasks, not the primary API.

**Pros:**
- Industry-standard; largest ecosystem of integrations, tooling, and documentation
- Broadest compliance portfolio (HIPAA, PCI-DSS, FedRAMP, SOC 2, ISO 27001)
- Fargate Spot reduces costs significantly for non-critical services
- GitHub Actions → ECR → ECS deploy pipeline is mature and well-documented

**Cons:**
- Highest baseline cost in the Tier 1 group
- Most complex to configure (IAM roles, VPC, security groups, task definitions)
- ALB is a fixed $18/month overhead regardless of traffic
- NAT Gateway adds $32/month and data transfer charges

---

### 3.6 Azure Container Apps + Azure Database for PostgreSQL

**Model:** Consumption plan — per vCPU-second + per GiB-second  
**Rates (active):** `$0.000024 / vCPU-sec` · `$0.000003 / GiB-sec`  
**Free allowance:** 180,000 vCPU-sec + 360,000 GiB-sec per subscription per month

| Component | Config | Monthly Cost |
|---|---|---|
| Backend (Container Apps) | 0.5 vCPU · 1 GB · active | ~$39 |
| Frontend (Container Apps) | 0.25 vCPU · 512 MB · active | ~$20 |
| Azure DB for PostgreSQL | Burstable B1ms · 32 GB | ~$17 |
| Blob Storage (uploads) | LRS · Standard | ~$0.50 |
| Free monthly allowance | — | −$5 |
| **Starter Total** | | **~$71 / month** |

**Growth estimate:** ~$220–350 / month (Dedicated plan, higher vCPU, HA Postgres Flexible)

**Azure-specific advantage for everapps:** The codebase already integrates Azure OpenAI and
Azure DevOps as PM export targets. Running on Azure consolidates billing, simplifies private
networking between the app and Azure OpenAI endpoints, and removes cross-cloud egress charges.

**Pros:**
- Native integration with Azure OpenAI (already wired in the codebase)
- Azure DevOps Pipelines integrates seamlessly as the CI/CD layer
- Idle pricing reduces cost when containers have no active traffic
- Strong enterprise compliance (HIPAA, ISO 27001, SOC 2, FedRAMP)

**Cons:**
- Most expensive of the serverless/container options for sustained traffic
- Azure Container Apps adds cold-start latency without dedicated plans
- Steeper learning curve than Railway/Render for teams new to Azure

---

### 3.7 Kubernetes Platforms (EKS / GKE / AKS)

Kubernetes adds operational overhead but is appropriate for teams that need multi-environment
management, fine-grained scaling policies, or are already running other K8s workloads.

| Platform | Control Plane | Worker Nodes (2x) | Postgres | Extras | **Starter Total** |
|---|---|---|---|---|---|
| **AWS EKS** | $72/month | 2× t3.medium ~$60 | RDS ~$15 | ALB ~$18 | **~$185/month** |
| **GKE Autopilot** | Free | Pod-level billing ~$40 | Cloud SQL ~$13 | — | **~$90/month** |
| **AKS** | Free | 2× Standard_B2s ~$60 | Azure DB ~$17 | — | **~$100/month** |

**Growth estimates:**
- EKS: ~$400–600/month (3-node cluster, HA RDS, WAF)
- GKE Autopilot: ~$200–350/month
- AKS: ~$250–400/month

> EKS has a hard $72/month cluster fee that applies regardless of workload size —
> making it the most expensive option for a small deployment.

---

## 4. Summary Comparison Table

| Platform | Starter / month | Growth / month | Scale-to-zero | Managed Postgres | CI/CD Built-in |
|---|---|---|---|---|---|
| Railway | ~$29 | ~$100 | No | Yes | Yes (GitHub) |
| Fly.io | ~$23 | ~$110 | No | Partial | Via GitHub Actions |
| Google Cloud Run | ~$22–37 | ~$120 | **Yes** | Yes (Cloud SQL) | Yes (Cloud Build) |
| Render | ~$51 | ~$165 | No (free tier only) | Yes | Yes (GitHub/GitLab) |
| AWS ECS Fargate | ~$70 | ~$200 | No | Yes (RDS) | Via GitHub Actions |
| Azure Container Apps | ~$71 | ~$230 | Partial (idle pricing) | Yes | Yes (Azure DevOps) |
| GKE Autopilot | ~$90 | ~$220 | No | Yes (Cloud SQL) | Yes (Cloud Build) |
| AKS | ~$100 | ~$270 | No | Yes (Azure DB) | Yes (Azure DevOps) |
| AWS EKS | ~$185 | ~$450 | No | Yes (RDS) | Via GitHub Actions |

---

## 5. Hidden and Recurring Costs to Budget For

| Cost Item | Who Charges | Typical Impact |
|---|---|---|
| **LLM API calls** | OpenAI / Anthropic / Azure | Can exceed infra cost at scale; budget separately |
| **Egress (outbound data)** | AWS, GCP, Azure | $0.08–$0.09 / GB; low for API-heavy apps |
| **NAT Gateway (AWS)** | AWS only | +$32/month fixed + $0.045/GB data |
| **SSL / TLS certificates** | All managed platforms | Free (Let's Encrypt or platform-managed) |
| **Secrets management** | AWS Secrets Manager, Azure Key Vault | ~$0.40 / secret / month (AWS) |
| **Log retention beyond free tier** | All providers | $1–15/month depending on volume |
| **Build minutes / CI runners** | GitHub Actions | 2,000 free min/month; ~$0.008/min after |
| **Database backups / PITR** | All managed DBs | Usually included on paid tiers |
| **Support plans** | AWS, GCP, Azure | $29–$100/month minimum for developer support |
| **Domain + DNS** | Registrar | ~$12–20/year |

---

## 6. Recommendations by Scenario

| Scenario | Recommended Platform | Reasoning |
|---|---|---|
| **Fastest path to production** | Railway or Render | Minimal config; Docker-native; works today |
| **Lowest cost, uneven traffic** | Google Cloud Run | Scale-to-zero; generous free tier |
| **Azure OpenAI / Azure DevOps already in use** | Azure Container Apps | Single cloud; no cross-cloud egress; unified billing |
| **Enterprise compliance required** | AWS ECS Fargate | Broadest certification portfolio |
| **Need Kubernetes, cost-conscious** | GKE Autopilot or AKS | No cluster fee; AKS aligns with existing Azure surface |
| **Predictable, fixed monthly bill** | Render | Fixed instance pricing; no surprise usage spikes |

---

## 7. CI/CD Pipeline Skeleton (all platforms)

Regardless of platform, the pipeline stages remain the same:

```
[Git Push / Pull Request]
        │
        ├── 1. Lint & Test
        │       ├── Backend:  pytest (SQLite in-memory, mocked LLM)
        │       └── Frontend: Jest + React Testing Library
        │
        ├── 2. Build Docker Images
        │       ├── backend/Dockerfile   → tagged image
        │       └── frontend/Dockerfile  → Next.js standalone image
        │
        ├── 3. Push to Container Registry
        │       └── ECR / GCR / ACR / Docker Hub
        │
        ├── 4. Run Alembic Migrations
        │       └── alembic upgrade head (against target DB)
        │
        └── 5. Deploy
                ├── Staging   → on merge to develop / PR merge
                └── Production → on merge to main (with manual approval gate)
```

---

## 8. Pricing Sources

All figures are based on publicly listed prices as of **March 2026**. Prices are estimates and
subject to change. Verify current rates using each provider's pricing calculator before committing.

| Provider | Pricing Page |
|---|---|
| Railway | https://railway.com/pricing |
| Fly.io | https://fly.io/docs/about/pricing/ |
| Render | https://render.com/pricing |
| Google Cloud Run | https://cloud.google.com/run/pricing |
| Google Cloud SQL | https://cloud.google.com/sql/docs/postgres/pricing |
| AWS ECS Fargate | https://aws.amazon.com/fargate/pricing/ |
| AWS RDS PostgreSQL | https://aws.amazon.com/rds/postgresql/pricing/ |
| Azure Container Apps | https://azure.microsoft.com/en-us/pricing/details/container-apps/ |
| Azure DB for PostgreSQL | https://azure.microsoft.com/en-us/pricing/details/postgresql/ |

---

*Document generated for the everapps project · March 2026*
