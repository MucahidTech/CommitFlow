import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Completed</Badge>);
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("applies color class", () => {
    render(<Badge color="bg-green-600">Done</Badge>);
    expect(screen.getByText("Done").className).toContain("bg-green-600");
  });
});
