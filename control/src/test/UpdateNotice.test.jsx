import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

/**
 * The notice is the visible half of the version check: it shows when a newer
 * deploy exists, and only reloads when the user asks.
 */

const versionCheck = vi.fn();
vi.mock("../hooks/useVersionCheck", () => ({ default: () => versionCheck() }));

import UpdateNotice from "../Components/UpdateNotice/UpdateNotice";

const reload = vi.fn();
const realLocation = window.location;

describe("UpdateNotice", () => {
  beforeEach(() => {
    reload.mockClear();
    Object.defineProperty(window, "location", {
      value: { ...realLocation, reload },
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { value: realLocation, configurable: true });
  });

  it("renders nothing while this tab is up to date", () => {
    versionCheck.mockReturnValue({ updateAvailable: false, latestVersion: null });
    const { container } = render(<UpdateNotice />);
    expect(container).toBeEmptyDOMElement();
  });

  it("announces a new version politely", () => {
    versionCheck.mockReturnValue({ updateAvailable: true, latestVersion: "def5678" });
    render(<UpdateNotice />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("A new version is available")).toBeInTheDocument();
  });

  it("reloads only when Refresh is pressed", () => {
    versionCheck.mockReturnValue({ updateAvailable: true, latestVersion: "def5678" });
    render(<UpdateNotice />);
    expect(reload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("goes away on Later without reloading", () => {
    versionCheck.mockReturnValue({ updateAvailable: true, latestVersion: "def5678" });
    render(<UpdateNotice />);
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(screen.queryByText("A new version is available")).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });
});
