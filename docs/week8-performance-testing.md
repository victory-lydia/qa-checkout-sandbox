# Week 8 — Performance, Load, Stress & Soak Testing

## 1. Core Performance Engineering Concepts

Performance testing measures how a system behaves under operational workloads, identifying capacity limits, latency bottlenecks, and stability risks.

### The Three Fundamental Metrics:
1. **Latency ($W$):** The time elapsed between sending a request and receiving the complete response (measured in milliseconds).
2. **Throughput ($\lambda$):** The rate at which the system successfully processes requests per unit of time (measured in Requests Per Second / RPS).
3. **Concurrency ($L$):** The number of requests in flight or concurrent users actively interacting with the system simultaneously.

---

## 2. Little's Law in Performance Engineering

**Little's Law** is a foundational theorem in queueing theory that establishes the mathematical relationship between Concurrency, Throughput, and Latency:

$$L = \lambda \times W$$

Where:
- $L$ = Average number of concurrent requests in the system (Concurrency)
- $\lambda$ = Average arrival and departure rate (Throughput in req/sec)
- $W$ = Average response time (Latency in seconds)

### Practical Application:
If the checkout API achieves a throughput of $\lambda = 5,000\text{ req/sec}$ with an average latency of $W = 0.020\text{ seconds}$ (20 ms):
$$L = 5000 \times 0.020 = 100\text{ concurrent requests in flight}$$

If throughput plateaus at $5,000\text{ req/sec}$ and concurrency increases to $L = 500$, then latency $W$ *must* mathematically increase to:
$$W = \frac{L}{\lambda} = \frac{500}{5000} = 0.100\text{ seconds (100 ms)}$$

---

## 3. Why Averages Lie: The Necessity of Percentiles (p50, p95, p99)

Arithmetic average (mean) latency is often misleading in distributed systems because request response times follow a **heavy-tailed / skewed distribution** rather than a Gaussian bell curve.

```
Request Count
    ▲
    │   ● p50 (Median)
    │  ╱ ╲
    │ ╱   ╲
    │╱     ╲              ● p95 (95th percentile)
    │       ╲            ╱
    │        ╲──────────● p99 (Long-Tail Outliers)
    └──────────────────────────────────────────────────────────► Latency (ms)
       2 ms      5 ms     25 ms                     150 ms
```

### Percentile Definitions:
- **p50 (Median):** 50% of requests are faster than this value. Represents the typical user experience.
- **p95 (95th Percentile):** 95% of requests are faster than this value. Identifies the onset of queueing delays.
- **p99 (99th Percentile / Tail Latency):** 1 in 100 requests experience this latency or worse. In e-commerce, high-spending VIP customers with large carts often encounter p99 tail latencies due to larger database scans and multi-item locking.

---

## 4. The Performance Curve: Knee Point & Saturation

When load is increased from 1 user to extreme stress levels, the system transitions through three distinct operational phases:

```
Throughput (RPS)
    ▲
Max │                    ┌──────────────────┐ (Saturation Plateau)
RPS │                   ╱│                  │
    │                  ╱ │                  │
    │  (Linear Phase) ╱  │                  │  (Catastrophic Collapse)
    │                ╱   │                  └──────────┐
    │               ╱    │                             │
    │              ●     │                             │
    │        (Knee Point)│                             ▼
  0 └────────────────────┴─────────────────────────────────────────► Concurrency (Users)
              Light    Expected        Beyond Expected       Extreme Stress
```

1. **Linear Scalable Phase:** Throughput increases proportionally with concurrency while latency remains flat.
2. **The Knee of the Curve (Saturation Point):** The concurrency level where throughput reaches its peak maximum ($\text{RPS}_{\max}$) and queueing begins.
3. **Queueing & Latency Explosion Phase:** Throughput plateaus; additional concurrency causes requests to wait in Node.js event loop queues, driving latency upwards exponentially.
4. **Graceful Degradation vs. Catastrophic Collapse:**
   - *Graceful Degradation:* The system caps throughput and serves requests with higher latency or returns HTTP 429/503 rate limits without crashing.
   - *Catastrophic Collapse:* Memory leaks, thread starvation, or unbounded promise queues crash the process.

---

## 5. Soak Testing & Memory Health (Sawtooth vs. Leak)

A **Soak Test** runs a steady, sustained load over extended durations (e.g., 30 minutes to 24 hours) to verify memory stability.

### Healthy Memory Profile (Sawtooth Pattern):
As allocations occur, heap memory rises. When the V8 Garbage Collector (GC) executes Mark-Sweep-Compact cycles, heap memory drops back to a **stable baseline**.

```
Heap Memory (MB)
    ▲
 50 │       /\        /\        /\        /\
 40 │      /  \      /  \      /  \      /  \
 30 │     /    \    /    \    /    \    /    \
 20 │────/──────\──/──────\──/──────\──/──────\── (Stable Baseline ~20MB)
    └─────────────────────────────────────────────────────────────► Time (Hours)
```

### Memory Leak Profile (Monotonically Rising Baseline):
When objects remain reachable through global caches, unremoved event listeners, or unclosed streams, GC cannot free them. The baseline rises continuously until OOM crash.

```
Heap Memory (MB)
    ▲                                                     ● Process OOM Crash
150 │                                              ▲     ╱
100 │                                    /\       ╱ ╲   ╱
 75 │                          /\       /  \     ╱   ╲ ╱
 50 │                /\       /  \     /    \   ╱     ●
 25 │      /\       /  \     /    \   /      \ ╱
 10 │─────/──\─────/────\───/──────\─/────────● (Rising Baseline!)
    └─────────────────────────────────────────────────────────────► Time (Hours)
```
