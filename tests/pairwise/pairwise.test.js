import { describe, it, expect } from '@jest/globals';
import { generatePairwiseCases, pairwiseModel } from './pairs.js';

describe('Week 4: Pairwise / Combinatorial Testing Matrix', () => {
  it('generates a reduced pairwise matrix adhering to Safari on Mac constraint', async () => {
    const cases = await generatePairwiseCases();

    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThan(0);
    // Exhaustive is 36; pairwise with constraint is typically 9-12
    expect(cases.length).toBeLessThan(36);

    for (const testCase of cases) {
      expect(testCase).toHaveProperty('Browser');
      expect(testCase).toHaveProperty('Operating System');
      expect(testCase).toHaveProperty('Plan');
      expect(testCase).toHaveProperty('Theme');

      // Crucial constraint check: Safari must only run on Mac
      if (testCase.Browser === 'Safari') {
        expect(testCase['Operating System']).toBe('Mac');
      }
    }
  });

  it('covers all distinct values across all parameters at least once', async () => {
    const cases = await generatePairwiseCases();

    for (const factor of pairwiseModel) {
      const distinctInCases = new Set(cases.map((c) => c[factor.key]));
      for (const expectedVal of factor.values) {
        expect(distinctInCases.has(expectedVal)).toBe(true);
      }
    }
  });
});
