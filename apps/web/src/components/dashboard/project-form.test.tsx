import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectForm } from "./project-form";

describe("ProjectForm", () => {
  it("shows validation errors when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<ProjectForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /set project/i }));

    await waitFor(() => {
      expect(screen.getByText("Project path is required")).toBeInTheDocument();
      expect(screen.getByText("Project name is required")).toBeInTheDocument();
    });
  });

  it("calls onSubmit with valid data", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<ProjectForm onSubmit={handleSubmit} />);

    await user.type(screen.getByPlaceholderText("/absolute/path/to/project"), "/tmp/test");
    await user.type(screen.getByPlaceholderText("my-project"), "test-project");

    await user.click(screen.getByRole("button", { name: /set project/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        projectPath: "/tmp/test",
        projectName: "test-project",
        safeMode: true,
      });
    });
  });

  it("toggles safe mode checkbox", async () => {
    const user = userEvent.setup();
    render(<ProjectForm onSubmit={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
