# Statewave Chat

[![CI](https://github.com/smaramwbc/statewave-chat/workflows/CI/badge.svg)](https://github.com/smaramwbc/statewave-chat/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@statewavedev/chat-core)](https://www.npmjs.com/package/@statewavedev/chat-core)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Reusable chat packages for [Statewave](https://github.com/smaramwbc/statewave) — the open-source memory runtime for AI agents. Build grounded, memory-backed chat experiences once and embed them anywhere.

> **Part of the Statewave ecosystem:** [Server](https://github.com/smaramwbc/statewave) · [Python SDK](https://github.com/smaramwbc/statewave-py) · [TypeScript SDK](https://github.com/smaramwbc/statewave-ts) · [Connectors](https://github.com/smaramwbc/statewave-connectors) · [Docs](https://github.com/smaramwbc/statewave-docs) · [Examples](https://github.com/smaramwbc/statewave-examples) · [Website + demo](https://statewave.ai) · [Admin](https://github.com/smaramwbc/statewave-admin)
>
> 📋 **Issues & feature requests:** [statewave/issues](https://github.com/smaramwbc/statewave/issues) (centralized tracker)

## What this is

This monorepo provides three packages that extract the proven chatbot architecture from [statewave-web](https://github.com/smaramwbc/statewave-web) into a reusable, framework-agnostic chat platform. It handles retrieval across multiple Statewave subjects, structured grounded completions, citation validation, and optional conversation persistence — so that any application can add a memory-backed chat experience without reimplementing the engine.

It is **not** the Statewave server (that's [statewave](https://github.com/smaramwbc/statewave)) or the TypeScript SDK (that's [statewave-ts](https://github.com/smaramwbc/statewave-ts)). It builds on both.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`@statewavedev/chat-core`](packages/core) | [![npm](https://img.shields.io/npm/v/@statewavedev/chat-core)](https://www.npmjs.com/package/@statewavedev/chat-core) | Framework-independent types, adapter interfaces, multi-subject retrieval engine, prompt construction, citation validation |
| [`@statewavedev/chat-react`](packages/react) | [![npm](https://img.shields.io/npm/v/@statewavedev/chat-react)](https://www.npmjs.com/package/@statewavedev/chat-react) | React provider, fine-grained hooks, and accessible unstyled UI components |
| [`@statewavedev/chat-widget`](packages/widget) | [![npm](https://img.shields.io/npm/v/@statewavedev/chat-widget)](https://www.npmjs.com/package/@statewavedev/chat-widget) | Drop-in `<StatewaveChat>` component and `mountStatewaveChat()` for vanilla JS |

## Install

```bash
# React applications
npm install @statewavedev/chat-react @statewavedev/chat-core

# Drop-in widget (React or vanilla JS)
npm install @statewavedev/chat-widget

# Headless / framework-agnostic
npm install @statewavedev/chat-core
```

## Quick start

**Server route** (Next.js API route, Express handler, etc.):

```typescript
// app/api/chat/route.ts (Next.js App Router)
import { createStatewaveChatAdapter } from "@statewavedev/chat-core/server";
import { StatewaveClient } from "@statewavedev/sdk";
import { sendMessage } from "@statewavedev/chat-core";

const client = new StatewaveClient({ apiKey: process.env.STATEWAVE_API_KEY! });
const adapter = createStatewaveChatAdapter({
  client,
  completionFn: async (messages, opts) => {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      signal: opts?.signal,
    });
    return { content: resp.choices[0].message.content ?? "" };
  },
});
```

**React app** (client-side, using a proxy adapter that calls your server route):

```tsx
import { StatewaveChatProvider, MessageThread, ChatComposer, useChatMessages, useChatLoading, useSendMessage } from "@statewavedev/chat-react";

function MyApp() {
  return (
    <StatewaveChatProvider
      adapter={myProxyAdapter}
      readSubjects={["user:alice", "project:my-project"]}
      retrievalConfig={{ globalMaxTokens: 2000 }}
    >
      <Chat />
    </StatewaveChatProvider>
  );
}

function Chat() {
  const messages = useChatMessages();
  const isLoading = useChatLoading();
  const sendMessage = useSendMessage();
  return (
    <>
      <MessageThread messages={messages} isLoading={isLoading} />
      <ChatComposer onSend={sendMessage} isLoading={isLoading} />
    </>
  );
}
```

**Drop-in widget** (vanilla JS):

```js
import { mountStatewaveChat } from "@statewavedev/chat-widget";

const { unmount } = mountStatewaveChat(
  document.getElementById("statewave-chat"),
  { adapter: myProxyAdapter, readSubjects: ["user:alice"], retrievalConfig: { globalMaxTokens: 2000 } }
);
```

## Architecture

```
statewave-connectors (GitHub, Slack, Notion, …)
        ↓  ingest episodes
Statewave Server  ──  @statewavedev/sdk
        ↓  getContext / createEpisode
@statewavedev/chat-core  (server-side adapter)
        ↓  structured grounded completion
@statewavedev/chat-react / @statewavedev/chat-widget
        ↓
statewave-web · statewave-admin · your app
```

Key design constraints:

- **Global token budget** — `globalMaxTokens` is split evenly across subjects; items are merged in round-robin subject order and deduplicated before truncation
- **Prompt injection barrier** — retrieved evidence is framed in `<evidence>` tags; connector content cannot override system instructions
- **Citation ownership** — the model returns only opaque IDs (S1, S2, …); the server resolves them to full `ChatCitation` objects; model output never contains source URLs, titles, or memory IDs
- **Read/write subject isolation** — `writeSubject` is never readable until after the first persisted turn
- **AbortSignal throughout** — all async operations are cancellable without retry

See [statewave-docs](https://github.com/smaramwbc/statewave-docs) for the full design, subject naming conventions, and connector compatibility guide.

## Development

```bash
git clone https://github.com/smaramwbc/statewave-chat.git
cd statewave-chat
pnpm install
pnpm -r typecheck
pnpm -r test
pnpm -r build
```

Requires Node.js ≥ 18 and pnpm ≥ 9.

## Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 6, strict mode |
| Module format | ESM (`"type": "module"`) |
| Module resolution | NodeNext |
| Testing | Vitest |
| Versioning | Changesets |
| Package manager | pnpm (workspace) |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm -r typecheck` | TypeScript check across all packages |
| `pnpm -r test` | Run tests across all packages |
| `pnpm -r build` | Build all packages to `dist/` |
| `pnpm -r lint` | ESLint across all packages |
| `pnpm changeset` | Prepare a version bump |
| `pnpm release` | Publish packages (CI only) |

## Ecosystem

| Project | Description |
|---------|-------------|
| [statewave](https://github.com/smaramwbc/statewave) | Core server — API, domain model, DB, services |
| [statewave-py](https://github.com/smaramwbc/statewave-py) | `pip install statewave` |
| [statewave-ts](https://github.com/smaramwbc/statewave-ts) | `npm install @statewavedev/sdk` |
| [statewave-connectors](https://github.com/smaramwbc/statewave-connectors) | `@statewavedev/connectors-*` |
| [statewave-docs](https://github.com/smaramwbc/statewave-docs) | Architecture, API contracts, ADRs |
| [statewave-examples](https://github.com/smaramwbc/statewave-examples) | Runnable examples |
| [statewave-web](https://github.com/smaramwbc/statewave-web) | Marketing site + embedded demo |
| [statewave-admin](https://github.com/smaramwbc/statewave-admin) | Operator console |

## License

Apache-2.0
