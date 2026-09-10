import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders label when provided", () => {
    render(<Textarea label="Description" />);
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("renders without label when not provided", () => {
    render(<Textarea placeholder="Enter text..." />);
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter text...")).toBeInTheDocument();
  });

  it("renders error message when provided", () => {
    render(<Textarea label="Bio" error="Too long" />);
    expect(screen.getByText("Too long")).toBeInTheDocument();
  });

  it("applies error styling when error is present", () => {
    render(<Textarea error="Required" />);
    const textarea = screen.getByRole("textbox");
    expect(textarea.className).toContain("border-red-500");
  });

  it("associates label with textarea via htmlFor", () => {
    render(<Textarea label="Notes" id="notes-input" />);
    const textarea = screen.getByLabelText("Notes");
    expect(textarea).toHaveAttribute("id", "notes-input");
  });

  it("auto-generates id when not provided", () => {
    render(<Textarea label="Auto" />);
    const textarea = screen.getByLabelText("Auto");
    expect(textarea).toHaveAttribute("id");
    expect(textarea.id).not.toBe("");
  });

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole("textbox");

    await user.type(textarea, "hello");
    expect(handleChange).toHaveBeenCalled();
  });

  it("respects disabled state", () => {
    render(<Textarea disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("forwards custom className", () => {
    render(<Textarea className="custom-class" />);
    expect(screen.getByRole("textbox").className).toContain("custom-class");
  });
});
