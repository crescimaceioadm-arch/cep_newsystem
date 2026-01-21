import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NavLink } from "@/components/NavLink";
import { BrowserRouter } from "react-router-dom";

describe("NavLink Component", () => {
  it("renderiza link corretamente", () => {
    render(
      <BrowserRouter>
        <NavLink to="/dashboard">Dashboard</NavLink>
      </BrowserRouter>
    );

    const link = screen.getByText("Dashboard");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard");
  });
});
