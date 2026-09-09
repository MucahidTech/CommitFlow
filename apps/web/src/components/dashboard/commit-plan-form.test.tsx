import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommitPlanForm } from "./commit-plan-form";

describe("CommitPlanForm", () => {
  it("renders textarea with current value", () => {
    render(<CommitPlanForm value="001 - feat: initial commit" onChange={vi.fn()} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("001 - feat: initial commit");
  });

  it("calls onChange when typing", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<CommitPlanForm value="" onChange={handleChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "a");

    expect(handleChange).toHaveBeenCalled();
  });
});
