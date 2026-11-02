import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import BackToLogin from "../Components/BackToLogin/BackToLogin";

/** The way back from the forgot-password pages. */

describe("Back to Login", () => {
  it("takes the user to the login page", () => {
    render(
      <MemoryRouter initialEntries={["/forgot"]}>
        <Routes>
          <Route path="/" element={<p>login page</p>} />
          <Route path="/forgot" element={<BackToLogin />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("link", { name: /back to login/i }));
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("points at the app's own login address, so open-in-new-tab works", () => {
    render(
      <MemoryRouter>
        <BackToLogin />
      </MemoryRouter>
    );
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      import.meta.env.BASE_URL
    );
  });
});
