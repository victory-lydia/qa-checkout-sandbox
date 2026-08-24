# Week 6 — Integration & Handshake Testing

## 1. Handshake Testing Concept

In distributed systems and microservice architectures, **Integration Handshake Testing** verifies that two or more interacting subsystems communicate according to predefined sequential protocols, and that failure at any point in the protocol leaves the system in a consistent, non-corrupted state.

---

## 2. Happy Path Handshake Sequence Diagram

When a customer executes a valid checkout request, all 6 subsystems execute in strict linear sequence:

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant OS as OrderService
    participant CD as CustomerDatabase
    participant IS as InventoryService
    participant PS as PricingService
    participant PG as PaymentGateway
    participant EN as EmailNotifier

    Customer->>OS: POST /api/checkout (Payload)
    Note over OS: Step 0: Validate Input Schema

    OS->>CD: Handshake 1: findById(customerId)
    CD-->>OS: Active Customer Record

    OS->>IS: Handshake 2: reserveStock(productId, qty)
    IS-->>OS: Reservation Confirmed (Stock Decremented)

    OS->>PS: Handshake 3: calculateTotal(items, coupons, tier)
    PS-->>OS: Pricing Breakdown (Subtotal, Tax, Total)

    OS->>PG: Handshake 4: charge(amount, token, orderId)
    PG-->>OS: PaymentReceipt (SUCCESS, txnId)

    OS->>CD: Handshake 5: saveOrder(order)
    CD-->>OS: Order Persisted (CONFIRMED)

    OS->>EN: Handshake 6: sendOrderConfirmation(email, orderId, total)
    EN-->>OS: Email Dispatched (Message ID)

    OS-->>Customer: HTTP 201 Created (Order Receipt)
```

---

## 3. Failure Handshakes & Rollback Compensation

The integration test suite (`tests/integration/handshake.test.js`) validates four critical failure boundaries:

### Failure Handshake 1: Customer Database Miss
- **Scenario:** Customer ID does not exist in `CustomerDatabase`.
- **System Action:** Throws `CustomerNotFoundError` immediately at Step 1.
- **State Consistency Check:**
  - Zero inventory reserved.
  - Zero payment charges attempted.
  - Zero orders saved.
  - Zero confirmation emails sent.

```mermaid
sequenceDiagram
    participant OS as OrderService
    participant CD as CustomerDatabase
    participant IS as InventoryService
    participant PG as PaymentGateway

    OS->>CD: findById("cust-unknown")
    CD-->>OS: null (Not Found)
    Note over OS: Abort Pipeline with 404
    Note right of IS: Inventory NOT touched
    Note right of PG: Payment NOT charged
```

---

### Failure Handshake 2: Out-of-Stock Product
- **Scenario:** Product requested has insufficient stock in `InventoryService`.
- **System Action:** Throws `OutOfStockError` at Step 2; releases any partially reserved items.
- **State Consistency Check:**
  - Inventory remains intact.
  - No payment authorization attempted.
  - No database write or email dispatch.

---

### Failure Handshake 3: Declined Payment & Inventory Rollback
- **Scenario:** `PaymentGateway` returns `DECLINED` or card error at Step 4.
- **System Action:** Catches payment failure, triggers rollback to `InventoryService.releaseStock()`, and re-throws `PaymentDeclinedError`.
- **State Consistency Check:**
  - Reserved stock is restored to pre-transaction level.
  - Order is **NOT** marked as confirmed or saved.
  - Confirmation email is **NEVER** sent.

```mermaid
sequenceDiagram
    participant OS as OrderService
    participant IS as InventoryService
    participant PG as PaymentGateway
    participant EN as EmailNotifier

    OS->>IS: reserveStock("prod-camera", 2)
    IS-->>OS: Reserved (Stock: 5 -> 3)
    OS->>PG: charge(amount, "tok_declined")
    PG-->>OS: Error: Card Declined
    Note over OS: Trigger Rollback Compensation
    OS->>IS: releaseStock("prod-camera", 2)
    IS-->>OS: Stock Restored (Stock: 3 -> 5)
    Note right of EN: No Email Dispatched
```

---

### Failure Handshake 4: Database Save Failure & Payment Refund Compensation
- **Scenario:** Payment succeeds at Step 4, but `CustomerDatabase.saveOrder()` crashes at Step 5.
- **System Action:** SUT issues automatic **Compensation Refund** to `PaymentGateway.refund()` and releases reserved inventory.
- **State Consistency Check:**
  - Customer is not billed for an unsaved order.
  - Stock is restored.
  - Error is propagated to caller as HTTP 500 (`PersistenceError`).

```mermaid
sequenceDiagram
    participant OS as OrderService
    participant IS as InventoryService
    participant PG as PaymentGateway
    participant CD as CustomerDatabase

    OS->>PG: charge($216.00)
    PG-->>OS: Success (txn_123)
    OS->>CD: saveOrder(order)
    CD-->>OS: CRASH: Disk I/O Write Failure
    Note over OS: Trigger Dual Compensation
    OS->>PG: refund(txn_123, $216.00)
    PG-->>OS: Refund Confirmed
    OS->>IS: releaseStock("prod-watch", 1)
    IS-->>OS: Stock Restored
```
