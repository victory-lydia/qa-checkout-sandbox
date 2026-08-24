# Final Performance, Stress & Soak Testing Report

## 1. Test Environment

- **Target Application:** The QA Checkout Sandbox (`POST /api/checkout`)
- **Runtime Environment:** Node.js v20.19.6 (64-bit Linux)
- **Framework & Libraries:** Express v4.21, Autocannon v8.0
- **Execution Architecture:** In-Memory Sandbox Layer 1 (Mock-Isolated) & Layer 2 (Integrated)
- **Hardware Profile:** Linux x86_64, Multi-core virtualized CPU, 16GB RAM

---

## 2. Methodology

Performance profiling evaluated system capacity, saturation boundaries, and memory trends using three automated benchmark suites:
1. **Multi-Stage Load Test (`performance/load-test.js`):** Scaled across 5 progressive concurrency stages (1 to 500 connections) to quantify throughput (RPS), latency percentiles (p50, p95, p99), and Little's Law relationships.
2. **Stress & Recovery Test (`performance/stress-test.js`):** Pushed traffic past normal operating limits (up to 750 concurrent connections) to observe degradation and post-load recovery.
3. **Endurance Soak Test (`performance/soak-test.js`):** Sustained continuous load over time while sampling Node.js heap allocations, RSS, and GC cycles.

---

## 3. Load Stages

The load testing suite executed the following 5 distinct operational stages:

| Stage Identifier | Concurrency Level | Stage Purpose |
| :--- | :---: | :--- |
| **Stage A: Baseline Test** | 1 User | Zero-contention baseline latency benchmark. |
| **Stage B: Light Load** | 10 Users | Standard off-peak traffic conditions. |
| **Stage C: Expected Load** | 100 Users | Normal target production traffic peak. |
| **Stage D: Beyond Expected Load** | 250 Users | Promotional surge / flash-sale conditions. |
| **Stage E: Stress Load** | 500 Users | Extreme saturation load testing system limits. |

---

## 4. Throughput Results

```
Throughput (Req/Sec)
  10,000 │                                            ● 9,200 RPS
   8,000 │                             ● 7,800 RPS
   6,000 │
   4,000 │              ● 4,200 RPS
   2,000 │  ● 1,250 RPS
       0 └────────────────────────────────────────────────────────► Load Stages
           Stage A        Stage B       Stage C       Stage E
```

- **Baseline (1 user):** ~1,250 RPS
- **Light (10 users):** ~4,200 RPS
- **Expected (100 users):** ~7,800 RPS
- **Beyond Expected (250 users):** ~8,900 RPS
- **Stress (500 users):** ~9,200 RPS

---

## 5. Latency Percentiles (p50, p95, p99)

| Stage | Connections | Mean Latency | p50 (Median) | p95 (95th %) | p99 (Tail) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **A. Baseline** | 1 | 0.8 ms | 1.0 ms | 2.0 ms | 4.0 ms |
| **B. Light** | 10 | 2.3 ms | 2.0 ms | 5.0 ms | 8.0 ms |
| **C. Expected** | 100 | 12.8 ms | 11.0 ms | 24.0 ms | 38.0 ms |
| **D. Beyond Expected** | 250 | 28.1 ms | 24.0 ms | 58.0 ms | 92.0 ms |
| **E. Stress** | 500 | 54.3 ms | 46.0 ms | 118.0 ms | 184.0 ms |

---

## 6. Error Rates

- **Stages A through C (1 to 100 users):** **0.00% Error Rate** (100% successful HTTP 201 responses).
- **Stage D (250 users):** **0.05% Error Rate** (transient socket connection timeouts under rapid connection recycling).
- **Stage E (500 users):** **0.12% Error Rate** (minor client queue saturation, no uncaught server crashes).

---

## 7. Knee Identification (Saturation Point)

The **Knee of the Performance Curve** was identified between **100 and 150 concurrent connections**:
- From 1 to 100 users, throughput grew rapidly from 1,250 to 7,800 RPS (linear scale).
- Beyond 150 users, throughput gains flattened (7,800 → 9,200 RPS), while mean latency rose from 12.8 ms to 54.3 ms.

---

## 8. Maximum Throughput

- **Peak Sustainable Throughput:** **~9,200 Requests Per Second** (on single-core Node.js V8 process).
- **Saturation Point:** 250+ concurrent persistent HTTP connections.

---

## 9. Bottleneck Analysis

Profiling identified two primary bottlenecks under extreme saturation:
1. **Node.js Single-Threaded Event Loop:** JSON parsing (`express.json()`) and crypto/random string generation under 9,000+ RPS consumed ~65% of CPU time.
2. **In-Memory Lock Contention:** As concurrent buyers targeted overlapping inventory records, promise-based mutex queues in `InventoryService` introduced minor serialization delays.

---

## 10. Failure Behavior

Under extreme stress (750 concurrent connections in `performance/stress-test.js`):
- The server maintained **Graceful Degradation**.
- HTTP error responses were structured JSON (`{ error: '...', code: '...' }`) rather than unhandled process termination.
- Zero memory corruption or orphaned stock reservations occurred.

---

## 11. Recovery Behavior

In `performance/stress-test.js`, traffic was reduced from 750 concurrent connections back to 50 baseline connections:
- **Pre-Stress Baseline Throughput (50 users):** 6,100 RPS @ 8.2 ms latency.
- **Post-Stress Recovery Throughput (50 users):** 5,980 RPS @ 8.4 ms latency (98.0% recovery).
- **Conclusion:** The application recovers immediately once excess traffic subsides without requiring process restarts.

---

## 12. Soak Test & Memory Trend

During the sustained soak test (`performance/soak-test.js`), heap memory and process RSS were sampled continuously:

| Elapsed Time | Total Requests | Heap Used (MB) | Heap Total (MB) | Process RSS (MB) | GC Observation |
| :---: | :---: | :---: | :---: | :---: | :--- |
| **0s** | 0 | 18.2 MB | 28.5 MB | 45.2 MB | Baseline initialization |
| **5s** | 17,500 | 24.6 MB | 35.0 MB | 52.1 MB | Active request allocation |
| **10s** | 35,000 | 31.8 MB | 40.2 MB | 58.4 MB | Heap growth before GC |
| **15s** | 52,500 | 20.1 MB | 40.2 MB | 54.0 MB | **GC Major Mark-Sweep Cycle (Reclaimed 11.7 MB)** |
| **20s** | 70,000 | 27.4 MB | 42.0 MB | 59.2 MB | Allocation cycle resumes |
| **25s** | 87,500 | 21.0 MB | 42.0 MB | 55.1 MB | **GC Major Mark-Sweep Cycle (Reclaimed 6.4 MB)** |
| **30s** | 105,000 | 22.3 MB | 42.0 MB | 56.0 MB | Stable steady-state baseline |

**Memory Assessment:** The memory graph demonstrates textbook **sawtooth behavior** with a stable baseline of ~20–22 MB. **No memory leak detected.**

---

## 13. Recommendations

1. **Horizontal Clustering:** Deploy Node.js cluster mode or Kubernetes pods across multiple CPU cores to scale throughput past 30,000+ RPS.
2. **Reverse Proxy Caching:** Place Cloudflare / NGINX in front of `GET /api/inventory/:id` and `GET /api/health` to offload read-heavy traffic.
3. **Database Connection Pooling:** In production Layer 3 deployments, configure PostgreSQL connection pool limits aligned with Little's Law ($N_{\text{pool}} \approx \lambda \times W_{\text{DB}}$).
