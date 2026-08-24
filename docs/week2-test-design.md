# Week 2 — Test Levels and Test Design: The V-Model

## 1. The V-Model in The QA Checkout Sandbox

The **V-Model (Verification and Validation Model)** maps each development phase directly to a corresponding testing level, ensuring rigorous quality assurance from high-level specifications down to granular code components.

```mermaid
graph TD
    subgraph Development (Verification)
        REQ["1. Requirements Analysis"]
        SYS_SPEC["2. System Architecture"]
        INT_SPEC["3. Subsystem Handshake Design"]
        MOD_SPEC["4. Module / Logic Implementation"]
    end

    subgraph Testing (Validation)
        UAT["Acceptance Testing (UAT)"]
        SYS_TEST["System Testing (Supertest API)"]
        INT_TEST["Integration Testing (Handshakes & Rollbacks)"]
        UNIT_TEST["Unit Testing (Pricing, Rules & Validation)"]
    end

    REQ <-->|Validates Business Needs| UAT
    SYS_SPEC <-->|Validates End-to-End Contracts| SYS_TEST
    INT_SPEC <-->|Validates Protocols & Rollbacks| INT_TEST
    MOD_SPEC <-->|Validates Algorithms & Boundary Logic| UNIT_TEST
```

---

## 2. Test Levels Implemented in the Sandbox

### Level A: Unit Testing
- **Focus:** Isolated functions, algorithms, input validation, and boundary conditions.
- **Components Tested:**
  - `PricingService.calculateTotal()`: Tests subtotal calculations, coupon codes (`SAVE10`, `SAVE20`, `FLAT5`, `FLAT15`), customer loyalty tier discounts (`PRO`, `VIP`), sales tax rates, zero-priced items, and monetary rounding.
  - `OrderService._validateCheckoutPayload()`: Enforces required fields, string trimming, non-negative prices, and integer quantities.
  - `OrderItem` / `Customer` domain models.
- **Key Characteristics:** Runs in milliseconds, zero I/O, zero network, 100% deterministic.

### Level B: Integration Testing
- **Focus:** The interfaces, handshakes, and communication protocols between two or more subsystems.
- **Handshakes Tested:**
  - `OrderService` ↔ `CustomerDatabase`: Customer existence and account status verification.
  - `OrderService` ↔ `InventoryService`: Atomic inventory reservation and rollback upon cancellation.
  - `OrderService` ↔ `PaymentGateway`: Accurate charge authorization and compensation refunds.
  - `OrderService` ↔ `EmailNotifier`: Single confirmation dispatch with exact order payloads.
- **Key Characteristics:** Uses fast in-memory Test Doubles (Fakes, Mocks, Stubs, Spies) to verify sequencing and state consistency under simulated failures.

### Level C: System Testing (End-to-End API)
- **Focus:** The complete assembled system as a black-box HTTP server.
- **Tooling:** Express + Supertest.
- **Scenarios Tested:**
  - `POST /api/checkout`: Valid checkout payload returns HTTP 201 Created with full order receipt.
  - `POST /api/checkout`: Malformed JSON or missing fields returns HTTP 400 Bad Request.
  - `POST /api/checkout`: Non-existent customer returns HTTP 404 Not Found.
  - `POST /api/checkout`: Out of stock returns HTTP 400 Bad Request (`OUT_OF_STOCK`).
  - `POST /api/checkout`: Card declined returns HTTP 402 Payment Required (`PAYMENT_DECLINED`).
  - `GET /api/orders/:orderId`: Verifies retrieval of created orders.
  - `GET /api/health`: Healthcheck endpoint for observability.
- **Key Characteristics:** Tests full HTTP request/response lifecycles, JSON serialization, headers, and status code mappings.

---

## 3. Feature-to-Test Level Traceability Table

| Feature / Business Requirement | Unit Testing (`tests/unit/`) | Integration Testing (`tests/integration/`) | System Testing (`tests/system/`) | Acceptance Criteria (Given-When-Then) |
| :--- | :--- | :--- | :--- | :--- |
| **Pricing & Taxes** | `pricingService.test.js`: Subtotal, discount calculations, tax rounding, boundary tests. | Handshake 3 verification in `handshake.test.js`. | `checkoutApi.test.js`: Validates final `total` on HTTP response payload. | **GIVEN** items totaling $100 and 8% tax, **WHEN** checkout runs, **THEN** total is exactly $108.00. |
| **Promotional Codes** | `pricingService.test.js`: `SAVE10`, `SAVE20`, `FLAT5`, coupon validation. | Handshake verification with applied discounts. | `checkoutApi.test.js`: Submitting discount code returns reduced total. | **GIVEN** coupon 'SAVE10', **WHEN** subtotal is $160, **THEN** discount is $16.00 and taxable total is $144.00. |
| **Customer Validation** | `validation.test.js`: Missing IDs, whitespace strings. | `handshake.test.js`: `CustomerNotFoundError`, `CustomerSuspendedError`. | `checkoutApi.test.js`: HTTP 404 on missing customer. | **GIVEN** an invalid customer ID, **WHEN** checkout is attempted, **THEN** abort immediately with 404 error. |
| **Inventory Reservation** | `doublesAndInfrastructure.test.js`: Stock queries and reservation decrements. | `handshake.test.js`: Out-of-stock abort; `concurrency.test.js`: Race condition protection. | `checkoutApi.test.js`: HTTP 400 with `OUT_OF_STOCK` code. | **GIVEN** 1 item in stock, **WHEN** 2 simultaneous buyers checkout, **THEN** exactly 1 succeeds and 1 fails. |
| **Payment Authorization** | Mock parameter assertion in `orderService.test.js`. | `handshake.test.js`: Declined card rolls back stock; persistence crash triggers refund. | `checkoutApi.test.js`: HTTP 402 on declined card. | **GIVEN** a declined payment token, **WHEN** payment is charged, **THEN** stock is restored and no email is sent. |
| **Order Confirmation Email** | `orderService.test.js`: Spy email assertion. | `handshake.test.js`: Exactly one email sent on success; 0 on failure. | Supertest response body contains `notification.status = 'SENT'`. | **GIVEN** a successful checkout, **WHEN** complete, **THEN** exactly one confirmation email is dispatched. |
