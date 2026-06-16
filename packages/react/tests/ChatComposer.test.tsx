import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "../src/components/ChatComposer.js";

describe("ChatComposer", () => {
  it("renders a textarea and a send button", () => {
    render(<ChatComposer onSend={vi.fn()} isLoading={false} />);
    expect(screen.getByRole("textbox", { name: /message input/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /send message/i })).toBeTruthy();
  });

  it("calls onSend with trimmed text on form submit", () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} isLoading={false} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  hello  " } });
    fireEvent.submit(screen.getByRole("form", { name: /chat input/i }));
    expect(onSend).toHaveBeenCalledWith("hello");
  });

  it("calls onSend when Enter is pressed", () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} isLoading={false} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "question" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    expect(onSend).toHaveBeenCalledWith("question");
  });

  it("does NOT submit on Shift+Enter", () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} isLoading={false} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "line1" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("does NOT submit when submitOnEnter=false and Enter is pressed", () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} isLoading={false} submitOnEnter={false} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "text" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables textarea and button while isLoading is true", () => {
    render(<ChatComposer onSend={vi.fn()} isLoading={true} />);
    const input = screen.getByRole("textbox");
    const button = screen.getByRole("button");
    expect((input as HTMLTextAreaElement).disabled).toBe(true);
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("disables the send button when the input is empty", () => {
    render(<ChatComposer onSend={vi.fn()} isLoading={false} />);
    const button = screen.getByRole("button");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("does NOT call onSend for empty or whitespace-only input", () => {
    const onSend = vi.fn();
    render(<ChatComposer onSend={onSend} isLoading={false} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.submit(screen.getByRole("form", { name: /chat input/i }));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows a custom placeholder", () => {
    render(<ChatComposer onSend={vi.fn()} isLoading={false} placeholder="Type here…" />);
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(input.placeholder).toBe("Type here…");
  });

  it("clears the input after a successful send", () => {
    render(<ChatComposer onSend={vi.fn()} isLoading={false} />);
    const input = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "my message" } });
    fireEvent.submit(screen.getByRole("form", { name: /chat input/i }));
    expect(input.value).toBe("");
  });

  it("renders a custom sendLabel", () => {
    render(<ChatComposer onSend={vi.fn()} isLoading={false} sendLabel="Go →" />);
    expect(screen.getByRole("button").textContent).toBe("Go →");
  });
});
