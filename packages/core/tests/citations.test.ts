import { describe, expect, it } from "vitest";
import { assessGrounding, validateCitations } from "../src/citations.js";
import type { ChatContextItem } from "../src/types.js";

const ITEMS: ChatContextItem[] = [
  { id: "S1", subject: "user:alice", content: "Alice fact", memoryId: "mem-1" },
  { id: "S2", subject: "project:x", content: "Project fact", episodeId: "ep-2" },
  { id: "S3", subject: "user:alice", content: "Another fact", memoryId: "mem-3" },
];

describe("validateCitations", () => {
  it("returns valid citations for known IDs", () => {
    const result = validateCitations(["S1", "S3"], ITEMS);
    expect(result.validCitations).toHaveLength(2);
    expect(result.unknownIds).toHaveLength(0);
    expect(result.hasUnknown).toBe(false);
  });

  it("rejects unknown citation IDs", () => {
    const result = validateCitations(["S1", "S9"], ITEMS);
    expect(result.validCitations).toHaveLength(1);
    expect(result.unknownIds).toEqual(["S9"]);
    expect(result.hasUnknown).toBe(true);
  });

  it("deduplicates repeated citation IDs", () => {
    const result = validateCitations(["S1", "S1", "S2"], ITEMS);
    expect(result.validCitations).toHaveLength(2);
  });

  it("maps citation to server-side data (memoryId, episodeId, source)", () => {
    const result = validateCitations(["S1"], ITEMS);
    const c = result.validCitations[0];
    expect(c.memoryId).toBe("mem-1");
    expect(c.contextItemId).toBe("S1");
    expect(c.subject).toBe("user:alice");
  });

  it("returns empty result for empty input", () => {
    const result = validateCitations([], ITEMS);
    expect(result.validCitations).toHaveLength(0);
    expect(result.hasUnknown).toBe(false);
  });

  it("handles empty context items", () => {
    const result = validateCitations(["S1"], []);
    expect(result.unknownIds).toEqual(["S1"]);
    expect(result.hasUnknown).toBe(true);
  });
});

describe("assessGrounding", () => {
  it("effectivelyGrounded when grounded=true and valid citations exist", () => {
    const result = assessGrounding(true, ["S1"], 1, true);
    expect(result.effectivelyGrounded).toBe(true);
    expect(result.contradiction).toBe(false);
  });

  it("contradiction when grounded=true but no valid citations (requireCitations=true)", () => {
    const result = assessGrounding(true, ["S9"], 0, true);
    expect(result.effectivelyGrounded).toBe(false);
    expect(result.contradiction).toBe(true);
  });

  it("no contradiction when requireCitations=false and no citations", () => {
    const result = assessGrounding(true, [], 0, false);
    expect(result.effectivelyGrounded).toBe(true);
    expect(result.contradiction).toBe(false);
  });

  it("not grounded when grounded=false regardless of citations", () => {
    const result = assessGrounding(false, ["S1"], 1, true);
    expect(result.effectivelyGrounded).toBe(false);
    expect(result.contradiction).toBe(false);
  });
});
