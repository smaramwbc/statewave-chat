import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => cleanup());

// jsdom does not implement scrollIntoView — polyfill so MessageThread doesn't throw
window.HTMLElement.prototype.scrollIntoView = vi.fn();
