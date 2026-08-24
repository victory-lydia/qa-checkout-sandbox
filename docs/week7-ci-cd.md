# Week 7 — CI/CD Pipelines & Quality Gates

## 1. CI/CD Architecture in Modern Software Engineering

Continuous Integration and Continuous Deployment (CI/CD) automates the validation of code changes to prevent defective code from reaching production.

In **The QA Checkout Sandbox**, a complete **GitHub Actions** workflow (`.github/workflows/ci.yml`) is implemented, establishing a multi-layered quality gate mechanism.

```
Git Push / Pull Request
   │
   ▼
[Quality Gate 1] ─── Static Analysis (ESLint) ──────────► [Fail: Bad Syntax/Style]
   │ (Pass)
   ▼
[Quality Gate 2] ─── Unit Tests (Domain & Boundaries) ──► [Fail: Logic Regression]
   │ (Pass)
   ▼
[Quality Gate 3] ─── Integration & Handshake Tests ─────► [Fail: Protocol Break]
   │ (Pass)
   ▼
[Quality Gate 4] ─── System / API Tests (Supertest) ────► [Fail: HTTP / Endpoint Bug]
   │ (Pass)
   ▼
[Quality Gate 5] ─── Contract Tests ────────────────────► [Fail: Interface Drift]
   │ (Pass)
   ▼
[Quality Gate 6] ─── Pairwise Combinatorial Check ──────► [Fail: Constraint Breach]
   │ (Pass)
   ▼
[Quality Gate 7] ─── Code Coverage (>= 80% Threshold) ──► [Fail: Low Test Coverage]
   │ (Pass)
   ▼
[Quality Gate 8] ─── Multi-Layer Sandbox Smoke Test ────► [Fail: Layer Boot Error]
   │ (Pass)
   ▼
✅ Automated Build & Quality Gate Approved for Release
```

---

## 2. The 8 Quality Gates Explained

| Gate # | Quality Gate Name | Command / Script | Failure Condition | Purpose & Rationale |
| :---: | :--- | :--- | :--- | :--- |
| **QG-1** | **Static Analysis** | `npm run lint` | ESLint error or warning count > 0. | Prevents syntax errors, undeclared variables, loose comparisons, and stylistic divergence. |
| **QG-2** | **Unit Testing** | `npm run test:unit` | Any unit test assertion fails. | Validates pricing algorithms, coupon logic, taxes, and payload input validation. |
| **QG-3** | **Integration Testing** | `npm run test:integration` | Handshake or rollback failure. | Ensures sequential subsystem handshakes, race condition safety, and compensation refunds work. |
| **QG-4** | **System API Testing** | `npm run test:system` | Supertest HTTP response mismatch. | Verifies live Express HTTP endpoints, headers, JSON body serialization, and error codes. |
| **QG-5** | **Contract Testing** | `npm run test:contract` | Interface signature divergence. | Guarantees test doubles adhere identically to production infrastructure interfaces. |
| **QG-6** | **Pairwise Test Verification** | `npm run test:pairwise` | Combinatorial constraint violation. | Confirms PICT model generates valid test matrices adhering to domain rules (Safari on Mac). |
| **QG-7** | **Coverage Threshold Gate** | `npm run test:coverage` | Statements, branches, functions, or lines < 80%. | Enforces testing depth across all codebase branches and prevents untested code ingestion. |
| **QG-8** | **Sandbox Multi-Layer Gate** | `npm run sandbox -- --layer=1/2/3` | Layer boot or execution crash. | Proves that all three dependency injection tiers (Isolated, Integrated, Contract) function correctly. |

---

## 3. Failure Policies & Branch Protection Rules

In production repositories, GitHub branch protection rules should enforce:
1. **Require Status Checks to Pass:** Pull requests cannot be merged to `main` until all 8 Quality Gates report green.
2. **Require Up-to-Date Branches:** PRs must be rebased or merged with `main` before validation to avoid merge race conditions.
3. **No Bypass for Administrators:** Ensures even senior engineers adhere to automated quality standards.
