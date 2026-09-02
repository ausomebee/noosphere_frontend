import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * The clinical-report settings "new template" modal: one title field and a
 * Start Creating button that hands the trimmed title to the template builder
 * after a deliberate 600ms pause, so the spinner is visible for a moment.
 *
 * The modal passes `primaryButtonDisabled` to ReusableModal, which does not
 * accept that prop -- the button stays live, so both guard clauses below it are
 * genuinely reachable and are tested rather than asserted as unreachable.
 *
 * Everything runs on fake timers, since the hand-off, the close and the field's
 * reset all sit inside that timeout; without advancing it nothing at all
 * happens after a submit.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import CreateNewTemplateModal from "../Components/ReusableModal/SettingsModal/CreateNewTemplateModal";

const renderModal = (props = {}) => {
  const onClose = vi.fn();
  const onStartCreating = vi.fn();
  const view = render(
    <CreateNewTemplateModal
      isOpen
      onClose={onClose}
      onStartCreating={onStartCreating}
      {...props}
    />
  );
  return { ...view, onClose, onStartCreating };
};

const titleInput = () =>
  screen.getByPlaceholderText("e.g. Behaviour Intervention Plan Template");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const typeTitle = (value) => fireEvent.change(titleInput(), { target: { value } });

const submit = () => {
  act(() => {
    fireEvent.click(primary());
  });
};

// The hand-off is parked behind a 600ms timer; nothing lands until it fires.
const settle = () => {
  act(() => {
    vi.advanceTimersByTime(700);
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the modal", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("opens on an empty title", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "New Template"
    );
    expect(titleInput()).toHaveValue("");
    expect(primary()).toHaveTextContent("Start Creating");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  // ReusableModal has no `primaryButtonDisabled` prop, so the guard below the
  // button is what actually stops a blank submit -- not the button itself.
  it("leaves the button live even with nothing typed", () => {
    renderModal();
    expect(primary()).not.toBeDisabled();
  });
});

describe("the title guards", () => {
  it("refuses a blank title", () => {
    const { onStartCreating, onClose } = renderModal();
    submit();
    expect(toast).toHaveBeenCalledWith("Template name is required", "error");
    settle();
    expect(onStartCreating).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("refuses a title of nothing but spaces", () => {
    const { onStartCreating } = renderModal();
    typeTitle("   ");
    submit();
    expect(toast).toHaveBeenCalledWith("Template name is required", "error");
    settle();
    expect(onStartCreating).not.toHaveBeenCalled();
  });

  // Short titles get a warning rather than an error, and are still refused.
  it("warns on a title shorter than three characters", () => {
    const { onStartCreating } = renderModal();
    typeTitle("BI");
    submit();
    expect(toast).toHaveBeenCalledWith(
      "Template name must be at least 3 characters",
      "warning"
    );
    settle();
    expect(onStartCreating).not.toHaveBeenCalled();
  });

  it("counts the length after trimming, not before", () => {
    const { onStartCreating } = renderModal();
    typeTitle("  BI  ");
    submit();
    expect(toast).toHaveBeenCalledWith(
      "Template name must be at least 3 characters",
      "warning"
    );
    settle();
    expect(onStartCreating).not.toHaveBeenCalled();
  });

  it("accepts a title of exactly three characters", () => {
    const { onStartCreating } = renderModal();
    typeTitle("BIP");
    submit();
    settle();
    expect(onStartCreating).toHaveBeenCalledWith({ initialTitle: "BIP" });
    expect(toast).not.toHaveBeenCalled();
  });
});

describe("starting the template", () => {
  it("hands the trimmed title over, closes and blanks the field", () => {
    const { onStartCreating, onClose } = renderModal();
    typeTitle("  Behaviour Intervention Plan  ");
    submit();
    settle();
    expect(onStartCreating).toHaveBeenCalledWith({
      initialTitle: "Behaviour Intervention Plan",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(titleInput()).toHaveValue("");
  });

  it("shows a spinner and locks the field for the length of the pause", () => {
    const { onStartCreating } = renderModal();
    typeTitle("Behaviour Intervention Plan");
    submit();
    expect(primary()).toBeDisabled();
    expect(titleInput()).toBeDisabled();
    expect(onStartCreating).not.toHaveBeenCalled();
    settle();
    expect(primary()).not.toBeDisabled();
    expect(titleInput()).not.toBeDisabled();
  });
});

describe("backing out", () => {
  it("closes from Cancel without starting anything", () => {
    const { onClose, onStartCreating } = renderModal();
    typeTitle("Typed then abandoned");
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    settle();
    expect(onStartCreating).not.toHaveBeenCalled();
  });

  // Cancel closes without resetting, so the abandoned title is still there --
  // only the successful path blanks the field.
  it("leaves the abandoned title in the field", () => {
    renderModal();
    typeTitle("Typed then abandoned");
    fireEvent.click(secondary());
    expect(titleInput()).toHaveValue("Typed then abandoned");
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
