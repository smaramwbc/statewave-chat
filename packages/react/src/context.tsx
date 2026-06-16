/**
 * StatewaveChatProvider — React context for the headless chat engine.
 *
 * Wraps the framework-agnostic @statewavedev/chat-core engine and exposes
 * session state + the sendMessage action to any React subtree.
 *
 * SECURITY:
 * - The adapter passed here must NOT contain any private API keys if this
 *   component is rendered on the client. Use a proxy adapter (calls your
 *   server route) for browser-side rendering.
 * - readSubjects must be validated server-side before being passed down.
 *   Never allow the user to inject arbitrary subjects.
 *
 * Persistence note:
 * When persist=true, the writeSubject is appended to readSubjects on the
 * second and subsequent turns so the conversation recalls itself. This is
 * handled by the engine and is transparent to the caller.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { sendMessage as engineSendMessage } from "@statewavedev/chat-core";
import type {
  ChatAdapter,
  ChatAnswerPolicy,
  ChatEngineConfig,
  ChatSession,
  MultiSubjectRetrievalConfig,
} from "@statewavedev/chat-core";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface StatewaveChatContextValue {
  session: ChatSession;
  sendMessage: (content: string) => void;
  reset: () => void;
  abort: () => void;
}

const ChatContext = createContext<StatewaveChatContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface StatewaveChatProviderProps {
  adapter: ChatAdapter;
  readSubjects: string[];
  /**
   * Subject to persist conversation turns to.
   * Required when persist=true.
   */
  writeSubject?: string;
  /** Enable persistence of conversation turns to writeSubject. Default: false. */
  persist?: boolean;
  retrievalConfig: MultiSubjectRetrievalConfig;
  answerPolicy?: ChatAnswerPolicy;
  children: React.ReactNode;
}

export function StatewaveChatProvider({
  adapter,
  readSubjects,
  writeSubject,
  persist = false,
  retrievalConfig,
  answerPolicy,
  children,
}: StatewaveChatProviderProps) {
  const [session, setSession] = useState<ChatSession>(() => ({
    id: generateSessionId(),
    messages: [],
    isLoading: false,
    persist,
    readSubjects,
    writeSubject,
  }));

  const abortRef = useRef<AbortController | null>(null);

  const engineConfig: ChatEngineConfig = {
    adapter,
    retrievalConfig,
    answerPolicy,
  };

  const sendMessage = useCallback(
    (content: string) => {
      if (session.isLoading) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      // Capture a stable snapshot of session for this turn
      const sessionSnapshot = session;

      setSession((s) => ({ ...s, isLoading: true }));

      engineSendMessage(sessionSnapshot, content, engineConfig, { signal: ac.signal })
        .then(({ session: nextSession }) => {
          if (ac.signal.aborted) return;
          setSession(nextSession);
        })
        .catch(() => {
          // Errors are surfaced inside the assistant ChatMessage (status: "error")
          // so we only need to clear the loading state here
          setSession((s) => ({ ...s, isLoading: false }));
        });
    },
    // engineConfig is reconstructed each render — use stable primitives as deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, adapter, retrievalConfig, answerPolicy],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setSession((s) => ({ ...s, isLoading: false }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setSession({
      id: generateSessionId(),
      messages: [],
      isLoading: false,
      persist,
      readSubjects,
      writeSubject,
    });
  }, [persist, readSubjects, writeSubject]);

  return (
    <ChatContext.Provider value={{ session, sendMessage, reset, abort }}>
      {children}
    </ChatContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStatewaveChat(): StatewaveChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error("useStatewaveChat must be used inside <StatewaveChatProvider>");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

let _sessionSeq = 0;
function generateSessionId(): string {
  _sessionSeq = (_sessionSeq + 1) % 1_000_000;
  return `session_${Date.now().toString(36)}_${_sessionSeq.toString(36).padStart(4, "0")}`;
}
