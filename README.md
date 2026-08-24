# The QA Checkout Sandbox

> A complete, runnable final-year software testing reference project featuring a **responsive Vanilla JavaScript frontend** combined with an **Express backend** and an automated testing laboratory demonstrating concepts learned across **Weeks 1–8** of an advanced Software Testing course.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. System Architecture](#2-system-architecture)
- [3. Complete User Journey & Flow](#3-complete-user-journey--flow)
- [4. Frontend UI Pages & Features](#4-frontend-ui-pages--features)
- [5. Installation & Quickstart](#5-installation--quickstart)
- [6. Running the Sandbox Engine](#6-running-the-sandbox-engine)
- [7. Running the Automated Test Suite](#7-running-the-automated-test-suite)
- [8. Testing Strategy by Week (Curriculum Alignment)](#8-testing-strategy-by-week-curriculum-alignment)
- [9. Test Double Justification (Gerard Meszaros Taxonomy)](#9-test-double-justification-gerard-meszaros-taxonomy)
- [10. Test Pyramid & Sandbox Layers](#10-test-pyramid--sandbox-layers)
- [11. Performance, Stress & Soak Testing Strategy](#11-performance-stress--soak-testing-strategy)
- [12. Concurrency & Race Condition Safety](#12-concurrency--race-condition-safety)
- [13. Known Limitations](#13-known-limitations)
- [14. Submission Checklist](#14-submission-checklist)

---

## 1. Project Overview

The goal of this project is to construct a **comprehensive software testing environment** around a realistic e-commerce checkout flow, complete with a clean **Vanilla JavaScript frontend** and an **Express backend**.

### Key Capabilities:
- **Zero Frontend Frameworks:** Pure, accessible HTML, CSS, and Vanilla JavaScript using the browser Fetch API and `localStorage` (no React, Vue, Angular, TS, or JSX).
- **100% Offline, Deterministic Test Execution:** Requires no live third-party databases, no external payment APIs (Stripe/PayPal), no email services (SendGrid/SMTP), and no secret API keys.
- **Modern JavaScript Stack:** Written in Node.js with native ES Modules (`"type": "module"`), Express, Jest, Supertest, Playwright, ESLint v9, `pict-node`, and Autocannon.
- **End-to-End UI Testing with Playwright:** Automated browser tests verifying product browsing, cart modification, checkout flows, and error handshakes.
- **Configurable Sandbox Engine:** Switch seamlessly between Layer 1 (Isolated Mocks/Fakes), Layer 2 (Integrated In-Memory DB), and Layer 3 (Contract Verified).
- **High Test Quality:** >90% code coverage across statements, branches, functions, and lines with automated threshold enforcement.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       VANILLA JAVASCRIPT FRONTEND UI                        │
│   [index.html]   [products.html]   [cart.html]   [checkout.html]   [sandbox.html]   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP REST / Fetch API
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPRESS WEB SERVER & API                          │
│   GET /api/products  |  GET /api/customers  |  POST /api/checkout           │
│   GET /api/orders/:id  |  GET /api/inventory/:id  |  GET /api/sandbox/info  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Dependency Injection
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CORE DOMAIN: ORDER SERVICE                            │
│                 Coordinates 6-Step Sequential Handshake Flow                │
└───────┬──────────────────────┬──────────────────────┬───────────────────────┘
        │                      │                      │                       │
        ▼                      ▼                      ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐      ┌────────────────┐
│   CUSTOMER    │      │   INVENTORY   │      │    PAYMENT    │      │     EMAIL      │
│   DATABASE    │      │    SERVICE    │      │    GATEWAY    │      │    NOTIFIER    │
├───────────────┤      ├───────────────┤      ├───────────────┤      ├────────────────┤
│ Double: FAKE  │      │ Double: STUB  │      │ Double: MOCK  │      │  Double: SPY   │
│ In-Memory DB  │      │ Canned Stock  │      │ Call Recorder │      │ Message Logger │
└───────────────┘      └───────────────┘      └───────────────┘      └────────────────┘
```

### Directory Structure:
```
qa-checkout-sandbox/
├── package.json                   # Scripts, ESM declaration, dependencies
├── eslint.config.js               # ESLint flat config (v9+)
├── jest.config.js                 # Jest ESM config with >= 80% coverage threshold
├── playwright.config.js           # Playwright E2E configuration with webServer
├── .github/workflows/ci.yml       # Week 7 CI Quality Gates Pipeline (9 gates)
├── bin/
│   └── sandbox.js                 # Sandbox CLI runner (--layer=1|2|3)
├── frontend/                      # Multi-Page Vanilla JavaScript Frontend
│   ├── index.html                 # Homepage & feature overview
│   ├── products.html              # Product catalog with live stock & Add to Cart
│   ├── cart.html                  # Shopping cart management & quantity controls
│   ├── checkout.html              # Checkout form, coupons, payment simulator, receipt
│   ├── sandbox.html               # Interactive Testing Sandbox Dashboard
│   ├── css/
│   │   └── style.css              # Responsive, accessible stylesheet
│   └── js/
│       ├── api.js                 # Fetch API client
│       ├── app.js                 # Shared navbar & badge synchronization
│       ├── products.js            # Product catalog controller
│       ├── cart.js                # LocalStorage cart data manager
│       ├── cartUi.js              # Cart UI rendering & quantity adjustments
│       ├── checkout.js            # Checkout form & receipt renderer
│       └── sandbox.js             # Interactive testing sandbox controller
├── src/
│   ├── app.js                     # Express App Factory with static frontend serving
│   ├── server.js                  # Standalone HTTP server entrypoint
│   ├── domain/
│   │   ├── models.js              # Order, Customer, Item, Receipt domain models
│   │   └── errors.js              # Domain error hierarchy with HTTP status codes
│   ├── services/
│   │   ├── pricingService.js      # Unit-testable price & discount calculation
│   │   └── orderService.js        # Core checkout orchestrator & rollback engine
│   ├── controllers/
│   │   └── checkoutController.js  # REST API controller & status code mapper
│   ├── infrastructure/
│   │   ├── interfaces.js          # Subsystem interface contracts
│   │   ├── customerDatabase.js    # In-memory relational database adapter
│   │   ├── inventoryService.js    # Concurrency-safe inventory adapter (atomic locking)
│   │   ├── paymentGateway.js      # Production gateway adapter interface
│   │   └── emailNotifier.js       # Production email dispatcher adapter
│   ├── doubles/
│   │   ├── fakeCustomerDatabase.js# FAKE: Stateful in-memory store
│   │   ├── mockPaymentGateway.js  # MOCK: Call recorder & parameter verifier
│   │   ├── stubInventoryService.js# STUB: Pre-programmed stock responses
│   │   └── spyEmailNotifier.js    # SPY: Outbound message logger & asserter
│   └── sandbox/
│       ├── container.js           # DI Container assembling Layers 1, 2, 3
│       └── sandboxEngine.js       # Sandbox lifecycle and metadata introspection
├── tests/
│   ├── unit/                      # Week 2 & 3 Unit Tests (Pricing, Order, Validation, Doubles)
│   ├── integration/               # Week 6 Handshakes & Concurrency Race Condition Tests
│   ├── system/                    # Week 2 & 3 Supertest API Tests
│   ├── contract/                  # Subsystem Contract Tests (DB, Payment, Inventory, Email)
│   ├── pairwise/                  # Week 4 PICT Combinatorial Matrix Generator & Test
│   └── e2e/                       # Playwright End-to-End Browser UI Tests
├── performance/                   # Week 8 Load, Stress, and Soak Benchmark Engines
├── reports/                       # Academic Performance Reports & Metrics (JSON/CSV)
└── docs/                          # Dedicated Theoretical Markdown Docs for Weeks 1–8
```

---

## 3. Complete User Journey & Flow

```
[1] Home / Products (Browse Catalog)
         ↓
[2] Select Product (Check Live Stock Badges)
         ↓
[3] Add to Cart (Synchronize with localStorage)
         ↓
[4] View Cart (Modify Quantities & View Subtotals)
         ↓
[5] Proceed to Checkout (Select Customer, Promo Code & Card)
         ↓
[6] Backend 6-Step Handshake Pipeline:
    - Step 1: Customer Verification (CustomerDatabase)
    - Step 2: Atomic Inventory Reservation (InventoryService)
    - Step 3: Price, Discount & Tax Calculation (PricingService)
    - Step 4: Payment Authorization (PaymentGateway)
    - Step 5: Order Persistence (CustomerDatabase)
    - Step 6: Customer Confirmation Email (EmailNotifier)
         ↓
[7] UI Confirmation Receipt (Order ID, Txn ID, Total Paid)
    OR Error Banner (Declined / Out of Stock / Suspended)
```

---

## 4. Frontend UI Pages & Features

1. **`index.html` (Homepage):** Overview of the project and quick links to the store and sandbox.
2. **`products.html` (Products Catalog):** Grid of items (MacBook Pro, ANC Headphones, Gaming Keyboard, Rare Collectible, Out-of-Stock Smartwatch) displaying live stock and "Add to Cart" actions.
3. **`cart.html` (Shopping Cart):** Editable cart table supporting quantity increment/decrement, item removal, cart clearing, and live subtotal/tax estimation.
4. **`checkout.html` (Checkout Pipeline):** Form with customer profile selector, coupon code discounts (`SAVE10`, `SAVE20`, `FLAT5`), payment method simulator (`tok_visa_valid`, `tok_declined`), loading spinners, and detailed confirmation receipt cards.
5. **`sandbox.html` (Testing Sandbox Dashboard):** Interactive control room allowing real-time switching between Layer 1, 2, and 3, live double inspection, and simulated 2-buyer concurrency race condition testing.

---

## 5. Installation & Quickstart

```bash
# 1. Clone or navigate to the project directory
cd /path/to/qa-checkout-sandbox

# 2. Install dependencies (including Playwright)
npm install
npx playwright install chromium

# 3. Start the application
npm start
```
*Open **`http://localhost:3000`** in your browser to interact with the full web application.*

---

## 6. Running the Sandbox Engine

The Sandbox Engine allows running checkout operations across three configurable isolation layers:

```bash
# Layer 1: Fully Isolated (Uses purely doubled subsystems: Fake DB, Mock Payment, Stub Inventory, Spy Email)
npm run sandbox -- --layer=1

# Layer 2: Partially Integrated (Uses realistic in-memory database with relational indices)
npm run sandbox -- --layer=2

# Layer 3: Contract Verified (Uses production infrastructure adapters conforming to formal interfaces)
npm run sandbox -- --layer=3
```

---

## 7. Running the Automated Test Suite

| Command | Target Test Level | Description |
| :--- | :--- | :--- |
| `npm run lint` | Static Analysis | Runs ESLint v9+ flat config rules across backend and frontend code. |
| `npm run test:unit` | Unit Tests | Tests `pricingService`, `orderService`, `validation`, and domain errors in isolation. |
| `npm run test:integration` | Integration Tests | Verifies 6-step handshake sequences, rollback compensations, and concurrency race conditions. |
| `npm run test:system` | System / API Tests | End-to-end HTTP API tests against Express endpoints using Supertest. |
| `npm run test:contract` | Contract Tests | Verifies that all Test Doubles conform to identical interface contracts as production adapters. |
| `npm run test:pairwise` | Pairwise Testing | Executes PICT combinatorial generation with domain constraints (`Safari on Mac`) and runs Jest assertions. |
| `npm run test:e2e` | End-to-End UI Tests | Executes Playwright browser tests covering full checkout journeys and error handshakes. |
| `npm test` | Complete Test Suite | Executes all unit, integration, system, contract, and pairwise tests sequentially. |
| `npm run test:coverage` | Code Coverage | Runs full test suite and validates >=80% coverage across statements, branches, functions, and lines. |
| `npm run test:load` | Load Benchmark | Multi-stage load test (1, 10, 100, 250, 500 connections) with percentiles and Little's Law validation. |
| `npm run test:stress` | Stress Benchmark | High-concurrency saturation test to evaluate knee of the curve and recovery behavior. |
| `npm run test:soak` | Soak / Memory Test | Sustained endurance test with continuous RSS and heap memory sampling (`--duration=30m` or `--duration=10s`). |
| `npm run export:metrics` | Metrics Exporter | Exports performance timeseries and metrics to `reports/sample-metrics.json` and `.csv`. |

---

## 8. Testing Strategy by Week (Curriculum Alignment)

| Week | Testing Curriculum Topic | Implementation & Evidence in Project | Detailed Documentation |
| :---: | :--- | :--- | :--- |
| **Week 1** | **Testing Foundations & Business Risks** | Risk Analysis Table (9 risks + UI risks), Boehm's cost escalation curve, Requirements-to-Risk traceability matrix. | [`docs/week1-test-strategy.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week1-test-strategy.md) |
| **Week 2** | **Test Levels & The V-Model** | V-Model mapping across Unit, Integration, System, and End-to-End UI testing. | [`docs/week2-test-design.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week2-test-design.md) |
| **Week 3** | **Static Analysis & Automated Testing** | ESLint flat configuration for backend & frontend, automated Jest scripts, >=80% coverage threshold, memory leak case study. | [`docs/week3-static-analysis.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week3-static-analysis.md) |
| **Week 4** | **Pairwise / Combinatorial Testing** | PICT integration (`tests/pairwise/pairs.js`), Browser×OS×Plan×Theme factor model, Safari/Mac constraint (36 → 9 cases, 75% reduction). | [`docs/week4-pairwise-testing.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week4-pairwise-testing.md) |
| **Week 5** | **Test Doubles Taxonomy** | Gerard Meszaros taxonomy: Fake (`CustomerDatabase`), Mock (`PaymentGateway`), Stub (`InventoryService`), Spy (`EmailNotifier`). | [`docs/week5-test-doubles.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week5-test-doubles.md) |
| **Week 6** | **Integration & Handshake Testing** | 6 happy-path handshakes, 4 failure/rollback handshakes (customer miss, out-of-stock, payment decline, save crash), Mermaid sequence diagrams. | [`docs/week6-integration-testing.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week6-integration-testing.md) |
| **Week 7** | **CI/CD Pipelines & Quality Gates** | GitHub Actions workflow (`.github/workflows/ci.yml`) enforcing 9 quality gates from lint to coverage to Playwright E2E tests. | [`docs/week7-ci-cd.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week7-ci-cd.md) |
| **Week 8** | **Performance, Stress & Soak Testing** | Multi-stage load test, Little's Law ($L = \lambda \times W$), latency percentiles (p50/p95/p99), saturation knee, soak heap memory tracking. | [`docs/week8-performance-testing.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs/week8-performance-testing.md), [`reports/performance-report.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/reports/performance-report.md) |

---

## 9. Test Double Justification (Gerard Meszaros Taxonomy)

| Subsystem | Selected Double | Implementation Class | Why This Double Was Chosen |
| :--- | :---: | :--- | :--- |
| **Customer Database** | **FAKE** | `FakeCustomerDatabase` | Provides working in-memory persistence and query simulation without spinning up a real database server. |
| **Payment Gateway** | **MOCK** | `MockPaymentGateway` | Safety-critical component: requires behavior verification to assert that exact payment amounts and tokens are charged without live banking operations. |
| **Inventory Service** | **STUB** | `StubInventoryService` | Provides pre-programmed canned stock values (`in-stock`, `out-of-stock`, `low-stock`) to test conditional business branching deterministically. |
| **Email Notifier** | **SPY** | `SpyEmailNotifier` | Outbound side-effect: records every sent message to allow post-execution assertions verifying that *exactly one* confirmation email is dispatched. |

---

## 10. Test Pyramid & Sandbox Layers

```
                     / \
                    /   \
                   / E2E \         Playwright E2E UI Tests [Fast & Headless]
                  /───────\
                 / SYSTEM  \       System / API Tests (Supertest) [Fast, ~15 Tests]
                /───────────\
               / INTEGRATION \     Integration Handshakes & Race Conditions [~10 Tests]
              /───────────────\
             /    CONTRACT     \   Contract Interface Verification Tests [~10 Tests]
            /───────────────────\
           /     UNIT TESTS      \ Unit Tests (Pricing, Validation, Doubles) [~50 Tests]
          ─────────────────────────
```

---

## 11. Performance, Stress & Soak Testing Strategy

- **Little's Law Validation:** Validates $L = \lambda \times W$ across all load tiers.
- **Percentiles over Averages:** Reports p50, p95, and p99 to identify long-tail queueing delays that arithmetic means conceal.
- **Knee-of-the-Curve Analysis:** Identifies the saturation boundary (~150 concurrent connections) where throughput reaches maximum sustainable rate (~9,200 RPS).
- **Soak Testing Memory Health:** Samples Node.js heap memory (`process.memoryUsage()`) during prolonged execution to confirm healthy **sawtooth garbage collection behavior** rather than memory leak accumulation.

---

## 12. Concurrency & Race Condition Safety

In `tests/integration/concurrency.test.js` and the live Sandbox UI:
1. Two simultaneous checkout requests compete for the **final item in stock** (`stock = 1`).
2. The inventory service applies atomic mutex locking (`_withLock()`).
3. **Guaranteed Outcome:** Exactly one buyer receives HTTP 201 (`CONFIRMED`); the second buyer receives HTTP 400 (`OUT_OF_STOCK`).
4. **Consistency Check:** Remaining inventory is exactly `0` (never negative).

---

## 13. Known Limitations

1. **In-Memory Volatility:** In Layers 1 and 2, data is stored in V8 process memory and resets upon process termination (by design for clean testing).
2. **Single-Node Event Loop:** Node.js executes on a single event loop thread; multi-core hardware scaling requires clustering or multi-instance container orchestration.
3. **Live Payment / Email Adapters in Layer 3:** Layer 3 production adapters implement the required interface contracts, but do not make live external HTTP calls to third-party providers unless live API credentials are supplied in production environment variables.

---

## 14. Submission Checklist

- [x] Responsive Vanilla JavaScript frontend (HTML, CSS, JS with Fetch API)
- [x] Express REST API with dependency injection and static frontend serving
- [x] Full testing pyramid: Unit, Integration, System, Contract, Pairwise, Playwright E2E
- [x] Playwright E2E browser tests covering user journeys and error scenarios
- [x] Pairwise testing via `pict-node` with Safari/Mac constraint (75% combinatorial reduction)
- [x] Gerard Meszaros test doubles (Fake DB, Mock Payment, Stub Inventory, Spy Email)
- [x] 6-step handshake protocol with rollback and compensation refunds
- [x] Concurrency race condition prevention (2 buyers, 1 item)
- [x] CI/CD GitHub Actions workflow with 9 quality gates
- [x] Multi-stage performance, stress, and soak tests with Little's Law and memory tracking
- [x] ESLint passing with 0 errors / 0 warnings
- [x] Code coverage > 90% (exceeds 80% threshold)
- [x] Comprehensive theoretical documentation for Weeks 1–8 in [`docs/`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/docs)
- [x] 13-section academic performance report in [`reports/performance-report.md`](file:///home/victory-lydia/Documents/qa-checkout-sandbox/reports/performance-report.md)
- [x] 100% runnable locally and completely offline
