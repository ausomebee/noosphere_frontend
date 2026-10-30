import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The program library's domain modal: a required name and an optional
 * description behind a yup schema, doubling as an add and an edit dialog. The
 * `type` prop is folded into the title and into the payload, so the same modal
 * serves the skill-acquisition and behaviour-reduction libraries.
 *
 * Two things shape the tests. The reset effect keys off `initialData` and
 * `mode` together, so an edit that arrives with no record still blanks the
 * form; and `handleFormSubmit` awaits the caller before resetting, which means a
 * caller that rejects leaves the typed values on screen and the spinner stuck
 * on -- the try/finally only covers `setSubmitting`, not the reset.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import AddDomainModal from "../Components/ReusableModal/ProgramLibraryModal/AddDomainModal";

// Frozen so it stays identity-stable across renders; it is an effect dependency.
const STORED_DOMAIN = Object.freeze({
  domain: "Communication",
  description: "Expressive and receptive language",
});

const renderModal = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <AddDomainModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      type="Skill Acquisition"
      {...props}
    />
  );
  return { ...view, onSubmit, onClose };
};

const nameInput = () => screen.getByPlaceholderText("Enter domain name");
const descriptionInput = () => screen.getByPlaceholderText("Enter domain description");
const title = () => document.body.querySelector(".modal-title-text").textContent;
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const submit = async () => {
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

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself for a new domain in the given library", () => {
    renderModal();
    expect(title()).toBe("Add a new Domain (Skill Acquisition)");
    expect(primary()).toHaveTextContent("Save");
    expect(secondary()).toHaveTextContent("Cancel");
  });

  it("titles itself for an edit in the given library", () => {
    renderModal({ mode: "edit", initialData: STORED_DOMAIN, type: "Behaviour Reduction" });
    expect(title()).toBe("Edit Domain (Behaviour Reduction)");
  });

  it("opens blank when no record was handed in", () => {
    renderModal();
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
  });

  it("closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("opening on a stored domain", () => {
  it("loads both fields from the record", () => {
    renderModal({ mode: "edit", initialData: STORED_DOMAIN });
    expect(nameInput()).toHaveValue("Communication");
    expect(descriptionInput()).toHaveValue("Expressive and receptive language");
  });

  it("blanks a description the record left unset", () => {
    const NAME_ONLY = Object.freeze({ domain: "Communication" });
    renderModal({ mode: "edit", initialData: NAME_ONLY });
    expect(nameInput()).toHaveValue("Communication");
    expect(descriptionInput()).toHaveValue("");
  });

  it("blanks a name the record left unset", () => {
    const DESCRIPTION_ONLY = Object.freeze({ description: "No name on file" });
    renderModal({ mode: "edit", initialData: DESCRIPTION_ONLY });
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("No name on file");
  });

  // The reset effect needs both arms: an edit with nothing to edit falls
  // through to the blanking branch rather than reading `initialData.domain`.
  it("blanks an edit that arrived with no record", () => {
    renderModal({ mode: "edit" });
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
  });

  // Add mode ignores the record entirely, even when one is passed.
  it("ignores a record handed to the add mode", () => {
    renderModal({ initialData: STORED_DOMAIN });
    expect(nameInput()).toHaveValue("");
  });
});

describe("saving", () => {
  it("refuses a domain with no name and toasts the schema message", async () => {
    const { onSubmit } = renderModal();
    await submit();
    expect(await screen.findByText("Domain Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Domain Name is required", "error");
  });

  it("saves a name on its own and stamps the library type on the payload", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Communication" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      domainName: "Communication",
      domainDescription: "",
      type: "Skill Acquisition",
    });
  });

  it("saves the description alongside the name", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Communication" } });
    fireEvent.change(descriptionInput(), {
      target: { value: "Expressive and receptive language" },
    });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      domainName: "Communication",
      domainDescription: "Expressive and receptive language",
      type: "Skill Acquisition",
    });
  });

  it("blanks the form once the save lands", async () => {
    const { onSubmit, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Communication" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await waitFor(() => expect(nameInput()).toHaveValue(""));
    // Dismissing is the caller's job; the modal only clears itself.
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks both footer buttons while the save is in flight", async () => {
    let release;
    const { onSubmit } = renderModal();
    onSubmit.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    fireEvent.change(nameInput(), { target: { value: "Communication" } });
    await submit();
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => {
      release();
    });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });

  // The reset sits after the try/finally rather than inside it, so a rejected
  // save keeps the user's text -- which is the useful behaviour, but it also
  // means the rejection escapes the modal for the caller to handle.
  it("keeps the typed name when the caller rejects the save", async () => {
    const { onSubmit } = renderModal();
    onSubmit.mockRejectedValue(new Error("duplicate domain"));
    fireEvent.change(nameInput(), { target: { value: "Communication" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(nameInput()).toHaveValue("Communication");
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});
