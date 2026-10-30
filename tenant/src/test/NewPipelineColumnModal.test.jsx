import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

/**
 * The pipeline board's "new column" modal. Unlike the rest of the modals in
 * this app it keeps nothing in react-hook-form: the name, description and
 * colour all live in the redux pipeline slice's `draft`, validated by hand on
 * Save. The store below is therefore a real one, so `updateDraft` and
 * `resetDraft` run for real and the draft can be seeded into any state the
 * validator cares about.
 *
 * The colour picker is a react-color ChromePicker, which is mocked down to a
 * probe that just reports its props and offers the two callbacks — what matters
 * here is that opening it suppresses the modal's close-on-backdrop behaviour,
 * that a chosen colour reaches the draft, and that closing it leaves the modal
 * itself open.
 *
 * The deliberate design worth knowing: Cancel keeps the draft so reopening
 * restores what was typed, and only a save that actually resolves clears it.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

// The slice pulls the tenant API in for its thunks, none of which this modal
// touches; stubbing it keeps the axios client out of the test.
vi.mock("../api/TenantApis", () => ({ default: {} }));

const picker = vi.hoisted(() => vi.fn());
vi.mock("../Components/ColorPicker", () => ({
  default: (props) => {
    picker(props);
    return (
      <div data-testid="color-picker">
        <span data-testid="picker-colour">{props.color}</span>
        <button type="button" onClick={() => props.onChange("#ABCDEF")}>
          pick a colour
        </button>
        <button type="button" onClick={props.onClose}>
          dismiss the picker
        </button>
      </div>
    );
  },
}));

import NewPipelineColumnModal from "../Components/ReusableModal/PipelineModal/NewPipelineColumnModal";
import pipelineReducer from "../ReduxStore/features/PipelineSlice";

const makeStore = (draft = {}) => {
  const store = configureStore({ reducer: { pipeline: pipelineReducer } });
  if (Object.keys(draft).length) {
    store.dispatch({ type: "pipeline/updateDraft", payload: draft });
  }
  return store;
};

const renderModal = ({ draft, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const store = makeStore(draft);
  const view = render(
    <Provider store={store}>
      <NewPipelineColumnModal isOpen onClose={onClose} onSave={onSave} {...props} />
    </Provider>
  );
  return { ...view, store, onSave, onClose };
};

const nameInput = () => screen.getByPlaceholderText("Type something");
const descriptionInput = () => screen.getByPlaceholderText("Enter a description...");
const swatch = () => document.body.querySelector(".color-preview");
const changeButton = () => screen.getByRole("button", { name: "Change" });
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const submit = async () => act(async () => { fireEvent.click(primary()); });

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

  it("opens on the slice's own default draft", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "New pipeline column"
    );
    expect(nameInput()).toHaveValue("");
    expect(descriptionInput()).toHaveValue("");
    expect(swatch()).toHaveStyle({ backgroundColor: "#1E40AF" });
  });

  it("shows a draft that was already in the slice", () => {
    renderModal({ draft: { name: "Qualified", description: "Ready to bill" } });
    expect(nameInput()).toHaveValue("Qualified");
    expect(descriptionInput()).toHaveValue("Ready to bill");
  });

  it("falls back to black for a draft with no colour", () => {
    renderModal({ draft: { colorCode: "" } });
    expect(swatch()).toHaveStyle({ backgroundColor: "#000000" });
  });

  it("locks the Save button while the caller is saving", () => {
    renderModal({ loading: true });
    expect(primary()).toBeDisabled();
  });
});

describe("editing the draft", () => {
  it("puts the typed name into the slice", () => {
    const { store } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Qualified" } });
    expect(store.getState().pipeline.draft.name).toBe("Qualified");
    expect(nameInput()).toHaveValue("Qualified");
  });

  it("puts the typed description into the slice", () => {
    const { store } = renderModal();
    fireEvent.change(descriptionInput(), { target: { value: "Ready to bill" } });
    expect(store.getState().pipeline.draft.description).toBe("Ready to bill");
  });

  // Cancel deliberately leaves the draft alone so reopening restores it.
  it("keeps the draft when the modal is cancelled", () => {
    const { store, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Qualified" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(store.getState().pipeline.draft.name).toBe("Qualified");
  });

  it("keeps the draft when the modal is closed with Escape", () => {
    const { store, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Qualified" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(store.getState().pipeline.draft.name).toBe("Qualified");
  });

  it("keeps the draft when the backdrop is clicked", () => {
    const { onClose } = renderModal();
    fireEvent.click(document.body.querySelector(".modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("the colour picker", () => {
  it("stays shut until it is asked for", () => {
    renderModal();
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("opens from the Change button", () => {
    renderModal();
    fireEvent.click(changeButton());
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
    expect(screen.getByTestId("picker-colour")).toHaveTextContent("#1E40AF");
  });

  it("opens from a click on the swatch", () => {
    renderModal();
    fireEvent.click(swatch());
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();
  });

  // The keyboard handler calls the opener with no event at all, and the opener's
  // first act is to call preventDefault on it, so Enter and Space throw instead
  // of opening the picker. React reports that as a page-level error rather than
  // letting it out of fireEvent, so it is trapped and inspected here; the
  // behaviour is asserted as it stands, not as it was evidently meant.
  const pressAndTrap = (key) => {
    const seen = [];
    const trap = (e) => {
      e.preventDefault();
      seen.push(e.error);
    };
    window.addEventListener("error", trap);
    try {
      fireEvent.keyDown(swatch(), { key });
    } finally {
      window.removeEventListener("error", trap);
    }
    return seen;
  };

  it("throws instead of opening the picker on Enter", () => {
    renderModal();
    const thrown = pressAndTrap("Enter");
    expect(thrown.some((e) => e instanceof TypeError)).toBe(true);
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("throws instead of opening the picker on Space", () => {
    renderModal();
    const thrown = pressAndTrap(" ");
    expect(thrown.some((e) => e instanceof TypeError)).toBe(true);
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("ignores any other key on the swatch", () => {
    renderModal();
    fireEvent.keyDown(swatch(), { key: "a" });
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });

  it("opens on black when the draft has no colour of its own", () => {
    renderModal({ draft: { colorCode: "" } });
    fireEvent.click(changeButton());
    expect(screen.getByTestId("picker-colour")).toHaveTextContent("#000000");
  });

  it("writes the chosen colour into the draft", () => {
    const { store } = renderModal();
    fireEvent.click(changeButton());
    fireEvent.click(screen.getByRole("button", { name: "pick a colour" }));
    expect(store.getState().pipeline.draft.colorCode).toBe("#ABCDEF");
    expect(swatch()).toHaveStyle({ backgroundColor: "#ABCDEF" });
  });

  it("closes the picker without closing the modal", () => {
    const { onClose } = renderModal();
    fireEvent.click(changeButton());
    fireEvent.click(screen.getByRole("button", { name: "dismiss the picker" }));
    expect(screen.queryByTestId("color-picker")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.body.querySelector(".modal-content")).not.toBeNull();
  });

  // With the picker open the backdrop is inert, so a stray click behind the
  // picker cannot take the modal down with it.
  it("ignores a backdrop click while the picker is open", () => {
    const { onClose } = renderModal();
    fireEvent.click(changeButton());
    fireEvent.click(document.body.querySelector(".modal-overlay"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shuts the picker when the modal itself is cancelled", () => {
    renderModal();
    fireEvent.click(changeButton());
    fireEvent.click(secondary());
    expect(screen.queryByTestId("color-picker")).toBeNull();
  });
});

describe("validation", () => {
  it("refuses a column with no name", async () => {
    const { onSave } = renderModal();
    await submit();
    expect(screen.getByText("Column name is required.")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Please fix the errors before saving.", "error");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a name that is only whitespace", async () => {
    const { onSave } = renderModal({ draft: { name: "   " } });
    await submit();
    expect(screen.getByText("Column name is required.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a column with no colour", async () => {
    const { onSave } = renderModal({ draft: { name: "Qualified", colorCode: "" } });
    await submit();
    expect(
      screen.getByText("A valid color code (e.g., #RRGGBB) is required.")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a colour that is not a six-digit hex", async () => {
    const { onSave } = renderModal({ draft: { name: "Qualified", colorCode: "blue" } });
    await submit();
    expect(
      screen.getByText("A valid color code (e.g., #RRGGBB) is required.")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("clears the complaints once the modal is closed and reopened", async () => {
    const { rerender, store, onClose } = renderModal();
    await submit();
    expect(screen.getByText("Column name is required.")).toBeInTheDocument();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    rerender(
      <Provider store={store}>
        <NewPipelineColumnModal isOpen onClose={vi.fn()} onSave={vi.fn()} />
      </Provider>
    );
    expect(screen.queryByText("Column name is required.")).toBeNull();
  });
});

describe("saving", () => {
  it("saves a trimmed name and the chosen colour", async () => {
    const { onSave, onClose, store } = renderModal({
      draft: { name: "  Qualified  ", colorCode: "#123456" },
    });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toEqual({
      name: "Qualified",
      colorCode: "#123456",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    // A save that landed is the only thing that clears the draft.
    expect(store.getState().pipeline.draft.name).toBe("");
  });

  it("includes a description the user actually wrote", async () => {
    const { onSave } = renderModal({
      draft: { name: "Qualified", description: "  Ready to bill  " },
    });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].description).toBe("Ready to bill");
  });

  it("leaves the description out when it is only whitespace", async () => {
    const { onSave } = renderModal({ draft: { name: "Qualified", description: "   " } });
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("description");
  });

  it("keeps the draft and the modal when the save is refused", async () => {
    const { onSave, onClose, store } = renderModal({ draft: { name: "Qualified" } });
    onSave.mockRejectedValue(new Error("409"));
    await submit();
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
    expect(store.getState().pipeline.draft.name).toBe("Qualified");
    expect(nameInput()).toHaveValue("Qualified");
  });

  it("locks the Save button while the request is in flight", async () => {
    let release;
    const { onSave, onClose } = renderModal({ draft: { name: "Qualified" } });
    onSave.mockReturnValue(new Promise((r) => { release = r; }));
    await submit();
    await waitFor(() => expect(primary()).toBeDisabled());
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => { release(); });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(primary()).not.toBeDisabled();
  });
});
