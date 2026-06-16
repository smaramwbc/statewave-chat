/**
 * Tests for StatewaveChatProvider and useStatewaveChat.
 *
 * sendMessage from @statewavedev/chat-core is mocked so tests run
 * without a real adapter or network.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  StatewaveChatProvider,
  useStatewaveChat,
} from "../src/context.js";
import type { StatewaveChatProviderProps } from "../src/context.js";
import type {
  ChatAdapter,
  ChatMessage,
  ChatSession,
  MultiSubjectRetrievalConfig,
} from "@statewavedev/chat-core";

// ---------------------------------------------------------------------------
// Mock engine
// ---------------------------------------------------------------------------

// vi.hoisted ensures this is available when the vi.mock factory below is hoisted
const mockSendMessage = vi.hoisted(() => vi.fn());

vi.mock("@statewavedev/chat-core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@statewavedev/chat-core")>();
  return {
    ...mod,
    sendMessage: mockSendMessage,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RETRIEVAL_CONFIG: MultiSubjectRetrievalConfig = { globalMaxTokens: 1000 };

function makeAdapter(): ChatAdapter {
  return {
    retrieval: { retrieve: vi.fn().mockResolvedValue({ items: [], totalTokens: 0, successfulSubjects: [], subjectWarnings: [] }) },
    completion: { complete: vi.fn().mockResolvedValue({ completion: { answer: "Hi", grounded: true, citationIds: [] } }) },
  };
}

function makeAssistantMessage(content = "Hello"): ChatMessage {
  return {
    id: "msg-a",
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    status: "complete",
    grounded: true,
  };
}

function makeSessionResult(
  messages: ChatMessage[],
  base?: Partial<ChatSession>,
): { session: ChatSession; assistantMessage: ChatMessage } {
  const assistantMessage = messages.find((m) => m.role === "assistant") ?? makeAssistantMessage();
  return {
    session: {
      id: "s1",
      messages,
      isLoading: false,
      persist: false,
      readSubjects: ["subject:test"],
      ...base,
    },
    assistantMessage,
  };
}

function wrapper(props: Partial<StatewaveChatProviderProps> = {}) {
  const adapter = makeAdapter();
  return ({ children }: { children: React.ReactNode }) => (
    <StatewaveChatProvider
      adapter={adapter}
      readSubjects={["subject:test"]}
      retrievalConfig={RETRIEVAL_CONFIG}
      {...props}
    >
      {children}
    </StatewaveChatProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("StatewaveChatProvider", () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with empty messages and isLoading=false", () => {
    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });
    expect(result.current.session.messages).toEqual([]);
    expect(result.current.session.isLoading).toBe(false);
  });

  it("initializes with the supplied readSubjects", () => {
    const { result } = renderHook(() => useStatewaveChat(), {
      wrapper: wrapper({ readSubjects: ["sub:a", "sub:b"] }),
    });
    expect(result.current.session.readSubjects).toEqual(["sub:a", "sub:b"]);
  });

  it("generates a unique session ID on initialization", () => {
    const { result: r1 } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });
    const { result: r2 } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });
    expect(r1.current.session.id).not.toBe(r2.current.session.id);
  });

  it("sets isLoading=true immediately after sendMessage is called", async () => {
    // engine hangs until we resolve
    let resolve!: (v: unknown) => void;
    mockSendMessage.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("hello"); });
    expect(result.current.session.isLoading).toBe(true);

    // Clean up
    resolve(makeSessionResult([makeAssistantMessage()]));
  });

  it("updates session with assistant message after successful turn", async () => {
    const assistantMsg = makeAssistantMessage("The answer is 42.");
    mockSendMessage.mockResolvedValue(
      makeSessionResult([
        { id: "m1", role: "user", content: "hello", createdAt: "", status: "complete" },
        assistantMsg,
      ]),
    );

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("hello"); });

    await waitFor(() => expect(result.current.session.isLoading).toBe(false));
    expect(result.current.session.messages).toHaveLength(2);
    expect(result.current.session.messages[1].content).toBe("The answer is 42.");
  });

  it("clears isLoading after a failed turn", async () => {
    mockSendMessage.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("hello"); });

    await waitFor(() => expect(result.current.session.isLoading).toBe(false));
  });

  it("abort() clears isLoading immediately", async () => {
    let resolve!: (v: unknown) => void;
    mockSendMessage.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("hello"); });
    expect(result.current.session.isLoading).toBe(true);

    act(() => { result.current.abort(); });
    expect(result.current.session.isLoading).toBe(false);

    resolve(makeSessionResult([]));
  });

  it("stale response is suppressed after abort", async () => {
    // A result that arrives after abort must not update the session
    let resolveStale!: (v: unknown) => void;
    mockSendMessage.mockReturnValue(new Promise((r) => { resolveStale = r; }));

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("hello"); });
    act(() => { result.current.abort(); });

    const initialMessages = result.current.session.messages;

    // Resolve the stale request after abort
    await act(async () => {
      resolveStale(makeSessionResult([makeAssistantMessage("stale")]));
      await new Promise((r) => setTimeout(r, 10));
    });

    // Messages must not change — abort already cleared state
    expect(result.current.session.messages).toEqual(initialMessages);
  });

  it("reset() clears messages and generates a new session ID", async () => {
    const assistantMsg = makeAssistantMessage("answer");
    mockSendMessage.mockResolvedValue(makeSessionResult([
      { id: "m1", role: "user", content: "q", createdAt: "", status: "complete" },
      assistantMsg,
    ]));

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("q"); });
    await waitFor(() => expect(result.current.session.messages).toHaveLength(2));

    const oldId = result.current.session.id;
    act(() => { result.current.reset(); });

    expect(result.current.session.messages).toEqual([]);
    expect(result.current.session.id).not.toBe(oldId);
  });

  it("ignores sendMessage when isLoading is already true", () => {
    let resolve!: (v: unknown) => void;
    mockSendMessage.mockReturnValue(new Promise((r) => { resolve = r; }));

    const { result } = renderHook(() => useStatewaveChat(), { wrapper: wrapper() });

    act(() => { result.current.sendMessage("first"); });
    act(() => { result.current.sendMessage("second while loading"); });

    // sendMessage should only have been called once
    expect(mockSendMessage).toHaveBeenCalledTimes(1);

    resolve(makeSessionResult([]));
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useStatewaveChat())).toThrow(
      "useStatewaveChat must be used inside <StatewaveChatProvider>",
    );
  });
});
