import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContextInspector } from "../src/components/ContextInspector.js";
import type { ChatContextBundle, ChatContextItem } from "@statewavedev/chat-core";

function makeItem(overrides: Partial<ChatContextItem> = {}): ChatContextItem {
  return {
    id: "S1",
    subject: "test:subject",
    content: "Some retrieved content about memory.",
    tokenCount: 42,
    ...overrides,
  };
}

function makeBundle(overrides: Partial<ChatContextBundle> = {}): ChatContextBundle {
  return {
    items: [makeItem()],
    totalTokens: 42,
    successfulSubjects: ["test:subject"],
    subjectWarnings: [],
    ...overrides,
  };
}

describe("ContextInspector", () => {
  it("renders nothing when bundle is undefined", () => {
    const { container } = render(<ContextInspector bundle={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when bundle has no items", () => {
    const { container } = render(
      <ContextInspector bundle={makeBundle({ items: [] })} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the inspector with accessible role", () => {
    render(<ContextInspector bundle={makeBundle()} />);
    expect(screen.getByRole("complementary", { name: /retrieved context/i })).toBeTruthy();
  });

  it("shows item count, token count, and subject count in header", () => {
    const bundle = makeBundle({
      items: [makeItem({ id: "S1" }), makeItem({ id: "S2" })],
      totalTokens: 99,
      successfulSubjects: ["a", "b"],
    });
    render(<ContextInspector bundle={bundle} />);
    expect(screen.getByText("2 items")).toBeTruthy();
    expect(screen.getByText("99 tokens")).toBeTruthy();
    expect(screen.getByText("2 subjects")).toBeTruthy();
  });

  it("renders one toggle button per context item", () => {
    const bundle = makeBundle({
      items: [makeItem({ id: "S1" }), makeItem({ id: "S2" })],
    });
    render(<ContextInspector bundle={bundle} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("item content is hidden by default (collapsed)", () => {
    render(<ContextInspector bundle={makeBundle()} />);
    expect(screen.queryByText("Some retrieved content about memory.")).toBeNull();
  });

  it("expands an item when its toggle button is clicked", () => {
    render(<ContextInspector bundle={makeBundle()} />);
    const toggle = screen.getByRole("button", { name: /toggle S1/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Some retrieved content about memory.")).toBeTruthy();
  });

  it("collapses an item when its toggle is clicked again", () => {
    render(<ContextInspector bundle={makeBundle()} />);
    const toggle = screen.getByRole("button", { name: /toggle S1/i });
    fireEvent.click(toggle);
    expect(screen.getByText("Some retrieved content about memory.")).toBeTruthy();
    fireEvent.click(toggle);
    expect(screen.queryByText("Some retrieved content about memory.")).toBeNull();
  });

  it("shows aria-expanded state correctly", () => {
    render(<ContextInspector bundle={makeBundle()} />);
    const toggle = screen.getByRole("button", { name: /toggle S1/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("renders subject warnings", () => {
    const bundle = makeBundle({
      subjectWarnings: [
        { subject: "failing:sub", reason: "timeout", detail: "10s exceeded" },
      ],
    });
    render(<ContextInspector bundle={bundle} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/failing:sub/)).toBeTruthy();
    expect(screen.getByText(/timeout/)).toBeTruthy();
  });

  it("renders source title when available", () => {
    const bundle = makeBundle({
      items: [makeItem({ id: "S1", source: { title: "Architecture Overview" } })],
    });
    render(<ContextInspector bundle={bundle} />);
    expect(screen.getByText("Architecture Overview")).toBeTruthy();
  });
});
