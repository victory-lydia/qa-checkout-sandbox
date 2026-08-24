#!/usr/bin/env node

/**
 * Week 4 — Pairwise / Combinatorial Testing Script
 *
 * Demonstrates combinatorial reduction using PICT (Pairwise Independent Combinatorial Testing).
 * Uses pict-node with ES Modules syntax.
 *
 * Factors:
 * - Browser: Chrome, Firefox, Safari (3 values)
 * - Operating System: Windows, Mac, Linux (3 values)
 * - Plan: Free, Pro (2 values)
 * - Theme: Light, Dark (2 values)
 *
 * Theoretical Total Combinations: 3 * 3 * 2 * 2 = 36 combinations
 * Constraint: Safari is valid only on Mac (IF [Browser] = "Safari" THEN [Operating System] = "Mac";)
 */

import { strings, pict } from 'pict-node';

export const pairwiseModel = [
  { key: 'Browser', values: ['Chrome', 'Firefox', 'Safari'] },
  { key: 'Operating System', values: ['Windows', 'Mac', 'Linux'] },
  { key: 'Plan', values: ['Free', 'Pro'] },
  { key: 'Theme', values: ['Light', 'Dark'] },
];

export const pairwiseConstraints = [
  'IF [Browser] = "Safari" THEN [Operating System] = "Mac";',
];

/**
 * Generate pairwise test matrix.
 */
export async function generatePairwiseCases() {
  const runner = typeof strings === 'function' ? strings : (pict && pict.strings) || pict;
  const cases = await runner({
    model: pairwiseModel,
    constraints: pairwiseConstraints.join('\n'),
  });

  return cases;
}

/**
 * CLI Execution Handler
 */
async function run() {
  console.log('===============================================================');
  console.log('  WEEK 4 — PAIRWISE (COMBINATORIAL) TEST GENERATOR (PICT)     ');
  console.log('===============================================================');
  console.log('\n[1] Factor Model:');
  console.log('  - Browser:          [Chrome, Firefox, Safari]');
  console.log('  - Operating System: [Windows, Mac, Linux]');
  console.log('  - Plan:             [Free, Pro]');
  console.log('  - Theme:            [Light, Dark]');
  console.log('\n[2] Constraints Applied:');
  console.log('  - IF [Browser] = "Safari" THEN [Operating System] = "Mac";');

  const totalTheoretical = 3 * 3 * 2 * 2;
  console.log(`\n[3] Theoretical Exhaustive Combinations: ${totalTheoretical}`);

  const cases = await generatePairwiseCases();

  console.log(`\n[4] Generated Pairwise Test Cases: ${cases.length}`);
  const reductionPct = (((totalTheoretical - cases.length) / totalTheoretical) * 100).toFixed(1);
  console.log(`    Combinatorial Reduction: ${reductionPct}% test suite size reduction\n`);

  console.log('[5] Generated Pairwise Test Matrix:');
  console.table(cases);

  // Validate Safari on Mac constraint across generated cases
  let constraintViolations = 0;
  for (const c of cases) {
    if (c.Browser === 'Safari' && c['Operating System'] !== 'Mac') {
      constraintViolations += 1;
      console.error(`❌ Constraint Violation: Safari found on ${c['Operating System']}`);
    }
  }

  if (constraintViolations === 0) {
    console.log('✅ Constraint verification passed: 100% of Safari cases run exclusively on Mac.');
  } else {
    console.error(`❌ Found ${constraintViolations} constraint violations!`);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error('Error generating pairwise cases:', err);
    process.exit(1);
  });
}
