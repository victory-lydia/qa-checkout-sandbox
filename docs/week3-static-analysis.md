# Week 3 — Static Analysis and Automated Testing

## 1. Static Analysis Configuration (ESLint)

Static analysis analyzes source code without executing it. In this project, **ESLint v9+ (Flat Config)** is configured in `eslint.config.js` to enforce clean ES Modules coding standards, syntax validity, strict equality, and variable hygiene.

### Configured npm Scripts:
```bash
npm run lint         # Runs ESLint across the codebase
npm run lint:fix     # Automatically fixes fixable code style violations
npm test             # Runs the entire automated test suite (Jest with ESM)
npm run test:unit    # Runs Unit tests only
npm run test:integration # Runs Integration and Handshake tests
npm run test:system  # Runs System / Supertest API tests
npm run test:contract # Runs Subsystem Contract tests
npm run test:coverage # Runs Jest with code coverage threshold enforcement
```

---

## 2. Code Coverage Configuration (Jest)

Code coverage measures the proportion of source code executed by automated tests. In `jest.config.js`, a strict **80% global coverage threshold** is enforced across all four coverage dimensions:

```javascript
// jest.config.js
export default {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Coverage Dimensions Explained:
1. **Statement Coverage:** Percentage of executable statements that were executed.
2. **Branch Coverage:** Percentage of control structure branches (`if / else`, `switch`, ternary `?:`) that were evaluated in both true and false directions.
3. **Function Coverage:** Percentage of declared functions invoked during test execution.
4. **Line Coverage:** Percentage of executable source code lines reached.

---

## 3. Comparative Capability Matrix: Static vs. Dynamic vs. Non-Detectables

| Capability Category | Static Analysis (e.g., ESLint) | Automated Testing (e.g., Jest / Supertest) | What Neither Can Reliably Detect |
| :--- | :--- | :--- | :--- |
| **What it Can Detect** | • Syntax errors & invalid tokens.<br>• Unused variables & undeclared identifiers.<br>• Deprecated language constructs & `var` usage.<br>• Type coercion bugs (e.g., `==` vs `===`).<br>• Unreachable code after `return` statements.<br>• Basic security lint rules (e.g. `eval`). | • Functional logic errors & calculation bugs.<br>• Algorithmic boundary condition violations.<br>• Subsystem handshake & protocol failures.<br>• HTTP status code and response schema mismatches.<br>• Concurrency race conditions (when stimulated).<br>• Error handling & rollback logic execution. | • Misalignment with actual user business intent (e.g., customer wanted 15% discount but requirement specified 10%).<br>• Subtle race conditions that only manifest under specific production thread scheduling or hardware latencies.<br>• Production network partitions or cloud provider outages.<br>• Memory leaks that accumulate gradually under sustained multi-hour production loads. |

---

## 4. Why Static Analysis Cannot Catch Memory Leaks Under Sustained Load

Static analysis inspects lexical syntax structures, but cannot reason about the lifetime of dynamically allocated objects under unbounded runtime load.

### Case Study: An Unbounded Event Listener / Cache Memory Leak

Consider the following syntactically valid JavaScript code:

```javascript
// A global in-memory request tracker
const requestTelemetryCache = [];

export function recordCheckoutTelemetry(order) {
  // Syntactically valid! ESLint passes with 0 errors.
  requestTelemetryCache.push({
    orderId: order.id,
    timestamp: Date.now(),
    payload: order, // Holds a permanent reference to the entire object graph
  });
}
```

### Why Static Analysis Misses This:
1. **Valid Syntax:** `requestTelemetryCache.push(...)` is perfectly valid JavaScript.
2. **No Scope Violation:** `requestTelemetryCache` is declared and referenced properly.
3. **No Unused Code:** The function is exported and called as expected.

### Why Unit Tests Miss This:
In a typical unit test, `recordCheckoutTelemetry()` is invoked 1 or 2 times. The array holds 2 objects (~1 KB of memory), and the test suite terminates in 50 milliseconds. The leak is invisible.

### What Actually Happens Under Sustained Load:
Under a 30-minute soak test at 5,000 requests/minute, the array accumulates 150,000 objects. Because each entry holds references to customer and item graphs, the V8 garbage collector cannot free the memory. The heap baseline rises monotonically until the Node.js process crashes with `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`.

This is why **Week 8 Soak Testing** and memory sampling over time are essential complements to static analysis and unit testing.
