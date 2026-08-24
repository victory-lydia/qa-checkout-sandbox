# Week 4 — Pairwise / Combinatorial Testing

## 1. Overview of Pairwise (All-Pairs) Testing

**Pairwise Testing** (also called 2-way combinatorial testing) is a black-box test design technique based on empirical studies by the National Institute of Standards and Technology (NIST). NIST research across medical devices, aerospace systems, and web applications revealed that:
- **~70% of all software defects** are triggered by single input parameters or the interaction of **any 2 parameters**.
- **~90% of defects** are triggered by 3-way interactions.
- Less than **1% of defects** require 6-way or higher interactions.

Instead of testing all exhaustive combinations (which explodes exponentially), pairwise testing generates a minimal subset of test cases such that **every possible pair of parameter values is tested together at least once**.

---

## 2. Factor and Level Model

In The QA Checkout Sandbox, user environment and checkout preferences are modeled with 4 factors:

| Factor | Levels (Possible Values) | Count |
| :--- | :--- | :---: |
| **Browser** | Chrome, Firefox, Safari | 3 |
| **Operating System** | Windows, Mac, Linux | 3 |
| **Plan** | Free, Pro | 2 |
| **Theme** | Light, Dark | 2 |

### Theoretical Exhaustive Combinations:
$$\text{Total Combinations} = 3 \times 3 \times 2 \times 2 = 36 \text{ test cases}$$

---

## 3. Applying Realistic Domain Constraints

In reality, not all combinations are valid. For example, the Apple Safari browser is only available on macOS.

**PICT Constraint:**
```text
IF [Browser] = "Safari" THEN [Operating System] = "Mac";
```

When evaluated using `pict-node` with this constraint, the test set is reduced to **9 optimal test cases**.

### Generated Pairwise Test Matrix:

| Test Case | Browser | Operating System | Plan | Theme |
| :---: | :--- | :--- | :--- | :--- |
| **TC-01** | Chrome | Linux | Free | Light |
| **TC-02** | Firefox | Windows | Pro | Dark |
| **TC-03** | Safari | Mac | Free | Dark |
| **TC-04** | Chrome | Windows | Pro | Light |
| **TC-05** | Firefox | Mac | Free | Light |
| **TC-06** | Chrome | Windows | Free | Dark |
| **TC-07** | Firefox | Linux | Pro | Dark |
| **TC-08** | Safari | Mac | Pro | Light |
| **TC-09** | Chrome | Mac | Free | Dark |

### Test Reduction Efficiency:
$$\text{Combinatorial Reduction} = \frac{36 - 9}{36} \times 100\% = 75.0\% \text{ reduction}$$

---

## 4. How PICT Generates the Reduced Set

The PICT (Pairwise Independent Combinatorial Testing) algorithm constructs an internal graph of uncovered pairs:
1. Calculates the cartesian product of all 2-way factor combinations ($(\text{Browser, OS}), (\text{Browser, Plan}), (\text{Browser, Theme}), \dots$).
2. Applies exclusion rules (pruning pairs such as `(Safari, Windows)` and `(Safari, Linux)`).
3. Iteratively selects test configurations that cover the maximum number of remaining unvisited pairs using greedy heuristic optimization.

---

## 5. What Pairwise Testing Does and Does NOT Guarantee

### What it Guarantees:
- **100% 2-Way Interaction Coverage:** Every single combination of two factors (e.g., `Firefox + Dark`, `Pro + Mac`, `Chrome + Free`) appears in at least one test case.
- **100% 1-Way (Single Parameter) Coverage:** Every individual browser, OS, plan, and theme value is evaluated.
- **Drastic Test Execution Speedup:** Reduces testing time and resource consumption by 70–90%.

### What it Does NOT Guarantee:
- **3-Way or Higher Interaction Bugs:** If a bug occurs *only* when `Browser = Chrome` AND `OS = Windows` AND `Plan = Pro` AND `Theme = Dark` all occur simultaneously, a 2-way pairwise suite may miss it unless 3-way/4-way combinatorial testing is configured.
- **Timing and State Dependency Issues:** Pairwise testing selects parameter values for static configurations; it does not test temporal sequences, asynchronous race conditions, or state machine transitions.
- **Calculation / Logic Correctness:** Pairwise test generation selects inputs; deterministic assertions and domain unit tests are still required to verify outputs.
