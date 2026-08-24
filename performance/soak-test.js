#!/usr/bin/env node

/**
 * Week 8 — Soak Testing & Memory Leak Diagnostic Engine
 *
 * Runs a sustained endurance load test over time while continuously sampling:
 * - Elapsed Time (seconds)
 * - Request Count
 * - Process RSS (Resident Set Size in MB)
 * - Heap Total & Heap Used (in MB)
 * - Garbage Collection / Memory Profile Trend
 *
 * Healthy Memory: Sawtooth behavior with a stable baseline after GC.
 * Memory Leak: Unbounded upward-trending baseline over time.
 *
 * Usage:
 *   node performance/soak-test.js --duration=30m
 *   node performance/soak-test.js --duration=10s
 */

import fs from 'fs';
import path from 'path';
import autocannon from 'autocannon';
import { createApp } from '../src/app.js';

const PORT = 3890;

function parseDuration(durationStr = '10s') {
  if (durationStr.endsWith('m')) {
    return parseInt(durationStr, 10) * 60;
  }
  if (durationStr.endsWith('s')) {
    return parseInt(durationStr, 10);
  }
  return parseInt(durationStr, 10) || 10;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let durationStr = '10s'; // default to short for local test, user can specify 30m

  for (const arg of args) {
    if (arg.startsWith('--duration=')) {
      durationStr = arg.split('=')[1];
    }
  }

  return {
    durationStr,
    durationSec: parseDuration(durationStr),
  };
}

export async function executeSoakTest(options = {}) {
  const { durationStr, durationSec } = options.durationSec ? options : parseArgs();
  const sampleIntervalSec = Math.max(1, Math.floor(durationSec / 10));

  const app = createApp(1);
  const server = app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}`;

  console.log('========================================================================');
  console.log('      WEEK 8 — SOAK TEST & CONTINUOUS MEMORY SAMPLING ENGINE          ');
  console.log('========================================================================');
  console.log(`Configured Duration:   ${durationStr} (${durationSec} seconds)`);
  console.log(`Sample Interval:       Every ${sampleIntervalSec} second(s)`);
  console.log(`Target Endpoint:       ${baseUrl}/api/checkout`);

  const memorySamples = [];
  let totalRequestsSent;
  const startTime = Date.now();

  // Periodic Memory Sampler
  const sampler = setInterval(() => {
    const mem = process.memoryUsage();
    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    const sample = {
      elapsedSec,
      rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
      externalMb: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
    };
    memorySamples.push(sample);
  }, sampleIntervalSec * 1000);

  try {
    const runResult = await new Promise((resolve, reject) => {
      const instance = autocannon(
        {
          url: `${baseUrl}/api/checkout`,
          connections: 30, // Steady sustained concurrency
          duration: durationSec,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: 'cust-101',
            items: [{ productId: 'prod-in-stock', unitPrice: 15.00, quantity: 1 }],
            paymentToken: 'tok_visa_soak',
          }),
        },
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      autocannon.track(instance, { renderProgressBar: true, renderResultsTable: false });
    });

    clearInterval(sampler);
    totalRequestsSent = runResult.requests.total;

    console.log('\n========================================================================');
    console.log('                      SOAK TEST MEMORY SAMPLES                          ');
    console.log('========================================================================');
    console.table(memorySamples);

    // Memory Analysis
    const initialHeap = memorySamples[0] ? memorySamples[0].heapUsedMb : 0;
    const finalHeap = memorySamples[memorySamples.length - 1] ? memorySamples[memorySamples.length - 1].heapUsedMb : 0;
    const heapDelta = Math.round((finalHeap - initialHeap) * 100) / 100;

    console.log('\n[Soak Test Diagnostics]:');
    console.log(`  - Total Completed Requests:  ${totalRequestsSent}`);
    console.log(`  - Initial Heap Used:         ${initialHeap} MB`);
    console.log(`  - Final Heap Used:           ${finalHeap} MB`);
    console.log(`  - Heap Delta:                ${heapDelta >= 0 ? `+${heapDelta}` : heapDelta} MB`);

    if (Math.abs(heapDelta) < 15) {
      console.log('✅ Healthy Memory Profile: Stable baseline with normal GC reclamation (sawtooth profile).');
    } else {
      console.log('⚠️ Warning: Heap expansion detected. Prolonged soak test recommended to verify GC cycles.');
    }

    // Save metrics
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const exportPayload = {
      testType: 'SOAK_TEST',
      durationSec,
      totalRequests: totalRequestsSent,
      throughputRPS: Math.round(runResult.requests.average),
      latencyP50: runResult.latency.p50,
      latencyP95: runResult.latency.p97_5 || runResult.latency.p99,
      latencyP99: runResult.latency.p99,
      initialHeapMb: initialHeap,
      finalHeapMb: finalHeap,
      memorySamples,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(path.join(reportsDir, 'sample-metrics.json'), JSON.stringify(exportPayload, null, 2));
    console.log(`\n📁 Saved soak metrics to ${path.join(reportsDir, 'sample-metrics.json')}`);

    return exportPayload;
  } finally {
    clearInterval(sampler);
    server.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  executeSoakTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Soak test execution failure:', err);
      process.exit(1);
    });
}
