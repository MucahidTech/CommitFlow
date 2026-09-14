import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProviderConfigModal } from "./provider-config-modal";
import type { ProviderConfig } from "@commitflow/shared";

describe("ProviderConfigModal", () => {
  const defaultProps = {
    isOpen: true,
    generator: { provider: "deepseek" as const },
    reviewer: { provider: "groq" as const },
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  it("renders nothing when closed", () => {
    render(<ProviderConfigModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("AI Provider Configuration")).not.toBeInTheDocument();
  });

  it("renders both generator and reviewer editors", () => {
    render(<ProviderConfigModal {...defaultProps} />);
    expect(screen.getByText("Generator (Code)")).toBeInTheDocument();
    expect(screen.getByText("Reviewer (Review)")).toBeInTheDocument();
  });

  it("hides reviewer editor when same-as-generator is checked", async () => {
    const user = userEvent.setup();
    render(<ProviderConfigModal {...defaultProps} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(screen.queryByText("Reviewer (Review)")).not.toBeInTheDocument();
  });

  it("calls onClose when X button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<ProviderConfigModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByText("✕"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave with current config on Save", async () => {
    const onSave = vi.fn<(gen: ProviderConfig, rev: ProviderConfig) => void>();
    const user = userEvent.setup();

    render(<ProviderConfigModal {...defaultProps} onSave={onSave} />);
    await user.click(screen.getByText("Save"));

    expect(onSave).toHaveBeenCalledTimes(1);

    const call = onSave.mock.calls[0];
    expect(call).toBeDefined();
    const [gen, rev] = call as [ProviderConfig, ProviderConfig];

    expect(gen.provider).toBe("deepseek");
    expect(rev.provider).toBe("groq");
  });

  it("copies generator to reviewer when same-as-generator checked", async () => {
    const onSave = vi.fn<(gen: ProviderConfig, rev: ProviderConfig) => void>();
    const user = userEvent.setup();

    render(
      <ProviderConfigModal
        {...defaultProps}
        onSave={onSave}
        generator={{ provider: "openrouter", apiKey: "or-key" }}
        reviewer={{ provider: "groq" }}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    await user.click(screen.getByText("Save"));

    const call = onSave.mock.calls[0];
    expect(call).toBeDefined();
    const [, rev] = call as [ProviderConfig, ProviderConfig];

    expect(rev.provider).toBe("openrouter");
    expect(rev.apiKey).toBe("or-key");
  });

  it("shows advanced fields when advanced is toggled", async () => {
    const user = userEvent.setup();
    render(<ProviderConfigModal {...defaultProps} />);

    const advancedButtons = screen.getAllByRole("button", { name: /Show advanced options/i });
    await user.click(advancedButtons[0]!);
  });
});
