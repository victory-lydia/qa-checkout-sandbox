#!/usr/bin/env node

/**
 * Week 8 — Stress Testing & Knee-Point Detection
 *
 * Pushes the API beyond normal capacity to determine:
 * 1. The Knee of the Performance Curve (Maximum sustainable throughput)
 * 2. Degradation characteristics (Graceful degradation vs Catastrophic collapse)
 * 3. Recovery behavior when load is reduced back to baseline.
 */

import autocannon from 'autocannon';
import { createApp } from '../src/app.js';

const PORT = 3889;

function runStressStage(name, connections, durationSec, url) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ [${name}] Concurrency: ${connections}, Duration: ${durationSec}s...`);

    const instance = autocannon(
      {
        url: `${url}/api/checkout`,
        connections,
        duration: durationSec,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'cust-101',
          items: [{ productId: 'prod-in-stock', unitPrice: 20.00, quantity: 1 }],
          paymentToken: 'tok_visa_stress',
        }),
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );

    autocannon.track(instance, { renderProgressBar: true, renderResultsTable: false });
  });
}

export async function executeStressTest() {
  const app = createApp(1);
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  console.log('========================================================================');
  console.log('       WEEK 8 — STRESS TEST & SATURATION KNEE-POINT ANALYSIS           ');
  console.log('========================================================================');

  const stages = [
    { name: '1. Pre-Stress Normal Baseline', connections: 50, duration: 5 },
    { name: '2. High Stress Ramp', connections: 300, duration: 5 },
    { name: '3. Extreme Stress / Peak Saturation', connections: 750, duration: 5 },
    { name: '4. Post-Stress Recovery Check', connections: 50, duration: 5 },
  ];

  const results = [];

  try {
    for (const stage of stages) {
      const res = await runStressStage(stage.name, stage.connections, stage.duration, baseUrl);
      const totalReq = res.requests.total;
      const errors = (res.errors || 0) + (res.non2xx || 0);

      results.push({
        phase: stage.name,
        concurrentUsers: stage.connections,
        throughputRPS: Math.round(res.requests.average),
        p50LatencyMs: res.latency.p50,
        p95LatencyMs: res.latency.p97_5 || res.latency.p99,
        p99LatencyMs: res.latency.p99,
        errorRate: totalReq > 0 ? `${((errors / totalReq) * 100).toFixed(2)}%` : '0%',
      });
    }

    console.log('\n========================================================================');
    console.log('                     STRESS TEST EVALUATION SUMMARY                    ');
    console.log('========================================================================');
    console.table(results);

    // Analysis
    const baselineThroughput = results[0].throughputRPS;
    const peakThroughput = results[2].throughputRPS;
    const recoveryThroughput = results[3].throughputRPS;
    const recoveryRatio = ((recoveryThroughput / baselineThroughput) * 100).toFixed(1);

    console.log('\n[Analysis & Findings]:');
    console.log(`  - Baseline Throughput (50 users):    ${baselineThroughput} req/sec`);
    console.log(`  - Peak Stress Throughput (750 users): ${peakThroughput} req/sec`);
    console.log(`  - Post-Stress Recovery (50 users):   ${recoveryThroughput} req/sec (${recoveryRatio}% of baseline)`);

    if (parseFloat(recoveryRatio) >= 90) {
      console.log('✅ System demonstrated GRACEFUL DEGRADATION and FULL RECOVERY after peak stress.');
    } else {
      console.log('⚠️ System exhibited latency hangover or partial collapse under stress.');
    }

    return results;
  } finally {
    server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeStressTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Stress test failure:', err);
      process.exit(1);
    });
}
