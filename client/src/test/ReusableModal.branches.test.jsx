import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ReusableModal from "../Components/Modal/ReusableModal";

/**
 * Branch coverage for the client's ReusableModal.
 *
 * ReusableModal.test.jsx covers rendering and the two button handlers. This
 * drives the double-submit guard in all four shapes, the difference between
 * "busy" and "nothing to submit yet", the focus trap's wrap-around cases, and
 * the tab/close/title variants.
 */

const open = (props = {}) =>
  render(
    <ReusableModal isOpen title="Test modal" onClose={() => {}} {...props}>
      <p>body</p>
    </ReusableModal>
  );

const primary = () => document.body.querySelector(".modal-btn-primary, .primary-button, button[type='submit']");

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.style.overflow = "";
  document.body.style.position = "";
});

describe("open and close", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <ReusableModal isOpen={false} title="X" onClose={() => {}}>
        <p>hidden</p>
      </ReusableModal>
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("hidden")).not.toBeInTheDocument();
  });

  it("locks and releases body scroll", () => {
    const { rerender } = open();
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <ReusableModal isOpen={false} title="Test modal" onClose={() => {}}>
        <p>body</p>
      </ReusableModal>
    );
    expect(document.body.style.overflow).toBe("");
  });

  it("marks the app root inert while open", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    const { rerender } = open();
    expect(root.hasAttribute("inert")).toBe(true);
    rerender(
      <ReusableModal isOpen={false} title="Test modal" onClose={() => {}}>
        <p>body</p>
      </ReusableModal>
    );
    expect(root.hasAttribute("inert")).toBe(false);
    root.remove();
  });
});

describe("title, subtitle, icon and close control", () => {
  it("omits the subtitle and icon when not supplied", () => {
    const { container } = open();
    void container;
    expect(document.body.querySelector(".modal-title-icon")).toBeNull();
    expect(screen.getByText("Test modal")).toBeInTheDocument();
  });

  it("renders a subtitle and a title icon when supplied", () => {
    open({ subTitle: "Some context", titleIcon: <svg data-testid="ico" /> });
    expect(screen.getByText("Some context")).toBeInTheDocument();
    expect(document.body.querySelector(".modal-title-icon")).toBeInTheDocument();
  });

  it("hides the close control by default", () => {
    open();
    expect(screen.queryByLabelText("Close modal")).not.toBeInTheDocument();
  });

  it("shows the close control when asked", () => {
    const onClose = vi.fn();
    open({ showClose: true, onClose });
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the close control whenever tabs are present", () => {
    open({ tabs: [{ name: "One", content: <p>pane</p> }], activeTab: "One", onTabChange: vi.fn() });
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
  });

  it("refuses to close while a submit is in flight", async () => {
    let resolve;
    const onClose = vi.fn();
    const onPrimaryButtonClick = vi.fn(() => new Promise((r) => { resolve = r; }));
    open({ showClose: true, onClose, onPrimaryButtonClick, primaryButtonText: "Save" });
    fireEvent.click(primary());
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { resolve(); });
  });

  it("applies the requested size class", () => {
    open({ size: "xl" });
    expect(document.body.querySelector(".modal-xl")).toBeInTheDocument();
  });

  it("defaults to the medium size", () => {
    open();
    expect(document.body.querySelector(".modal-md")).toBeInTheDocument();
  });
});

describe("double-submit guard", () => {
  it("locks for a handler that returns nothing to await", () => {
    vi.useFakeTimers();
    const onPrimaryButtonClick = vi.fn();
    open({ onPrimaryButtonClick, primaryButtonText: "Save" });
    const btn = primary();
    fireEvent.click(btn);
    expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);
    fireEvent.click(btn);
    expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(600);
    });
  });

  it("releases the lock when a promise settles", async () => {
    let resolve;
    const onPrimaryButtonClick = vi.fn(() => new Promise((r) => { resolve = r; }));
    open({ onPrimaryButtonClick, primaryButtonText: "Save" });
    fireEvent.click(primary());
    expect(primary()).toBeDisabled();
    await act(async () => { resolve(); });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });

  it("releases the lock and swallows a rejection", async () => {
    const onPrimaryButtonClick = vi.fn(() => Promise.reject(new Error("server said no")));
    open({ onPrimaryButtonClick, primaryButtonText: "Save" });
    fireEvent.click(primary());
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });

  it("releases the lock when the handler throws synchronously", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // React re-dispatches the handler's error to window; mark it handled so
    // the deliberate throw is not reported as an unhandled error.
    const swallow = (e) => e.preventDefault();
    window.addEventListener("error", swallow);
    const onPrimaryButtonClick = vi.fn(() => {
      throw new Error("boom");
    });
    open({ onPrimaryButtonClick, primaryButtonText: "Save" });
    try {
      fireEvent.click(primary());
    } catch {
      // The rethrow is deliberate.
    }
    expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);
    expect(primary()).not.toBeDisabled();
    window.removeEventListener("error", swallow);
    spy.mockRestore();
  });

  it("tolerates no primary handler at all", () => {
    vi.useFakeTimers();
    open({ primaryButtonText: "Save" });
    expect(() => fireEvent.click(primary())).not.toThrow();
    act(() => {
      vi.advanceTimersByTime(600);
    });
  });

  it("shows the spinner while loading", () => {
    open({ primaryButtonLoading: true, primaryButtonText: "Save" });
    expect(document.body.querySelector(".modal-btn-spinner")).toBeInTheDocument();
    expect(primary()).toBeDisabled();
  });

  it("disables only the primary button when there is nothing to submit", () => {
    const onSecondaryButtonClick = vi.fn();
    open({
      primaryButtonDisabled: true,
      primaryButtonText: "Save",
      secondaryButtonText: "Cancel",
      onSecondaryButtonClick,
    });
    expect(primary()).toBeDisabled();
    // Cancel must stay usable -- "nothing to submit yet" is not "busy".
    fireEvent.click(screen.getByText("Cancel"));
    expect(onSecondaryButtonClick).toHaveBeenCalled();
  });

  it("ignores a submit while primaryButtonDisabled is set", () => {
    const onPrimaryButtonClick = vi.fn();
    open({ primaryButtonDisabled: true, onPrimaryButtonClick, primaryButtonText: "Save" });
    fireEvent.click(primary());
    expect(onPrimaryButtonClick).not.toHaveBeenCalled();
  });
});

describe("focus trap", () => {
  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={onClose}>
        <input aria-label="one" />
      </ReusableModal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("wraps forward and backward across the focusable set", () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} primaryButtonText="Save">
        <input aria-label="first" />
      </ReusableModal>
    );
    const focusables = document.querySelectorAll(
      ".modal-content button, .modal-content input"
    );
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusables[0]);

    focusables[0].focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("leaves focus alone mid-list", () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}}>
        <input aria-label="a" />
        <input aria-label="b" />
      </ReusableModal>
    );
    const middle = screen.getByLabelText("a");
    middle.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(middle);
  });

  it("ignores Tab when nothing is focusable", () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}}>
        <p>no controls</p>
      </ReusableModal>
    );
    expect(() => fireEvent.keyDown(document, { key: "Tab" })).not.toThrow();
  });

  it("ignores keys that are neither Escape nor Tab", () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={onClose}>
        <input aria-label="a" />
      </ReusableModal>
    );
    fireEvent.keyDown(document, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("tabs and footer", () => {
  const tabs = [
    { name: "One", content: <p>first pane</p> },
    { name: "Two", content: <p>second pane</p> },
  ];

  it("renders children when there are no tabs", () => {
    open();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("renders children when the tabs array is empty", () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={[]}>
        <p>children shown</p>
      </ReusableModal>
    );
    expect(screen.getByText("children shown")).toBeInTheDocument();
  });

  it("marks the active tab and reports changes", () => {
    const onTabChange = vi.fn();
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={tabs} activeTab="Two" onTabChange={onTabChange}>
        <p>x</p>
      </ReusableModal>
    );
    expect(screen.getByText("Two").className).toContain("active");
    expect(screen.getByText("One").className).not.toContain("active");
    fireEvent.click(screen.getByText("One"));
    expect(onTabChange).toHaveBeenCalledWith("One");
  });

  it("tolerates a tab click with no handler", () => {
    render(
      <ReusableModal isOpen title="T" onClose={() => {}} tabs={tabs} activeTab="One">
        <p>x</p>
      </ReusableModal>
    );
    expect(() => fireEvent.click(screen.getByText("Two"))).not.toThrow();
  });

  it("omits each button when its label is absent", () => {
    open();
    expect(document.body.querySelector("button[type='submit']")).toBeNull();
  });

  it("honours custom button colours", () => {
    open({
      primaryButtonText: "Publish",
      secondaryButtonText: "Discard",
      primaryButtonColor: "#123456",
      secondaryButtonColor: "#abcdef",
    });
    expect(screen.getByText("Publish")).toHaveStyle({ backgroundColor: "#123456" });
    expect(screen.getByText("Discard")).toHaveStyle({ backgroundColor: "#abcdef" });
  });

  it("uses the default primary colour when none is given", () => {
    open({ primaryButtonText: "Save" });
    expect(screen.getByText("Save")).toHaveStyle({ backgroundColor: "#004aba" });
  });

  it("runs the secondary handler", () => {
    const onSecondaryButtonClick = vi.fn();
    open({ secondaryButtonText: "Cancel", onSecondaryButtonClick });
    fireEvent.click(screen.getByText("Cancel"));
    expect(onSecondaryButtonClick).toHaveBeenCalled();
  });
});
