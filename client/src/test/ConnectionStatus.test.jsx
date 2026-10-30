import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ConnectionStatus from "../Components/ConnectionStatus/ConnectionStatus";

/**
 * The presence dot pinned to the avatar in the sidebar.
 *
 * It is deliberately not a toast: the wording is the whole point, so the tests
 * assert the exact sentences rather than just the state class. The same text is
 * both the tooltip (`data-tip`, drawn by CSS) and the screen-reader line, which
 * is why it appears twice on the element.
 */

const badge = () => document.body.querySelector(".conn-status");

const online = "You're online. Messages and notifications arrive live.";
const offline =
  "You're offline. Reconnecting now — nothing is lost, and updates resume on their own.";

describe("the presence badge", () => {
  it("reassures the user while the socket is up", () => {
    render(<ConnectionStatus isConnected />);
    expect(badge()).toHaveClass("is-online");
    expect(badge()).toHaveAttribute("data-tip", online);
    expect(screen.getByText(online)).toBeInTheDocument();
  });

  it("explains what an interruption means while the socket is down", () => {
    render(<ConnectionStatus isConnected={false} />);
    expect(badge()).toHaveClass("is-offline");
    expect(badge()).toHaveAttribute("data-tip", offline);
    expect(screen.getByText(offline)).toBeInTheDocument();
  });

  it("assumes the worst when told nothing", () => {
    render(<ConnectionStatus />);
    expect(badge()).toHaveClass("is-offline");
  });

  it("announces itself politely rather than interrupting", () => {
    render(<ConnectionStatus isConnected />);
    expect(badge()).toHaveAttribute("role", "status");
    expect(badge()).toHaveAttribute("aria-live", "polite");
  });

  it("is reachable by keyboard so the tooltip is not hover-only", () => {
    render(<ConnectionStatus isConnected />);
    expect(badge()).toHaveAttribute("tabindex", "0");
  });

  it("takes an extra class from the caller", () => {
    render(<ConnectionStatus isConnected className="sidebar-dot" />);
    expect(badge()).toHaveClass("conn-status", "is-online", "sidebar-dot");
  });

  it("carries no stray class when the caller supplies none", () => {
    render(<ConnectionStatus isConnected={false} />);
    expect(badge().className.trim()).toBe("conn-status is-offline");
  });
});
