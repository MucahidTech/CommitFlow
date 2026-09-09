import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectForm, type ProjectFormData } from "./project-form";

const initialValues: ProjectFormData = {
  projectName: "",
  projectPath: "",
  safeMode: true,
};

describe("ProjectForm", () => {
  it("renders with initial values", () => {
    render(<ProjectForm values={initialValues} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText("my-project")).toHaveValue("");
    expect(screen.getByPlaceholderText("/absolute/path/to/project")).toHaveValue("");
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("calls onChange when project name is typed", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ProjectForm values={initialValues} onChange={handleChange} />);

    const nameInput = screen.getByPlaceholderText("my-project");
    await user.type(nameInput, "a");

    expect(handleChange).toHaveBeenCalledWith({
      ...initialValues,
      projectName: "a",
    });
  });

  it("toggles safe mode checkbox", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ProjectForm values={initialValues} onChange={handleChange} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(handleChange).toHaveBeenCalledWith({
      ...initialValues,
      safeMode: false,
    });
  });
});
