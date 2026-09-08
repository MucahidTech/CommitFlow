import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Input } from "./input";

describe("Input", () => {
  it("renders label when provided", () => {
    render(<Input label="Username" />);
    expect(screen.getByText("Username")).toBeInTheDocument();
  });

  it("renders without label when not provided", () => {
    render(<Input placeholder="Enter..." />);
    expect(screen.queryByText("Username")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter...")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<Input label="Username" error="Required field" />);
    expect(screen.getByText("Required field")).toBeInTheDocument();
  });

  it("calls onChange when typing", () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });

    expect(handleChange).toHaveBeenCalled();
  });

  it("associates label with input via htmlFor", () => {
    render(<Input label="Email" id="email-input" />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("id", "email-input");
  });
});
