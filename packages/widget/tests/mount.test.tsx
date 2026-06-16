import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountStatewaveChat } from "../src/mount.js";
import type { ChatAdapter } from "@statewavedev/chat-core";

const mockSendMessage = vi.hoisted(() => vi.fn());

vi.mock("@statewavedev/chat-core", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@statewavedev/chat-core")>();
  return { ...mod, sendMessage: mockSendMessage };
});

function makeAdapter(): ChatAdapter {
  return {
    retrieval: {
      retrieve: vi.fn().mockResolvedValue({
        items: [],
        totalTokens: 0,
        successfulSubjects: [],
        subjectWarnings: [],
      }),
    },
    completion: {
      complete: vi.fn().mockResolvedValue({ content: "", citations: [] }),
    },
  };
}

let containers: HTMLDivElement[] = [];

function makeContainer(): HTMLDivElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  containers.push(el);
  return el;
}

afterEach(() => {
  for (const el of containers) {
    if (el.parentNode) el.parentNode.removeChild(el);
  }
  containers = [];
});

describe("mountStatewaveChat", () => {
  it("mounts successfully into a container element", async () => {
    const container = makeContainer();
    let handle!: ReturnType<typeof mountStatewaveChat>;
    await act(async () => {
      handle = mountStatewaveChat(container, {
        adapter: makeAdapter(),
        readSubjects: ["test:subject"], retrievalConfig: { globalMaxTokens: 1000 },
      });
    });
    expect(container.innerHTML).not.toBe("");
    await act(async () => { handle.unmount(); });
  });

  it("returned unmount function clears the container", async () => {
    const container = makeContainer();
    let handle!: ReturnType<typeof mountStatewaveChat>;
    await act(async () => {
      handle = mountStatewaveChat(container, {
        adapter: makeAdapter(),
        readSubjects: ["test:subject"], retrievalConfig: { globalMaxTokens: 1000 },
      });
    });
    expect(container.innerHTML).not.toBe("");
    await act(async () => { handle.unmount(); });
    expect(container.innerHTML).toBe("");
  });

  it("throws when container is null", () => {
    expect(() =>
      mountStatewaveChat(null, {
        adapter: makeAdapter(),
        readSubjects: ["test:subject"], retrievalConfig: { globalMaxTokens: 1000 },
      }),
    ).toThrow(/container element is null/);
  });

  it("multiple widgets can coexist in separate containers", async () => {
    const c1 = makeContainer();
    const c2 = makeContainer();
    let h1!: ReturnType<typeof mountStatewaveChat>;
    let h2!: ReturnType<typeof mountStatewaveChat>;

    await act(async () => {
      h1 = mountStatewaveChat(c1, { adapter: makeAdapter(), readSubjects: ["test:s1"], retrievalConfig: { globalMaxTokens: 1000 } });
      h2 = mountStatewaveChat(c2, { adapter: makeAdapter(), readSubjects: ["test:s2"], retrievalConfig: { globalMaxTokens: 1000 } });
    });

    expect(c1.innerHTML).not.toBe("");
    expect(c2.innerHTML).not.toBe("");

    await act(async () => { h1.unmount(); h2.unmount(); });
  });

  it("unmounting one widget does not affect the other", async () => {
    const c1 = makeContainer();
    const c2 = makeContainer();
    let h1!: ReturnType<typeof mountStatewaveChat>;
    let h2!: ReturnType<typeof mountStatewaveChat>;

    await act(async () => {
      h1 = mountStatewaveChat(c1, { adapter: makeAdapter(), readSubjects: ["test:s1"], retrievalConfig: { globalMaxTokens: 1000 } });
      h2 = mountStatewaveChat(c2, { adapter: makeAdapter(), readSubjects: ["test:s2"], retrievalConfig: { globalMaxTokens: 1000 } });
    });

    await act(async () => { h1.unmount(); });

    expect(c1.innerHTML).toBe("");
    expect(c2.innerHTML).not.toBe("");

    await act(async () => { h2.unmount(); });
  });
});
