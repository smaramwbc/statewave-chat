# @statewavedev/chat-widget

## 0.1.0

### Minor Changes

Initial release. Drop-in chat widget for any website.

- `StatewaveChat` — React component composing `@statewavedev/chat-react` into a ready-to-use widget; accepts all provider props plus className overrides for every layer
- `mountStatewaveChat` — imperative mount for non-React applications; returns an `{ unmount }` handle for cleanup
- Server-only APIs (`createStatewaveChatAdapter`) are absent from the browser entry point; the `@statewavedev/chat-core/server` subpath must be imported only in server-side code
