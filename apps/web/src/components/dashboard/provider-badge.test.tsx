import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProviderBadge } from "./provider-badge";

describe("ProviderBadge", () => {
  const defaultProps = {
    generator: "deepseek" as const,
    reviewer: "groq" as const,
    isConfigured: true,
    onClick: vi.fn(),
    disabled: false,
  };

  it("renders provider labels", () => {
    render(<ProviderBadge {...defaultProps} />);
    expect(screen.getByText(/DeepSeek/)).toBeInTheDocument();
    expect(screen.getByText(/Groq/)).toBeInTheDocument();
  });

  it("shows checkmark when configured", () => {
    render(<ProviderBadge {...defaultProps} isConfigured={true} />);
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows exclamation when not configured", () => {
    render(<ProviderBadge {...defaultProps} isConfigured={false} />);
    expect(screen.getByText("!")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();

    render(<ProviderBadge {...defaultProps} onClick={onClick} />);
    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("respects disabled state", () => {
    render(<ProviderBadge {...defaultProps} disabled={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
