import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import ReusableModal from "../Components/ReusableModal/ReusableModal";
import { modalRegistry } from "../hooks/modalRegistry";

/**
 * Branch coverage for the shared modal.
 *
 * The modal portals into document.body, so everything here is queried through
 * `document.body` rather than the render container. The arms exercised are the
 * focus trap, the body scroll lock, the inert app-root guard, the submit lock
 * (sync, async and throwing handlers) and the header/footer variants.
 */

const noop = () => {};

const body = () => document.body;

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  document.body.style.cssText = "";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("open and closed states", () => {
  it("renders nothing while closed", () => {
    render(<ReusableModal isOpen={false} onClose={noop} title="T">body</ReusableModal>);
    expect(body().querySelector(".modal-overlay")).toBeNull();
  });

  it("renders the dialog when open", () => {
    render(<ReusableModal isOpen onClose={noop} title="T">body</ReusableModal>);
    expect(body().querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("registers with the modal registry only while open", () => {
    const open = vi.spyOn(modalRegistry, "open");
    const close = vi.spyOn(modalRegistry, "close");

    const { unmount, rerender } = render(
      <ReusableModal isOpen={false} onClose={noop} title="T">b</ReusableModal>
    );
    expect(open).not.toHaveBeenCalled();

    rerender(<ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>);
    expect(open).toHaveBeenCalledTimes(1);

    unmount();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("body scroll lock", () => {
  it("locks the body while open and restores the scroll position on close", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    Object.defineProperty(window, "scrollY", { configurable: true, value: 120 });

    const { unmount } = render(
      <ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>
    );
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-120px");

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(scrollTo).toHaveBeenCalledWith(0, 120);
  });

  it("leaves the body alone when it never opened", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const { unmount } = render(
      <ReusableModal isOpen={false} onClose={noop} title="T">b</ReusableModal>
    );
    expect(document.body.style.overflow).toBe("");
    unmount();
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("inert app root", () => {
  it("marks #root inert while open and clears it on unmount", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);

    const { unmount } = render(
      <ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>
    );
    expect(root.hasAttribute("inert")).toBe(true);
    unmount();
    expect(root.hasAttribute("inert")).toBe(false);
  });

  it("copes with an app that has no #root element", () => {
    expect(() => {
      const { unmount } = render(
        <ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>
      );
      unmount();
    }).not.toThrow();
  });
});

describe("keyboard handling", () => {
  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<ReusableModal isOpen onClose={onClose} title="T">b</ReusableModal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wraps Tab from the last control back to the first", () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T" primaryButtonText="Save" showClose>
        <input data-testid="field" />
      </ReusableModal>
    );
    const focusable = body().querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("wraps Shift+Tab from the first control back to the last", () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T" primaryButtonText="Save" showClose>
        <input data-testid="field" />
      </ReusableModal>
    );
    const focusable = body().querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("leaves Tab alone when focus is in the middle of the dialog", () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T" primaryButtonText="Save" showClose>
        <input data-testid="field" />
      </ReusableModal>
    );
    const focusable = body().querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable[1].focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[1]);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(focusable[1]);
  });

  it("ignores Tab when the dialog holds nothing focusable", () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T">
        <p>plain text</p>
      </ReusableModal>
    );
    expect(() => fireEvent.keyDown(document, { key: "Tab" })).not.toThrow();
  });

  it("ignores any other key", () => {
    const onClose = vi.fn();
    render(<ReusableModal isOpen onClose={onClose} title="T">b</ReusableModal>);
    fireEvent.keyDown(document, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses the first control shortly after opening", async () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T" primaryButtonText="Save">
        <input data-testid="field" />
      </ReusableModal>
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByTestId("field"))
    );
  });

  it("stops stray keys from reaching the board behind it, but lets Escape and Tab through", () => {
    const onOuterKeyDown = vi.fn();
    render(
      <div onKeyDown={onOuterKeyDown}>
        <ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>
      </div>
    );
    const overlay = body().querySelector(".modal-overlay");
    fireEvent.keyDown(overlay, { key: " " });
    fireEvent.keyDown(overlay, { key: "Escape" });
    fireEvent.keyDown(overlay, { key: "Tab" });
    // The portal is a React child of the wrapper, so bubbling is measured
    // through React's tree rather than the DOM.
    expect(onOuterKeyDown).toHaveBeenCalledTimes(2);
  });
});

describe("overlay click", () => {
  it("closes on a backdrop click when opted in", () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen onClose={onClose} title="T" closeOnOverlayClick>
        b
      </ReusableModal>
    );
    fireEvent.click(body().querySelector(".modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores a click that started inside the dialog", () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen onClose={onClose} title="T" closeOnOverlayClick>
        b
      </ReusableModal>
    );
    fireEvent.click(body().querySelector('[role="dialog"]'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does nothing on a backdrop click by default", () => {
    const onClose = vi.fn();
    render(<ReusableModal isOpen onClose={onClose} title="T">b</ReusableModal>);
    fireEvent.click(body().querySelector(".modal-overlay"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("swallows drag events so the board behind it never sees them", () => {
    const onDrop = vi.fn();
    render(
      <div onDrop={onDrop} onDragOver={onDrop}>
        <ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>
      </div>
    );
    const overlay = body().querySelector(".modal-overlay");
    fireEvent.dragStart(overlay);
    fireEvent.drag(overlay);
    fireEvent.dragEnd(overlay);
    fireEvent.dragOver(overlay);
    fireEvent.dragEnter(overlay);
    fireEvent.dragLeave(overlay);
    fireEvent.drop(overlay);
    expect(onDrop).not.toHaveBeenCalled();
  });
});

describe("header and footer variants", () => {
  it("shows the close button when asked", () => {
    const onClose = vi.fn();
    render(<ReusableModal isOpen onClose={onClose} title="T" showClose>b</ReusableModal>);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the close button whenever there are tabs", () => {
    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        tabs={[{ name: "One", content: <p>one</p> }]}
        activeTab="One"
      />
    );
    expect(screen.getByLabelText("Close modal")).toBeInTheDocument();
  });

  it("hides the close button by default", () => {
    render(<ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>);
    expect(screen.queryByLabelText("Close modal")).not.toBeInTheDocument();
  });

  it("renders a title icon and subtitle when supplied", () => {
    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        subTitle="Sub"
        titleIcon={<span data-testid="icon" />}
      >
        b
      </ReusableModal>
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Sub")).toBeInTheDocument();
  });

  it("omits both when they are not supplied", () => {
    render(<ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>);
    expect(body().querySelector(".modal-title-icon")).toBeNull();
    expect(body().querySelector(".modal-subtitle")).toBeNull();
  });

  it("shows only the active tab's panel and reports a tab change", () => {
    const onTabChange = vi.fn();
    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        tabs={[
          { name: "One", content: <p>one</p> },
          { name: "Two", content: <p>two</p> },
        ]}
        activeTab="One"
        onTabChange={onTabChange}
      />
    );
    const panels = body().querySelectorAll(".ReuseableModal-body > div");
    expect(panels[0].style.display).toBe("block");
    expect(panels[1].style.display).toBe("none");

    fireEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(onTabChange).toHaveBeenCalledWith("Two");
  });

  it("tolerates tabs with no change handler", () => {
    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        tabs={[{ name: "One", content: <p>one</p> }]}
        activeTab="One"
      />
    );
    expect(() => fireEvent.click(screen.getByRole("tab", { name: "One" }))).not.toThrow();
  });

  it("renders children when there are no tabs, and an empty tabs array counts as none", () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T" tabs={[]}>
        <p>child body</p>
      </ReusableModal>
    );
    expect(screen.getByText("child body")).toBeInTheDocument();
    expect(body().querySelector(".modal-tabs")).toBeNull();
  });

  it("renders custom footer content instead of the button row", () => {
    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        primaryButtonText="Save"
        footerContent={<button type="button">Custom</button>}
      >
        b
      </ReusableModal>
    );
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });

  it("renders no footer at all when there is nothing to put in it", () => {
    render(<ReusableModal isOpen onClose={noop} title="T">b</ReusableModal>);
    expect(body().querySelector(".modal-btns")).toBeNull();
  });

  it("renders the footer for tabs even without button text", () => {
    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        tabs={[{ name: "One", content: <p>one</p> }]}
        activeTab="One"
      />
    );
    expect(body().querySelector(".modal-btns")).toBeInTheDocument();
  });

  it("falls back to onClose when the secondary button has no handler", () => {
    const onClose = vi.fn();
    render(
      <ReusableModal isOpen onClose={onClose} title="T" secondaryButtonText="Cancel">
        b
      </ReusableModal>
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("prefers an explicit secondary handler", () => {
    const onClose = vi.fn();
    const onSecondaryButtonClick = vi.fn();
    render(
      <ReusableModal
        isOpen
        onClose={onClose}
        title="T"
        secondaryButtonText="Cancel"
        onSecondaryButtonClick={onSecondaryButtonClick}
      >
        b
      </ReusableModal>
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onSecondaryButtonClick).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("uses the supplied button colours, and defaults otherwise", () => {
    const { unmount } = render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        primaryButtonColor="rgb(1, 2, 3)"
        secondaryButtonColor="rgb(4, 5, 6)"
      >
        b
      </ReusableModal>
    );
    expect(screen.getByText("Save").style.backgroundColor).toBe("rgb(1, 2, 3)");
    expect(screen.getByText("Cancel").style.backgroundColor).toBe("rgb(4, 5, 6)");
    unmount();

    render(
      <ReusableModal
        isOpen
        onClose={noop}
        title="T"
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
      >
        b
      </ReusableModal>
    );
    expect(screen.getByText("Save").style.backgroundColor).toBe("rgb(0, 74, 186)");
    expect(screen.getByText("Cancel").style.backgroundColor).toBe("rgb(255, 255, 255)");
  });

  it("applies the size and extra class names", () => {
    render(
      <ReusableModal isOpen onClose={noop} title="T" size="xl" className="extra">
        b
      </ReusableModal>
    );
    const dialog = body().querySelector('[role="dialog"]');
    expect(dialog.className).toContain("modal-xl");
    expect(dialog.className).toContain("extra");
  });
});

describe("submit lock", () => {
  const renderWith = (props) =>
    render(
      <ReusableModal isOpen onClose={noop} title="T" primaryButtonText="Save" {...props}>
        b
      </ReusableModal>
    );

  it("runs the handler and holds the button briefly for a sync handler", () => {
    vi.useFakeTimers();
    const onPrimaryButtonClick = vi.fn();
    renderWith({ onPrimaryButtonClick });

    fireEvent.submit(body().querySelector("form"));
    expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);
    expect(body().querySelector('button[type="submit"]')).toBeDisabled();

    // A second submit inside the guard window must not fire the handler again.
    fireEvent.submit(body().querySelector("form"));
    expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(body().querySelector('button[type="submit"]')).not.toBeDisabled();
  });

  it("holds the button until an async handler settles", async () => {
    let resolve;
    const onPrimaryButtonClick = vi.fn(
      () => new Promise((r) => {
        resolve = r;
      })
    );
    renderWith({ onPrimaryButtonClick });

    fireEvent.submit(body().querySelector("form"));
    expect(body().querySelector('button[type="submit"]')).toBeDisabled();

    await act(async () => {
      resolve();
    });
    await waitFor(() =>
      expect(body().querySelector('button[type="submit"]')).not.toBeDisabled()
    );
  });

  it("releases the button when an async handler rejects", async () => {
    const onPrimaryButtonClick = vi.fn(() => Promise.reject(new Error("boom")));
    renderWith({ onPrimaryButtonClick });

    await act(async () => {
      fireEvent.submit(body().querySelector("form"));
    });
    await waitFor(() =>
      expect(body().querySelector('button[type="submit"]')).not.toBeDisabled()
    );
  });

  it("releases the button when a sync handler throws", () => {
    const onPrimaryButtonClick = vi.fn(() => {
      throw new Error("boom");
    });
    // React 19 does not rethrow through fireEvent, so assert on the resulting
    // state rather than on the exception.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // React re-dispatches the handler's error to window; mark it handled so
    // the deliberate throw isn't reported as an unhandled error.
    const swallow = (e) => e.preventDefault();
    window.addEventListener("error", swallow);
    renderWith({ onPrimaryButtonClick });
    fireEvent.submit(body().querySelector("form"));
    expect(onPrimaryButtonClick).toHaveBeenCalled();
    expect(body().querySelector('button[type="submit"]')).not.toBeDisabled();
    window.removeEventListener("error", swallow);
    spy.mockRestore();
  });

  it("submits happily with no handler wired", () => {
    renderWith({});
    expect(() => fireEvent.submit(body().querySelector("form"))).not.toThrow();
  });

  it("keeps the button disabled while the caller says it is loading", () => {
    const onPrimaryButtonClick = vi.fn();
    renderWith({ onPrimaryButtonClick, primaryButtonLoading: true });
    expect(body().querySelector(".modal-btn-spinner")).toBeInTheDocument();
    fireEvent.submit(body().querySelector("form"));
    expect(onPrimaryButtonClick).not.toHaveBeenCalled();
  });

  it("clears its pending guard timer on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = renderWith({ onPrimaryButtonClick: vi.fn() });
    fireEvent.submit(body().querySelector("form"));
    expect(() => {
      unmount();
      vi.advanceTimersByTime(1000);
    }).not.toThrow();
  });
});
