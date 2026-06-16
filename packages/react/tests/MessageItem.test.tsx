import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageItem } from "../src/components/MessageItem.js";
import type { ChatMessage } from "@statewavedev/chat-core";

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    role: "user",
    content: "Hello there",
    createdAt: new Date().toISOString(),
    status: "complete",
    ...overrides,
  };
}

describe("MessageItem", () => {
  it("sets data-role='user' for user messages", () => {
    const { container } = render(<MessageItem message={makeMessage({ role: "user" })} />);
    expect(container.querySelector("[data-role='user']")).toBeTruthy();
  });

  it("sets data-role='assistant' for assistant messages", () => {
    const { container } = render(
      <MessageItem message={makeMessage({ role: "assistant", content: "Hi!" })} />,
    );
    expect(container.querySelector("[data-role='assistant']")).toBeTruthy();
  });

  it("renders the message content", () => {
    render(<MessageItem message={makeMessage({ content: "Test content" })} />);
    expect(screen.getByText("Test content")).toBeTruthy();
  });

  it("uses a custom renderContent function when provided", () => {
    const renderContent = vi.fn((c: string) => <em data-testid="custom">{c}</em>);
    render(
      <MessageItem
        message={makeMessage({ content: "custom rendered" })}
        renderContent={renderContent}
      />,
    );
    expect(renderContent).toHaveBeenCalledWith("custom rendered");
    expect(screen.getByTestId("custom")).toBeTruthy();
  });

  it("renders an error alert when status is 'error'", () => {
    const message = makeMessage({
      status: "error",
      error: { code: "completion_failed", message: "Upstream error" },
    });
    render(<MessageItem message={message} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Upstream error");
    expect(alert).toHaveProperty("dataset.error", "completion_failed");
  });

  it("does NOT render an error alert for a complete message", () => {
    render(<MessageItem message={makeMessage({ status: "complete" })} />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders Citations when citations are present", () => {
    const message = makeMessage({
      role: "assistant",
      citations: [
        {
          id: "S1",
          contextItemId: "S1",
          subject: "sub",
          source: { url: "https://example.com" },
        },
      ],
    });
    render(<MessageItem message={message} />);
    expect(screen.getByRole("list", { name: /sources/i })).toBeTruthy();
  });

  it("does NOT render Citations when citations is undefined", () => {
    render(<MessageItem message={makeMessage({ citations: undefined })} />);
    expect(screen.queryByRole("list", { name: /sources/i })).toBeNull();
  });

  it("does NOT render Citations when citations array is empty", () => {
    render(<MessageItem message={makeMessage({ citations: [] })} />);
    expect(screen.queryByRole("list", { name: /sources/i })).toBeNull();
  });

  it("applies userClassName to user messages", () => {
    const { container } = render(
      <MessageItem
        message={makeMessage({ role: "user" })}
        userClassName="user-bubble"
      />,
    );
    expect(container.querySelector(".user-bubble")).toBeTruthy();
  });

  it("applies assistantClassName to assistant messages", () => {
    const { container } = render(
      <MessageItem
        message={makeMessage({ role: "assistant" })}
        assistantClassName="assistant-bubble"
      />,
    );
    expect(container.querySelector(".assistant-bubble")).toBeTruthy();
  });

  it("has accessible aria-label based on role", () => {
    render(<MessageItem message={makeMessage({ role: "assistant", content: "x" })} />);
    expect(screen.getByLabelText("assistant message")).toBeTruthy();
  });
});
