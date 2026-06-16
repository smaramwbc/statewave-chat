import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatewaveChat } from "../src/StatewaveChat.js";
import type { ChatAdapter } from "@statewavedev/chat-core";

afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Stub adapter — never actually called in unit tests (sendMessage is mocked)
// ---------------------------------------------------------------------------

const mockSendMessage = vi.hoisted(() => vi.fn());

vi.mock("@statewavedev/chat-core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@statewavedev/chat-core")>();
  return { ...mod, sendMessage: mockSendMessage };
});

function makeAdapter(): ChatAdapter {
  return {
    retrieval: { retrieve: vi.fn().mockResolvedValue({ items: [], totalTokens: 0, successfulSubjects: [], subjectWarnings: [] }) },
    completion: { complete: vi.fn().mockResolvedValue({ content: "", citations: [] }) },
  };
}

describe("StatewaveChat", () => {
  it("renders without crashing", () => {
    const { container } = render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the chat composer textarea", () => {
    render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
      />,
    );
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("renders the send button", () => {
    render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
      />,
    );
    expect(screen.getByRole("button", { name: /send message/i })).toBeTruthy();
  });

  it("shows suggested questions when provided and no messages exist", () => {
    render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
        suggestedQuestions={["What is Statewave?", "How does memory work?"]}
      />,
    );
    expect(screen.getByRole("list", { name: /suggested questions/i })).toBeTruthy();
    expect(screen.getByText("What is Statewave?")).toBeTruthy();
    expect(screen.getByText("How does memory work?")).toBeTruthy();
  });

  it("does NOT show suggested questions when array is empty", () => {
    render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
        suggestedQuestions={[]}
      />,
    );
    expect(screen.queryByRole("list", { name: /suggested questions/i })).toBeNull();
  });

  it("forwards containerClassName to the root div", () => {
    const { container } = render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
        containerClassName="my-chat-container"
      />,
    );
    expect(container.querySelector(".my-chat-container")).toBeTruthy();
  });

  it("forwards inputPlaceholder to the textarea", () => {
    render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
        inputPlaceholder="Ask me anything…"
      />,
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.placeholder).toBe("Ask me anything…");
  });

  it("forwards composerClassName to the composer area", () => {
    const { container } = render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
        composerClassName="my-composer"
      />,
    );
    expect(container.querySelector(".my-composer")).toBeTruthy();
  });

  it("forwards suggestionsClassName to the suggestions list", () => {
    const { container } = render(
      <StatewaveChat
        adapter={makeAdapter()}
        readSubjects={["test:subject"]}
        suggestedQuestions={["Q1"]}
        suggestionsClassName="my-suggestions"
      />,
    );
    expect(container.querySelector(".my-suggestions")).toBeTruthy();
  });
});
