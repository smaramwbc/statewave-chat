import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Citations } from "../src/components/Citations.js";
import type { ChatCitation } from "@statewavedev/chat-core";

function makeCitation(overrides: Partial<ChatCitation> = {}): ChatCitation {
  return {
    id: "S1",
    contextItemId: "S1",
    subject: "test:subject",
    ...overrides,
  };
}

describe("Citations", () => {
  it("returns null for an empty citations array", () => {
    const { container } = render(<Citations citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a list with one citation", () => {
    const citation = makeCitation({ source: { title: "My Doc", url: "https://example.com" } });
    render(<Citations citations={[citation]} />);
    expect(screen.getByRole("list", { name: /sources/i })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("renders citation with safe https URL as an anchor link", () => {
    const citation = makeCitation({ source: { url: "https://example.com/doc" } });
    render(<Citations citations={[citation]} />);
    const link = screen.getByRole("link");
    expect((link as HTMLAnchorElement).href).toBe("https://example.com/doc");
    expect((link as HTMLAnchorElement).target).toBe("_blank");
    expect((link as HTMLAnchorElement).rel).toContain("noopener");
  });

  it("renders citation with javascript: URL as a plain span (not an anchor)", () => {
    const citation = makeCitation({
      id: "S2",
      contextItemId: "S2",
      source: { url: "javascript:alert(1)" },
    });
    render(<Citations citations={[citation]} />);
    expect(screen.queryByRole("link")).toBeNull();
    const span = document.querySelector("[data-citation-id='S2']");
    expect(span?.tagName).toBe("SPAN");
  });

  it("renders citation with data: URL as a plain span", () => {
    const citation = makeCitation({
      id: "S3",
      contextItemId: "S3",
      source: { url: "data:text/html,<h1>xss</h1>" },
    });
    render(<Citations citations={[citation]} />);
    const el = document.querySelector("[data-citation-id='S3']");
    expect(el?.tagName).toBe("SPAN");
  });

  it("renders citation without URL as a plain span", () => {
    const citation = makeCitation({ id: "S4", contextItemId: "S4", source: { title: "No URL Doc" } });
    render(<Citations citations={[citation]} />);
    const el = document.querySelector("[data-citation-id='S4']");
    expect(el?.tagName).toBe("SPAN");
  });

  it("renders multiple citations", () => {
    const citations = [
      makeCitation({ id: "S1", contextItemId: "S1", source: { url: "https://a.com" } }),
      makeCitation({ id: "S2", contextItemId: "S2", source: { url: "https://b.com" } }),
      makeCitation({ id: "S3", contextItemId: "S3", source: { title: "No URL" } }),
    ];
    render(<Citations citations={citations} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("includes data-citation-id on each item", () => {
    const citation = makeCitation({ id: "S99", contextItemId: "S99" });
    render(<Citations citations={[citation]} />);
    expect(document.querySelector("[data-citation-id='S99']")).toBeTruthy();
  });
});
