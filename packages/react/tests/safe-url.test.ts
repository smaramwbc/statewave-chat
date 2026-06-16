import { describe, expect, it } from "vitest";
import { safeUrl } from "../src/safe-url.js";

describe("safeUrl", () => {
  it("accepts https URLs", () => {
    const result = safeUrl("https://example.com/path?q=1");
    expect(result).not.toBeNull();
    expect(result?.href).toBe("https://example.com/path?q=1");
    expect(result?.protocol).toBe("https:");
    expect(result?.hostname).toBe("example.com");
  });

  it("accepts http URLs", () => {
    const result = safeUrl("http://example.com");
    expect(result).not.toBeNull();
    expect(result?.protocol).toBe("http:");
  });

  it("rejects javascript: URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: URLs", () => {
    expect(safeUrl("data:text/html,<h1>hi</h1>")).toBeNull();
  });

  it("rejects vbscript: URLs", () => {
    expect(safeUrl("vbscript:msgbox(1)")).toBeNull();
  });

  it("rejects relative paths", () => {
    expect(safeUrl("/relative/path")).toBeNull();
  });

  it("rejects bare hostnames without scheme", () => {
    expect(safeUrl("example.com/path")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(safeUrl(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(safeUrl(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(safeUrl("")).toBeNull();
  });

  it("returns null for malformed URL", () => {
    expect(safeUrl("not a url at all %%%")).toBeNull();
  });

  it("preserves query params and fragments", () => {
    const result = safeUrl("https://docs.example.com/page?ref=a#section-2");
    expect(result?.href).toContain("ref=a");
    expect(result?.href).toContain("section-2");
  });
});
