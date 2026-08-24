# Week 1 — Software Testing Foundations & Test Strategy

## 1. System Overview

**The QA Checkout Sandbox** is an e-commerce order processing and checkout orchestration engine. Its core responsibility is executing transactions reliably by coordinating four distinct subsystems:

1. **Customer Database (`CustomerDatabase`):** Identity verification, account status validation, and order persistence.
2. **Inventory Management (`InventoryService`):** Stock level verification, atomic reservation, and rollback on failure.
3. **Payment Gateway (`PaymentGateway`):** Secure credit card authorization, charge settlement, and compensation refunds.
4. **Email Notification Service (`EmailNotifier`):** Post-checkout order confirmation dispatching.

```
Customer Request (POST /api/checkout)
   │
   ▼
[1] Validate Payload (Schema, Types, Quantities)
   │
   ▼
[2] Customer Verification ──(Miss/Suspended)──► [404/403 Error & Abort]
   │ (Active Customer)
   ▼
[3] Inventory Reservation ──(Insufficient)───► [400 OutOfStock & Abort]
   │ (Stock Locked)
   ▼
[4] Price Calculation (Discounts, Loyalty, Taxes)
   │
   ▼
[5] Payment Authorization ──(Declined/Error)──► [Release Stock & 402 Error]
   │ (Payment Approved)
   ▼
[6] Order Persistence ──────(Database Crash)─► [Refund Payment, Release Stock & 500 Error]
   │ (Order Saved)
   ▼
[7] Confirmation Email (Dispatch Notification)
   │
   ▼
Return HTTP 201 (Order Confirmation Receipt)
```

---

## 2. Why Testing is Necessary

In e-commerce checkout systems, software defects directly cause monetary loss, legal liabilities, inventory corruption, and customer churn. Software testing provides:
- **Correctness Verification:** Ensuring pricing, taxes, discounts, and currency conversions are exact to the cent.
- **Data Integrity & Consistency:** Preventing "phantom orders" where payment is taken but no order is saved, or "overselling" where out-of-stock inventory is promised to multiple concurrent buyers.
- **Fault Tolerance & Rollback Proofing:** Proving that downstream failure (such as payment decline or database crash) cleanly rolls back reserved inventory and refunds authorizations.
- **Regression Protection:** Ensuring new features (such as promo codes) do not break existing checkout flows.

---

## 3. Business Risk Analysis Table

Risks are assessed using **Severity** (1–5, where 5 is Catastrophic) and **Likelihood** (1–5, where 5 is Frequent), yielding **Risk Exposure** ($R = S \times L$).

| Risk ID | Risk Description | Severity (S) | Likelihood (L) | Exposure ($S \times L$) | Mitigation Strategy | Target Test Level |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **R-01** | **Incorrect Pricing / Discount drift** | 5 | 3 | **15** | Precision cents arithmetic, boundary testing for discounts/taxes. | Unit (`pricingService.test.js`) |
| **R-02** | **Customer Not Found / Invalid Account** | 3 | 4 | **12** | Explicit customer lookup and active status validation before inventory locks. | Integration (`handshake.test.js`), System (`checkoutApi.test.js`) |
| **R-03** | **Out-of-Stock Product Sold (Overselling)** | 5 | 4 | **20** | Atomic check-and-decrement mutex locks; concurrency race tests. | Integration (`concurrency.test.js`), Unit (`orderService.test.js`) |
| **R-04** | **Incorrect Payment Amount Charged** | 5 | 2 | **10** | Mock payment parameter verification to ensure exact calculated total is charged. | Unit (`orderService.test.js`), Contract (`paymentGateway.contract.test.js`) |
| **R-05** | **Payment Declined unhandled** | 4 | 4 | **16** | Catch payment errors, release reserved inventory, prevent order creation and emails. | Integration (`handshake.test.js`) |
| **R-06** | **Order Not Saved (Paid but not recorded)** | 5 | 2 | **10** | Catch persistence failures, trigger compensation refund, release inventory. | Integration (`handshake.test.js`) |
| **R-07** | **Duplicate Order / Double Charge** | 5 | 3 | **15** | Unique order IDs, idempotent charge requests, atomic transaction state. | Integration (`handshake.test.js`), System (`checkoutApi.test.js`) |
| **R-08** | **Confirmation Email Not Sent** | 2 | 3 | **6** | Non-blocking retry logging; order remains confirmed even if email provider blips. | Unit (`orderService.test.js`) |
| **R-09** | **Confirmation Email Sent > 1 Time** | 2 | 2 | **4** | Spy verification asserting exactly one notification invocation per order. | Unit (`orderService.test.js`), Integration (`handshake.test.js`) |

---

## 4. Test Objectives

The test suite is designed to accomplish four primary objectives:

1. **Verify Functional Correctness (100% Deterministic):** Every business rule (coupons, loyalty tiers, tax calculations, required payload validation) behaves accurately across positive and negative equivalence partitions.
2. **Validate Subsystem Handshakes & Rollbacks:** Integration tests verify that the order of subsystem interaction is respected, and that any failure triggers immediate compensation rollbacks.
3. **Prevent Concurrency Race Conditions:** Prove that simultaneous requests for scarce inventory never oversell.
4. **Establish CI/CD Quality Gates:** Enforce linting, unit, integration, system, contract tests, and a minimum 80% coverage threshold before deployment.

---

## 5. The Cost of Fixing Defects: Early vs. Late (Boehm's Law)

Software engineering research by Barry Boehm and NIST demonstrates that the cost of detecting and fixing a software defect increases **exponentially** throughout the Software Development Life Cycle (SDLC).

```
Relative Cost
to Fix Defect
    ▲
100x│                                              ● Production ($10,000+)
    │                                            ╱
 50x│                                          ╱
    │                                   ● System Testing ($1,500)
 15x│                             ● Integration ($500)
  5x│                      ● Unit Testing ($100)
  1x│  ● Requirements ($10)
    └─────────────────────────────────────────────────────────────► SDLC Stage
        Reqs/Design       Unit Tests     Integration     System / CI      Production
```

### Cost Multiplier Breakdown:
- **Unit / Design Stage ($1\times$):** A pricing rounding bug caught in `pricingService.test.js` takes 5 minutes to fix with zero downstream impact.
- **Integration Stage ($5\times - 15\times$):** A failure to release reserved inventory on payment decline requires updating the handshake sequence in `orderService.js`.
- **System / CI Stage ($20\times - 50\times$):** A missing HTTP header or bad status code blocks deployment pipelines and requires triage by QA engineers.
- **Production Stage ($100\times - 200\times+$):** An overselling bug in production leads to customer chargebacks, support tickets, inventory audits, brand damage, and potential legal fees.

---

## 6. Requirements-to-Risk Traceability Matrix

| Requirement | Business Goal | Associated Risks | Test Coverage |
| :--- | :--- | :--- | :--- |
| **REQ-01** | Exact pricing, coupon discounts, sales tax calculations. | R-01, R-04 | `tests/unit/pricingService.test.js` |
| **REQ-02** | Customer authentication & status verification. | R-02 | `tests/unit/orderService.test.js`, `tests/system/checkoutApi.test.js` |
| **REQ-03** | Real-time stock checks & atomic reservation. | R-03 | `tests/integration/concurrency.test.js`, `tests/integration/handshake.test.js` |
| **REQ-04** | Payment authorization & decline handling. | R-04, R-05 | `tests/integration/handshake.test.js`, `tests/contract/paymentGateway.contract.test.js` |
| **REQ-05** | Order persistence & compensation refunding. | R-06, R-07 | `tests/integration/handshake.test.js`, `tests/contract/customerDatabase.contract.test.js` |
| **REQ-06** | Exactly-one confirmation email dispatch. | R-08, R-09 | `tests/unit/orderService.test.js`, `tests/doubles/spyEmailNotifier.js` |
