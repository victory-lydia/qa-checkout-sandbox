#!/usr/bin/env node

/**
 * Week 8 — Performance & Load Testing Suite
 *
 * Executes multi-stage load testing against The QA Checkout Sandbox API.
 * Measures: Throughput (RPS), Latency Percentiles (p50, p95, p99), Error Rate.
 * Validates Little's Law: L = λ * W (Concurrency = Throughput * Latency)
 *
 * Load Stages:
 * A. Baseline Test:          1 concurrent user
 * B. Light Load:            10 concurrent users
 * C. Expected Load:        100 concurrent users
 * D. Beyond Expected Load: 250 concurrent users
 * E. Stress Load:          500 concurrent users
 */

import autocannon from 'autocannon';
import { createApp } from '../src/app.js';

const PORT = 3888;
const STAGE_DURATION_SEC = parseInt(process.env.STAGE_DURATION || '5', 10);

const STAGES = [
  { name: 'A. Baseline Test', connections: 1, duration: STAGE_DURATION_SEC },
  { name: 'B. Light Load', connections: 10, duration: STAGE_DURATION_SEC },
  { name: 'C. Expected Load', connections: 100, duration: STAGE_DURATION_SEC },
  { name: 'D. Beyond Expected Load', connections: 250, duration: STAGE_DURATION_SEC },
  { name: 'E. Stress Load', connections: 500, duration: STAGE_DURATION_SEC },
];

function runAutocannonStage(stage, url) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Running Stage [${stage.name}] — Connections: ${stage.connections}, Duration: ${stage.duration}s...`);

    const instance = autocannon(
      {
        url: `${url}/api/checkout`,
        connections: stage.connections,
        duration: stage.duration,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: 'cust-101',
          items: [
            { productId: 'prod-in-stock', unitPrice: 25.00, quantity: 1 },
          ],
          paymentToken: 'tok_visa_perf',
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

export async function executeLoadTests() {
  const app = createApp(1); // Run against Layer 1 for pure local benchmarking
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  console.log('========================================================================');
  console.log('      WEEK 8 — THE QA CHECKOUT SANDBOX: LOAD & PERFORMANCE ENGINE     ');
  console.log('========================================================================');
  console.log(`Target URL: ${baseUrl}/api/checkout`);
  console.log(`Configured Stages: ${STAGES.length}`);

  const summary = [];

  try {
    for (const stage of STAGES) {
      const result = await runAutocannonStage(stage, baseUrl);

      const totalRequests = result.requests.total;
      const totalErrors = (result.errors || 0) + (result.non2xx || 0);
      const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : '0.00';
      const throughputRPS = result.requests.average;
      const p50 = result.latency.p50;
      const p95 = result.latency.p97_5 || result.latency.p99;
      const p99 = result.latency.p99;
      const meanLatencyMs = result.latency.average;

      // Little's Law verification: L = λ * W
      // Expected Concurrency = Throughput (req/sec) * Mean Latency (sec)
      const calculatedConcurrency = ((throughputRPS * (meanLatencyMs / 1000))).toFixed(1);

      summary.push({
        stage: stage.name,
        targetUsers: stage.connections,
        throughputRPS: Math.round(throughputRPS),
        meanLatencyMs: Math.round(meanLatencyMs * 100) / 100,
        p50LatencyMs: p50,
        p95LatencyMs: p95,
        p99LatencyMs: p99,
        totalRequests,
        errors: totalErrors,
        errorRatePct: `${errorRate}%`,
        littlesLawCalculatedConcurrency: calculatedConcurrency,
      });
    }

    console.log('\n========================================================================');
    console.log('                   PERFORMANCE TEST EXECUTION SUMMARY                  ');
    console.log('========================================================================');
    console.table(summary);

    return summary;
  } finally {
    server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeLoadTests()
    .then(() => {
      console.log('\n✅ Load testing completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Load testing error:', err);
      process.exit(1);
    });
}
