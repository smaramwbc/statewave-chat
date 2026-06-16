import { describe, expect, it } from "vitest";
import { normalizeSource, sourceProviderLabel } from "../src/sources.js";

describe("normalizeSource", () => {
  it("derives provider and type from dotted source type", () => {
    const source = normalizeSource({ type: "github.issue", id: "owner/repo#42" });
    expect(source?.provider).toBe("github");
    expect(source?.type).toBe("issue");
  });

  it("sets url from source pointer", () => {
    const source = normalizeSource({
      type: "github.issue",
      id: "owner/repo#42",
      url: "https://github.com/owner/repo/issues/42",
    });
    expect(source?.url).toBe("https://github.com/owner/repo/issues/42");
    expect(source?.id).toBe("owner/repo#42");
  });

  it("extracts title from metadata", () => {
    const source = normalizeSource(
      { type: "notion.page", id: "page-123" },
      { title: "Architecture Notes" },
    );
    expect(source?.title).toBe("Architecture Notes");
  });

  it("extracts section_path as section", () => {
    const source = normalizeSource(
      { type: "docs.page", id: "docs/api" },
      { section_path: "API / Authentication" },
    );
    expect(source?.section).toBe("API / Authentication");
  });

  it("prefers section_path over breadcrumb", () => {
    const source = normalizeSource(
      { type: "docs.page", id: "docs/api" },
      { section_path: "section", breadcrumb: "breadcrumb" },
    );
    expect(source?.section).toBe("section");
  });

  it("derives title from path when no title in metadata", () => {
    const source = normalizeSource(
      { type: "docs.page", id: "docs/authentication" },
      { path: "docs/authentication.md" },
    );
    expect(source?.title).toBe("Authentication");
  });

  it("handles unknown dotless source type as provider only", () => {
    const source = normalizeSource({ type: "custom", id: "custom-123" });
    expect(source?.provider).toBe("custom");
    expect(source?.type).toBeUndefined();
  });

  it("returns undefined when no source data is provided", () => {
    expect(normalizeSource()).toBeUndefined();
    expect(normalizeSource(undefined, undefined)).toBeUndefined();
  });

  it("uses episodeSource as fallback", () => {
    const source = normalizeSource(undefined, undefined, "slack", "message");
    expect(source?.provider).toBe("slack");
    expect(source?.type).toBe("message");
  });
});

describe("sourceProviderLabel", () => {
  it("returns title when available", () => {
    expect(sourceProviderLabel({ title: "My Document" })).toBe("My Document");
  });

  it("returns 'Provider Type' when both are set", () => {
    expect(sourceProviderLabel({ provider: "github", type: "issue" })).toBe("Github Issue");
  });

  it("returns provider alone when type is not set", () => {
    expect(sourceProviderLabel({ provider: "notion" })).toBe("Notion");
  });

  it("returns 'Source' for empty source", () => {
    expect(sourceProviderLabel(undefined)).toBe("Source");
    expect(sourceProviderLabel({})).toBe("Source");
  });
});
