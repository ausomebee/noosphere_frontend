import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "../Components/ProtectedRoute";

// Mock useAuth hook
vi.mock("../hooks/useAuth", () => ({
  default: vi.fn(),
}));

import useAuth from "../hooks/useAuth";

describe("ProtectedRoute Component", () => {
  it("renders children when authenticated", () => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><p>Protected content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });

  it("redirects to / when not authenticated", () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/" element={<p>Login page</p>} />
          <Route path="/dashboard" element={<ProtectedRoute><p>Protected content</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("does not render children when not authenticated", () => {
    useAuth.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route path="/" element={<p>Home</p>} />
          <Route path="/dashboard" element={<ProtectedRoute><p>Secret</p></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });
});
