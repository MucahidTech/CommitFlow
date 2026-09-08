import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommitPlanForm } from "./commit-plan-form";

describe("CommitPlanForm", () => {
  it("shows error for plan shorter than 10 characters", async () => {
    const user = userEvent.setup();
    render(<CommitPlanForm onSubmit={vi.fn()} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "short");

    await user.click(screen.getByRole("button", { name: /parse plan/i }));

    await waitFor(() => {
      expect(screen.getByText("Commit plan must be at least 10 characters")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with valid plan text", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<CommitPlanForm onSubmit={handleSubmit} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "001 - feat: add something");

    await user.click(screen.getByRole("button", { name: /parse plan/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith("001 - feat: add something");
    });
  });
});
