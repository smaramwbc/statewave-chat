# statewave-chat

Reusable Statewave chat packages — build the chat experience once, connect it to governed Statewave memory, and reuse it everywhere.

```
statewave-connectors
        ↓
Statewave Server
        ↓
statewave-chat
    ├── @statewavedev/chat-core
    ├── @statewavedev/chat-react
    └── @statewavedev/chat-widget
        ↓
    ├── statewave-web
    ├── statewave-admin
    └── external apps and websites
```

## Packages

| Package | Description |
|---|---|
| [`@statewavedev/chat-core`](packages/core) | Framework-independent types, adapter interfaces, and headless session engine |
| [`@statewavedev/chat-react`](packages/react) | React provider, hooks, and accessible UI primitives |
| [`@statewavedev/chat-widget`](packages/widget) | Drop-in React component and vanilla JS mount API |

## Architecture

See [docs/architecture.md](docs/architecture.md) for the full design, including the `readSubjects` / `writeSubject` isolation model and connector compatibility.

## Status

v0.1.0 — first stable developer release.

## License

Apache-2.0
