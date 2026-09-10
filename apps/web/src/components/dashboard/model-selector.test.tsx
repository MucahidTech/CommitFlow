import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModelSelector } from "./model-selector";
import type { OpenRouterModel } from "@commitflow/shared";

const mockModels: OpenRouterModel[] = [
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini",
    contextLength: 128000,
    isFree: true,
    inputModalities: [],
    outputModalities: [],
    supportedParameters: ["tools"],
  },
  {
    id: "meta/llama-3:free",
    name: "Meta Llama 3",
    contextLength: 8000,
    isFree: true,
    inputModalities: [],
    outputModalities: [],
    supportedParameters: ["tools"],
  },
];

const defaultProps = {
  models: mockModels,
  selectedModel: null,
  isLoading: false,
  error: null,
  onSelect: vi.fn(),
  onRefresh: vi.fn(),
  disabled: false,
};

describe("ModelSelector", () => {
  describe("default state", () => {
    it("renders dropdown with all models", () => {
      render(<ModelSelector {...defaultProps} />);
      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      // All models appear as options
      expect(screen.getByText(/Cohere North Mini/)).toBeInTheDocument();
      expect(screen.getByText(/Meta Llama 3/)).toBeInTheDocument();
    });

    it("shows 'Other' option", () => {
      render(<ModelSelector {...defaultProps} />);
      expect(screen.getByRole("option", { name: /Other/i })).toBeInTheDocument();
    });

    it("shows Refresh button", () => {
      render(<ModelSelector {...defaultProps} />);
      const refreshBtn = screen.getByTitle(/Refresh free models/i);
      expect(refreshBtn).toBeInTheDocument();
    });
  });

  describe("selection", () => {
    it("shows selected model in dropdown", () => {
      render(<ModelSelector {...defaultProps} selectedModel="cohere/north-mini-code:free" />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("cohere/north-mini-code:free");
    });

    it("calls onSelect when a model is chosen", async () => {
      const onSelect = vi.fn();
      render(<ModelSelector {...defaultProps} onSelect={onSelect} />);

      const user = userEvent.setup();
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "meta/llama-3:free");

      expect(onSelect).toHaveBeenCalledWith("meta/llama-3:free");
    });

    it("calls onSelect with null when 'Use default' is chosen", async () => {
      const onSelect = vi.fn();
      render(
        <ModelSelector
          {...defaultProps}
          selectedModel="cohere/north-mini-code:free"
          onSelect={onSelect}
        />,
      );

      const user = userEvent.setup();
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "");

      expect(onSelect).toHaveBeenCalledWith(null);
    });
  });

  describe("Other mode", () => {
    it("enters Other mode when 'Other' option is selected", async () => {
      const user = userEvent.setup();
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "__other__");

      // Now should see input
      expect(screen.getByPlaceholderText(/anthropic\/claude/i)).toBeInTheDocument();
    });

    it("auto-enters Other mode when selected model is not in list", () => {
      render(<ModelSelector {...defaultProps} selectedModel="custom/model-not-in-list" />);

      // Should automatically show input with value
      const input = screen.getByPlaceholderText(/anthropic\/claude/i) as HTMLInputElement;
      expect(input.value).toBe("custom/model-not-in-list");
    });

    it("calls onSelect when custom model is confirmed", async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<ModelSelector {...defaultProps} onSelect={onSelect} />);

      // Enter Other mode
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "__other__");

      // Type custom model
      const input = screen.getByPlaceholderText(/anthropic\/claude/i);
      await user.type(input, "openai/gpt-4o");

      // Click confirm
      const confirmBtn = screen.getByTitle(/Confirm custom\/paid model/i);
      await user.click(confirmBtn);

      expect(onSelect).toHaveBeenCalledWith("openai/gpt-4o");
    });

    it("cancels Other mode when X clicked", async () => {
      const user = userEvent.setup();
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "__other__");

      const cancelBtn = screen.getByTitle(/Cancel/i);
      await user.click(cancelBtn);

      // Back to dropdown
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("disables confirm button when input is empty", async () => {
      const user = userEvent.setup();
      render(<ModelSelector {...defaultProps} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "__other__");

      const confirmBtn = screen.getByTitle(/Confirm custom\/paid model/i);
      expect(confirmBtn).toBeDisabled();
    });

    it("confirms on Enter key", async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();
      render(<ModelSelector {...defaultProps} onSelect={onSelect} />);

      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "__other__");

      const input = screen.getByPlaceholderText(/anthropic\/claude/i);
      await user.type(input, "custom/model{Enter}");

      expect(onSelect).toHaveBeenCalledWith("custom/model");
    });
  });

  describe("Refresh button", () => {
    it("calls onRefresh when clicked", async () => {
      const onRefresh = vi.fn();
      const user = userEvent.setup();
      render(<ModelSelector {...defaultProps} onRefresh={onRefresh} />);

      const refreshBtn = screen.getByTitle(/Refresh free models/i);
      await user.click(refreshBtn);

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it("shows loading indicator when isLoading", () => {
      render(<ModelSelector {...defaultProps} isLoading={true} />);
      const refreshBtn = screen.getByTitle(/Refresh free models/i);
      expect(refreshBtn.textContent).toContain("...");
    });

    it("disables dropdown when isLoading", () => {
      render(<ModelSelector {...defaultProps} isLoading={true} />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });

  describe("error display", () => {
    it("shows warning icon when error exists", () => {
      render(<ModelSelector {...defaultProps} error="Failed to fetch" />);
      expect(screen.getByText("⚠")).toBeInTheDocument();
    });

    it("shows no warning when no error", () => {
      render(<ModelSelector {...defaultProps} />);
      expect(screen.queryByText("⚠")).not.toBeInTheDocument();
    });
  });

  describe("disabled state", () => {
    it("disables dropdown when disabled", () => {
      render(<ModelSelector {...defaultProps} disabled={true} />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("disables refresh button when disabled", () => {
      render(<ModelSelector {...defaultProps} disabled={true} />);
      expect(screen.getByTitle(/Refresh free models/i)).toBeDisabled();
    });
  });
});
