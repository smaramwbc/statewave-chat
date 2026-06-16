import { describe, expect, it } from "vitest";
import { mergeSubjectResults, perSubjectAllowance, validateSubjectConfig } from "../src/budget.js";
import type { MultiSubjectRetrievalConfig, MultiSubjectResults } from "../src/index.js";

const BASE_CONFIG: MultiSubjectRetrievalConfig = {
  globalMaxTokens: 1000,
  maxSubjects: 10,
  concurrencyLimit: 5,
  failureMode: "strict",
};

describe("perSubjectAllowance", () => {
  it("divides budget evenly", () => {
    expect(perSubjectAllowance(BASE_CONFIG, 4)).toBe(250);
  });

  it("applies over-fetch factor", () => {
    const config = { ...BASE_CONFIG, overFetchFactor: 1.5 };
    expect(perSubjectAllowance(config, 4)).toBe(375); // floor(1000/4) * 1.5 = 375
  });

  it("handles single subject", () => {
    expect(perSubjectAllowance(BASE_CONFIG, 1)).toBe(1000);
  });

  it("clamps to at least 1", () => {
    const config = { ...BASE_CONFIG, globalMaxTokens: 1 };
    expect(perSubjectAllowance(config, 100)).toBeGreaterThanOrEqual(1);
  });
});

describe("mergeSubjectResults", () => {
  it("returns empty bundle when no subjects succeeded", () => {
    const results: MultiSubjectResults = {
      successful: [],
      warnings: [{ subject: "user:alice", reason: "upstream_error" }],
    };
    const bundle = mergeSubjectResults(results, BASE_CONFIG);
    expect(bundle.items).toHaveLength(0);
    expect(bundle.totalTokens).toBe(0);
    expect(bundle.subjectWarnings).toHaveLength(1);
  });

  it("assigns S1..SN IDs in round-robin order", () => {
    const results: MultiSubjectResults = {
      successful: [
        {
          subject: "user:alice",
          tokenEstimate: 100,
          items: [
            { subject: "user:alice", content: "Alice fact 1", tokenCount: 50 },
            { subject: "user:alice", content: "Alice fact 2", tokenCount: 50 },
          ],
        },
        {
          subject: "project:x",
          tokenEstimate: 100,
          items: [
            { subject: "project:x", content: "Project fact 1", tokenCount: 50 },
            { subject: "project:x", content: "Project fact 2", tokenCount: 50 },
          ],
        },
      ],
      warnings: [],
    };
    const bundle = mergeSubjectResults(results, BASE_CONFIG);
    expect(bundle.items.map((i) => i.id)).toEqual(["S1", "S2", "S3", "S4"]);
    // Round-robin: alice[0], project[0], alice[1], project[1]
    expect(bundle.items[0].content).toBe("Alice fact 1");
    expect(bundle.items[1].content).toBe("Project fact 1");
    expect(bundle.items[2].content).toBe("Alice fact 2");
    expect(bundle.items[3].content).toBe("Project fact 2");
  });

  it("deduplicates by memoryId", () => {
    const results: MultiSubjectResults = {
      successful: [
        {
          subject: "a",
          tokenEstimate: 50,
          items: [{ subject: "a", content: "shared fact", tokenCount: 50, memoryId: "mem-1" }],
        },
        {
          subject: "b",
          tokenEstimate: 50,
          items: [{ subject: "b", content: "shared fact duplicate", tokenCount: 50, memoryId: "mem-1" }],
        },
      ],
      warnings: [],
    };
    const bundle = mergeSubjectResults(results, BASE_CONFIG);
    expect(bundle.items).toHaveLength(1);
    expect(bundle.items[0].content).toBe("shared fact");
  });

  it("deduplicates by episodeId", () => {
    const results: MultiSubjectResults = {
      successful: [
        {
          subject: "a",
          tokenEstimate: 50,
          items: [{ subject: "a", content: "ep fact", tokenCount: 50, episodeId: "ep-1" }],
        },
        {
          subject: "b",
          tokenEstimate: 50,
          items: [{ subject: "b", content: "ep fact duplicate", tokenCount: 50, episodeId: "ep-1" }],
        },
      ],
      warnings: [],
    };
    const bundle = mergeSubjectResults(results, BASE_CONFIG);
    expect(bundle.items).toHaveLength(1);
    expect(bundle.items[0].content).toBe("ep fact");
  });

  it("does not exclude a valid item whose memoryId was seen on a skipped item", () => {
    // Regression: deduplicateItems previously added memoryId to seenMemory
    // before checking episodeId, causing the next item with that memoryId to
    // be incorrectly excluded even though the prior item was never included.
    //
    // Item B: memoryId="m2", episodeId="e1" — skipped because e1 was seen.
    //   Before the fix, "m2" was added to seenMemory here.
    // Item C: memoryId="m2", episodeId="e2" — should be included.
    //   Before the fix, it was wrongly skipped because seenMemory had "m2".
    const results: MultiSubjectResults = {
      successful: [
        {
          subject: "a",
          tokenEstimate: 300,
          items: [
            { subject: "a", content: "item A", tokenCount: 50, memoryId: "m1", episodeId: "e1" },
            { subject: "a", content: "item B", tokenCount: 50, memoryId: "m2", episodeId: "e1" },
            { subject: "a", content: "item C", tokenCount: 50, memoryId: "m2", episodeId: "e2" },
          ],
        },
      ],
      warnings: [],
    };
    const bundle = mergeSubjectResults(results, BASE_CONFIG);
    // Item A: included (m1/e1 not seen)
    // Item B: excluded (e1 already seen from item A) — and "m2" must NOT poison seenMemory
    // Item C: included (m2 and e2 not seen, because item B was never actually included)
    expect(bundle.items).toHaveLength(2);
    expect(bundle.items[0].content).toBe("item A");
    expect(bundle.items[1].content).toBe("item C");
  });

  it("truncates to global budget", () => {
    const config: MultiSubjectRetrievalConfig = { ...BASE_CONFIG, globalMaxTokens: 100 };
    const results: MultiSubjectResults = {
      successful: [
        {
          subject: "a",
          tokenEstimate: 300,
          items: Array.from({ length: 6 }, (_, i) => ({
            subject: "a",
            content: `item ${i}`,
            tokenCount: 60,
          })),
        },
      ],
      warnings: [],
    };
    const bundle = mergeSubjectResults(results, config);
    expect(bundle.totalTokens).toBeLessThanOrEqual(100);
  });

  it("uses char/4 estimate when tokenCount is missing", () => {
    const results: MultiSubjectResults = {
      successful: [
        {
          subject: "a",
          tokenEstimate: 10,
          items: [{ subject: "a", content: "abcd" }], // 4 chars → 1 token
        },
      ],
      warnings: [],
    };
    const bundle = mergeSubjectResults(results, BASE_CONFIG);
    expect(bundle.totalTokens).toBe(1);
  });
});

describe("validateSubjectConfig", () => {
  it("throws on empty subjects", () => {
    expect(() => validateSubjectConfig([], BASE_CONFIG)).toThrow("At least one readSubject");
  });

  it("throws when count exceeds maxSubjects", () => {
    const config: MultiSubjectRetrievalConfig = { ...BASE_CONFIG, maxSubjects: 2 };
    expect(() => validateSubjectConfig(["a", "b", "c"], config)).toThrow("exceeds maximum");
  });

  it("accepts valid subject list", () => {
    expect(() => validateSubjectConfig(["user:alice"], BASE_CONFIG)).not.toThrow();
  });
});
