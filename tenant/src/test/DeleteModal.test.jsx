import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import DeleteModal from "../Components/ReusableModal/OrganizationModal/DeleteModal";

/**
 * The organisation module's generic destructive-confirmation modal. It owns no
 * content of its own: the icon, heading and body are all optional props, each
 * rendered only when supplied, and the confirm button's wording is a prop too.
 *
 * Its one piece of behaviour is the confirm handler, which awaits the caller,
 * drops the spinner in a `finally`, and then closes -- and that close sits
 * after the try rather than inside it, so a caller that rejects leaves the
 * modal open. The confirm button is the form's submit, so it is clicked inside
 * `act` to let the promise settle.
 */

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <DeleteModal isOpen onClose={onClose} onConfirm={onConfirm} {...props} />
  );
  return { ...view, onClose, onConfirm };
};

const body = () => document.body.querySelector(".modal-content .text-center");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const confirm = async () => {
  await act(async () => {
    fireEvent.click(primary());
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("what the modal shows", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false, title: "Delete this staff member?" });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("offers a red Delete over a Cancel by default", () => {
    renderModal();
    expect(primary()).toHaveTextContent("Delete");
    expect(primary()).toHaveStyle({ backgroundColor: "#D92D20" });
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("takes the wording of the confirm button from the caller", () => {
    renderModal({ confirmLabel: "Remove licence" });
    expect(primary()).toHaveTextContent("Remove licence");
  });

  it("shows a heading and a message when both are supplied", () => {
    renderModal({
      title: "Delete this staff member?",
      message: "This cannot be undone.",
    });
    expect(screen.getByRole("heading", { name: "Delete this staff member?" })).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("shows an icon when one is supplied", () => {
    renderModal({ icon: <span data-testid="warning-icon" /> });
    expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
  });

  // Every piece of content is optional; a caller that supplies none gets an
  // empty body rather than empty headings and paragraphs.
  it("leaves the body empty when nothing at all is supplied", () => {
    renderModal();
    expect(body()).toBeEmptyDOMElement();
  });

  it("omits the heading when only a message is supplied", () => {
    renderModal({ message: "This cannot be undone." });
    expect(body().querySelector("h2")).toBeNull();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("omits the message when only a heading is supplied", () => {
    renderModal({ title: "Delete this staff member?" });
    expect(body().querySelector("p")).toBeNull();
    expect(screen.getByRole("heading", { name: "Delete this staff member?" })).toBeInTheDocument();
  });
});

describe("confirming", () => {
  it("runs the caller's action and then closes", async () => {
    const { onConfirm, onClose } = renderModal();
    await confirm();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks the confirm button while the action is in flight", async () => {
    let release;
    const { onConfirm, onClose } = renderModal();
    onConfirm.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await confirm();
    await waitFor(() => expect(primary()).toBeDisabled());
    // Only the confirm is locked -- Cancel stays live so a slow delete can
    // still be walked away from.
    expect(secondary()).not.toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      release();
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  // The close sits after the try/finally rather than inside it, so a rejection
  // propagates past it: the modal stays open for a retry, with only the
  // spinner cleared.
  it("stays open when the caller's action is rejected", async () => {
    const { onConfirm, onClose } = renderModal();
    onConfirm.mockRejectedValue(new Error("409"));
    await confirm();
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});

describe("backing out", () => {
  it("closes from Cancel without running the action", () => {
    const { onClose, onConfirm } = renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes from Escape without running the action", () => {
    const { onClose, onConfirm } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
