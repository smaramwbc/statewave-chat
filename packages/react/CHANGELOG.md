# @statewavedev/chat-react

## 0.1.0

### Minor Changes

Initial release. React provider and prebuilt components for Statewave chat.

- `StatewaveChatProvider` — context provider with session management, stale-response guard, and abort
- `useStatewaveChat`, `useChatMessages`, `useChatLoading`, `useSendMessage` — consumer hooks
- `ChatComposer` — textarea + send button with Enter-to-send, disabled states, and submit-on-enter control
- `Citations` — renders citation list; unsafe URLs (`javascript:`, `data:`) rendered as plain spans
- `ContextInspector` — collapsible debug panel showing retrieved context bundle (for admin UIs)
- `MessageItem` — message bubble with role, error alerts, and citation delegation
- `MessageThread` — scrollable message list with auto-scroll and typing indicator
- `SuggestedQuestions` — chip list of suggested questions; shown only before first message
- `TypingIndicator` — animated loading state for in-progress assistant responses
- `safeUrl` — XSS-safe URL filter (exported for custom citation rendering)
