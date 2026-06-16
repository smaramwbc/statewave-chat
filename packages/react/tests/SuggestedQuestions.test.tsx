import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SuggestedQuestions } from "../src/components/SuggestedQuestions.js";

describe("SuggestedQuestions", () => {
  it("returns null for empty questions array", () => {
    const { container } = render(
      <SuggestedQuestions questions={[]} onSelect={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders a list with suggested question buttons", () => {
    render(
      <SuggestedQuestions
        questions={["What is Statewave?", "How does memory work?"]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("list", { name: /suggested questions/i })).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByText("What is Statewave?")).toBeTruthy();
    expect(screen.getByText("How does memory work?")).toBeTruthy();
  });

  it("calls onSelect with the question text when a chip is clicked", () => {
    const onSelect = vi.fn();
    render(
      <SuggestedQuestions
        questions={["Tell me about pricing"]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Tell me about pricing"));
    expect(onSelect).toHaveBeenCalledWith("Tell me about pricing");
  });

  it("each button has an accessible aria-label", () => {
    render(
      <SuggestedQuestions
        questions={["Question one"]}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /ask: question one/i })).toBeTruthy();
  });

  it("applies className to the list element", () => {
    const { container } = render(
      <SuggestedQuestions
        questions={["Q1"]}
        onSelect={vi.fn()}
        className="my-list"
      />,
    );
    expect(container.querySelector(".my-list")).toBeTruthy();
  });

  it("applies itemClassName to list items", () => {
    const { container } = render(
      <SuggestedQuestions
        questions={["Q1", "Q2"]}
        onSelect={vi.fn()}
        itemClassName="my-item"
      />,
    );
    expect(container.querySelectorAll(".my-item")).toHaveLength(2);
  });
});
