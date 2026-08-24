#!/usr/bin/env node

/**
 * Performance Metrics Exporter
 * Converts JSON performance telemetry and timeseries into CSV and JSON exports.
 */

import fs from 'fs';
import path from 'path';

export function exportMetricsToFiles(metricsData, outputDir = 'reports') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'sample-metrics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(metricsData, null, 2));

  // Generate CSV from memory samples or load stages
  const csvPath = path.join(outputDir, 'sample-metrics.csv');
  let csvContent = '';

  if (metricsData.memorySamples && metricsData.memorySamples.length > 0) {
    csvContent = 'elapsedSec,rssMb,heapTotalMb,heapUsedMb,externalMb\n';
    for (const sample of metricsData.memorySamples) {
      csvContent += `${sample.elapsedSec},${sample.rssMb},${sample.heapTotalMb},${sample.heapUsedMb},${sample.externalMb}\n`;
    }
  } else if (metricsData.stages && metricsData.stages.length > 0) {
    csvContent = 'stage,targetUsers,throughputRPS,meanLatencyMs,p50LatencyMs,p95LatencyMs,p99LatencyMs,errorRatePct\n';
    for (const st of metricsData.stages) {
      csvContent += `"${st.stage}",${st.targetUsers},${st.throughputRPS},${st.meanLatencyMs},${st.p50LatencyMs},${st.p95LatencyMs},${st.p99LatencyMs},"${st.errorRatePct}"\n`;
    }
  }

  fs.writeFileSync(csvPath, csvContent);
  console.log(`✅ Successfully exported metrics:\n  - JSON: ${jsonPath}\n  - CSV:  ${csvPath}`);
}

async function main() {
  const reportsDir = path.join(process.cwd(), 'reports');
  const jsonPath = path.join(reportsDir, 'sample-metrics.json');

  let data;
  if (fs.existsSync(jsonPath)) {
    data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } else {
    // Generate default baseline benchmark sample dataset
    data = {
      testType: 'SYNTHETIC_BENCHMARK_SEED',
      timestamp: new Date().toISOString(),
      stages: [
        { stage: 'A. Baseline (1 User)', targetUsers: 1, throughputRPS: 1250, meanLatencyMs: 0.8, p50LatencyMs: 1, p95LatencyMs: 2, p99LatencyMs: 4, errorRatePct: '0.00%' },
        { stage: 'B. Light Load (10 Users)', targetUsers: 10, throughputRPS: 4200, meanLatencyMs: 2.3, p50LatencyMs: 2, p95LatencyMs: 5, p99LatencyMs: 8, errorRatePct: '0.00%' },
        { stage: 'C. Expected Load (100 Users)', targetUsers: 100, throughputRPS: 7800, meanLatencyMs: 12.8, p50LatencyMs: 11, p95LatencyMs: 24, p99LatencyMs: 38, errorRatePct: '0.00%' },
        { stage: 'D. Beyond Expected (250 Users)', targetUsers: 250, throughputRPS: 8900, meanLatencyMs: 28.1, p50LatencyMs: 24, p95LatencyMs: 58, p99LatencyMs: 92, errorRatePct: '0.05%' },
        { stage: 'E. Stress Load (500 Users)', targetUsers: 500, throughputRPS: 9200, meanLatencyMs: 54.3, p50LatencyMs: 46, p95LatencyMs: 118, p99LatencyMs: 184, errorRatePct: '0.12%' },
      ],
      memorySamples: [
        { elapsedSec: 0, rssMb: 45.2, heapTotalMb: 28.5, heapUsedMb: 18.2, externalMb: 2.1 },
        { elapsedSec: 5, rssMb: 52.1, heapTotalMb: 35.0, heapUsedMb: 24.6, externalMb: 2.3 },
        { elapsedSec: 10, rssMb: 58.4, heapTotalMb: 40.2, heapUsedMb: 31.8, externalMb: 2.4 },
        { elapsedSec: 15, rssMb: 54.0, heapTotalMb: 40.2, heapUsedMb: 20.1, externalMb: 2.4 }, // GC cycle drop
        { elapsedSec: 20, rssMb: 59.2, heapTotalMb: 42.0, heapUsedMb: 27.4, externalMb: 2.5 },
        { elapsedSec: 25, rssMb: 55.1, heapTotalMb: 42.0, heapUsedMb: 21.0, externalMb: 2.5 }, // GC cycle drop
        { elapsedSec: 30, rssMb: 56.0, heapTotalMb: 42.0, heapUsedMb: 22.3, externalMb: 2.5 },
      ],
    };
  }

  exportMetricsToFiles(data, reportsDir);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Export error:', err);
    process.exit(1);
  });
}
