import { describe, expect, it } from "vitest";

/**
 * Package boundary tests.
 *
 * These tests verify that the widget's browser entry point exports the expected
 * symbols and does not re-export server-only APIs (which contain credentials).
 *
 * We import from the SOURCE so the test suite doesn't require a prior build.
 * Tarball-level checks (dist/ isolation) run in the Phase 3 CI boundary audit.
 */

describe("widget browser entry exports", () => {
  it("exports StatewaveChat component", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.StatewaveChat).toBe("function");
  });

  it("exports mountStatewaveChat function", async () => {
    const mod = await import("../src/index.js");
    expect(typeof mod.mountStatewaveChat).toBe("function");
  });

  it("does NOT export createStatewaveChatAdapter (server-only)", async () => {
    const mod = await import("../src/index.js") as Record<string, unknown>;
    expect(mod["createStatewaveChatAdapter"]).toBeUndefined();
  });

  it("does NOT export StatewaveRetrievalAdapter (server-only)", async () => {
    const mod = await import("../src/index.js") as Record<string, unknown>;
    expect(mod["StatewaveRetrievalAdapter"]).toBeUndefined();
  });

  it("does NOT export StatewaveCompletionAdapter (server-only)", async () => {
    const mod = await import("../src/index.js") as Record<string, unknown>;
    expect(mod["StatewaveCompletionAdapter"]).toBeUndefined();
  });

  it("does NOT export StatewavePersistenceAdapter (server-only)", async () => {
    const mod = await import("../src/index.js") as Record<string, unknown>;
    expect(mod["StatewavePersistenceAdapter"]).toBeUndefined();
  });
});

describe("widget export shape", () => {
  it("StatewaveChat is a named export, not default", async () => {
    const mod = await import("../src/index.js");
    // Named export exists
    expect("StatewaveChat" in mod).toBe(true);
    // No default export
    expect((mod as Record<string, unknown>)["default"]).toBeUndefined();
  });

  it("mountStatewaveChat is a named export, not default", async () => {
    const mod = await import("../src/index.js");
    expect("mountStatewaveChat" in mod).toBe(true);
  });
});
