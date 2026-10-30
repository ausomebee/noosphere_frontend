import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "../ReduxStore/features/authentication";

/**
 * The organisation's document upload modal: a name field and a drop area, whose
 * chosen file is only written into the form once a simulated upload has ticked
 * its way from 0% to 100%. That progress runs on a 200ms interval and ten
 * ticks, so the whole file uses fake timers and pushes them forward by hand
 * rather than waiting.
 *
 * The drop area screens a file twice over. It rejects anything above 50 MB
 * itself, with a toast and no visible row, and everything that gets past it is
 * then checked again by the yup schema — which is the only place a wrong file
 * type is caught, because jsdom does not enforce the input's `accept` list. The
 * fixtures redefine `size` on the File because a jsdom File has no real bytes.
 *
 * The saved payload is a FormData, so it is read back through `get()` rather
 * than compared as an object, and the uploader's name falls back from full name
 * to email to a placeholder depending on what the signed-in user has.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import UploadOrganizationFileModal from "../Components/ReusableModal/OrganizationModal/UploadOrganizationFileModal";

const makeStore = (user) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        user:
          user === null
            ? null
            : {
                id: "u-1",
                tenantId: "tenant-1",
                fullName: "Ada Lovelace",
                email: "ada@example.com",
                ...user,
              },
      },
    },
  });

const renderModal = ({ user, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <Provider store={makeStore(user)}>
      <UploadOrganizationFileModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        {...props}
      />
    </Provider>
  );
  return { ...view, onSave, onClose };
};

// jsdom Files carry no bytes, so the size the component reads is defined here.
const makeFile = (name, type, size = 2048) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const PDF = () => makeFile("policy.pdf", "application/pdf");
const fileInput = () => document.body.querySelector(".upload-input");
const nameInput = () => screen.getByPlaceholderText("Enter document name");
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const fileRow = () => document.body.querySelector(".file-item");
const progressText = () => document.body.querySelector(".progress-text")?.textContent;
const iconShape = () =>
  document.body.querySelector(".file-icon path")?.getAttribute("d");

const pick = (file) => {
  fireEvent.change(fileInput(), { target: { files: [file] } });
};

// Ten 200ms ticks take the simulated upload to 100%, which is when the file is
// finally handed to the form.
const finishUpload = async () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(2000);
  });

const attach = async (file) => {
  pick(file);
  await finishUpload();
};

const submit = async () =>
  act(async () => {
    fireEvent.submit(document.getElementById("modal-form"));
    await vi.advanceTimersByTimeAsync(0);
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("opens on an empty form and no attachment", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Upload document"
    );
    expect(nameInput()).toHaveValue("");
    expect(fileRow()).toBeNull();
  });

  it("clears the form and closes from Cancel", async () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance policy" } });
    await attach(PDF());
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });

  it("clears the form and closes from Escape", async () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance policy" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });
});

describe("attaching a file", () => {
  it("ignores a change event that carries no file", () => {
    renderModal();
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(fileRow()).toBeNull();
    expect(toast).not.toHaveBeenCalled();
  });

  it("shows the file and its size straight away, at zero per cent", () => {
    renderModal();
    pick(PDF());
    expect(fileRow()).not.toBeNull();
    expect(screen.getByText("policy.pdf • 2 KB")).toBeInTheDocument();
    expect(progressText()).toBe("0%");
    expect(document.body.querySelector(".file-success")).toBeNull();
  });

  it("ticks the upload along and ends with a tick of approval", async () => {
    renderModal();
    pick(PDF());
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(progressText()).toBe("30%");
    await act(async () => { await vi.advanceTimersByTimeAsync(1400); });
    expect(progressText()).toBe("100%");
    expect(document.body.querySelector(".file-success")).not.toBeNull();
  });

  it("refuses a file over the size limit before it is ever shown", () => {
    renderModal();
    pick(makeFile("huge.pdf", "application/pdf", 60 * 1024 * 1024));
    expect(toast).toHaveBeenCalledWith("File must be ≤ 50 MB", "error");
    expect(fileRow()).toBeNull();
  });

  it("takes the attachment back off again", async () => {
    renderModal();
    await attach(PDF());
    fireEvent.click(screen.getByRole("button", { name: "Remove file" }));
    expect(fileRow()).toBeNull();
  });

  // The row's icon is chosen from the file extension, and each family of
  // extensions gets its own; the check is that none of them collide.
  it("gives each family of file its own icon", async () => {
    const shapes = [];
    for (const [name, type] of [
      ["policy.pdf", "application/pdf"],
      ["clip.mp4", "video/mp4"],
      ["loop.gif", "image/gif"],
      ["photo.png", "image/png"],
      ["archive", "application/octet-stream"],
    ]) {
      const view = renderModal();
      pick(makeFile(name, type));
      shapes.push(iconShape());
      view.unmount();
    }
    expect(shapes.every(Boolean)).toBe(true);
    expect(new Set(shapes).size).toBe(shapes.length);
  });
});

describe("validation", () => {
  it("refuses a document with no name and no file", async () => {
    const { onSave } = renderModal();
    await submit();
    expect(screen.getByText("Document name is required")).toBeInTheDocument();
    expect(screen.getByText("A file is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a document with a name but no file", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance policy" } });
    await submit();
    expect(screen.getByText("A file is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a file whose name is filled in but whose type is not supported", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Notes" } });
    await attach(makeFile("notes.txt", "text/plain"));
    await submit();
    expect(
      screen.getByText("Supported formats: PDF, JPG, JPEG, PNG, GIF")
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("surfaces the schema's complaints as a toast", async () => {
    renderModal();
    await submit();
    expect(toast).toHaveBeenCalled();
    expect(toast.mock.calls[0][0]).toContain("fields need attention");
    expect(toast.mock.calls[0][1]).toBe("error");
  });

  it("drops the attachment again when it is removed after being accepted", async () => {
    const { onSave } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Insurance policy" } });
    await attach(PDF());
    fireEvent.click(screen.getByRole("button", { name: "Remove file" }));
    await submit();
    expect(screen.getByText("A file is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("saving", () => {
  const fill = async (view) => {
    fireEvent.change(nameInput(), { target: { value: "Insurance policy" } });
    await attach(PDF());
    return view;
  };

  it("sends a form data carrying the tenant, name, file and uploader", async () => {
    const { onSave, onClose } = await fill(renderModal());
    await submit();
    expect(onSave).toHaveBeenCalledTimes(1);
    const sent = onSave.mock.calls[0][0];
    expect(sent).toBeInstanceOf(FormData);
    expect(sent.get("tenantId")).toBe("tenant-1");
    expect(sent.get("documentName")).toBe("Insurance policy");
    expect(sent.get("document").name).toBe("policy.pdf");
    expect(sent.get("uploadedBy")).toBe("Ada Lovelace");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clears the form once the save lands", async () => {
    await fill(renderModal());
    await submit();
    expect(nameInput()).toHaveValue("");
  });

  it("credits the uploader by email when they have no full name", async () => {
    const { onSave } = await fill(renderModal({ user: { fullName: "" } }));
    await submit();
    expect(onSave.mock.calls[0][0].get("uploadedBy")).toBe("ada@example.com");
  });

  it("credits an unknown uploader when there is no signed-in user", async () => {
    const { onSave } = await fill(renderModal({ user: null }));
    await submit();
    const sent = onSave.mock.calls[0][0];
    expect(sent.get("uploadedBy")).toBe("Unknown User");
    // An absent tenant still goes on the wire, as the string "undefined".
    expect(sent.get("tenantId")).toBe("undefined");
  });

  it("reports a refused save and leaves the modal open", async () => {
    const view = renderModal();
    view.onSave.mockRejectedValue(new Error("507 Insufficient Storage"));
    await fill(view);
    await submit();
    expect(toast).toHaveBeenCalledWith("Failed to save document", "error");
    expect(view.onClose).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue("Insurance policy");
  });

  it("locks the Save button while the upload is in flight", async () => {
    let release;
    const view = renderModal();
    view.onSave.mockReturnValue(new Promise((r) => { release = r; }));
    await fill(view);
    await submit();
    expect(primary()).toBeDisabled();
    await act(async () => {
      release();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(primary()).not.toBeDisabled();
  });
});
