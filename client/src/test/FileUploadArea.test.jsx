import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const uploadImage = vi.fn();
vi.mock("../api/ImageUpload", () => ({ default: { UploadImage: (...a) => uploadImage(...a) } }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

import FileUploadArea from "../Components/FileUpload/FileUploadArea";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The drag-and-drop upload area.
 *
 * Each file is tracked by a generated id rather than its index, because a file
 * removed mid-upload used to shift the array and land the progress on the wrong
 * row. The tests below cover the size guard, the single-file cap that has to
 * hold even when a drag delivers several, and the per-file retry and remove.
 */

const makeStore = () =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        user: { token: "at", refreshToken: "rt" },
      },
    },
  });

const file = (name = "report.pdf", sizeMB = 1) => {
  const f = new File(["x"], name, { type: "application/pdf" });
  Object.defineProperty(f, "size", { value: sizeMB * 1024 * 1024 });
  return f;
};

const renderArea = (props = {}) =>
  render(
    <Provider store={makeStore()}>
      <FileUploadArea {...props} />
    </Provider>
  );

const input = () => document.body.querySelector('input[type="file"]');
const rows = () => document.body.querySelectorAll(".file-item");
// A row renders its name and size together in one span: "name • size".
const rowText = () =>
  Array.from(document.body.querySelectorAll(".file-name"))
    .map((n) => n.textContent)
    .join(" | ");

const drop = (files) => {
  const zone = document.body.querySelector(".w-full > div");
  fireEvent.drop(zone, { dataTransfer: { files } });
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  uploadImage.mockResolvedValue({ success: true, data: [{ url: "u", filename: "report.pdf" }] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("rendering", () => {
  it("shows the hint it was given", () => {
    renderArea({ hint: "PDF only" });
    expect(screen.getByText("PDF only")).toBeInTheDocument();
  });

  it("lists files it was handed to start with", () => {
    renderArea({
      initialFiles: [{ id: "f1", filename: "existing.pdf", url: "https://x/existing.pdf" }],
    });
    expect(rowText()).toContain("existing.pdf");
    expect(rowText()).toContain("Uploaded");
  });

  it("gives an initial file a fallback id when it has none", () => {
    renderArea({ initialFiles: [{ filename: "existing.pdf", url: "u" }] });
    expect(rows()).toHaveLength(1);
  });

  it("does not open the picker while disabled", () => {
    renderArea({ disabled: true });
    const zone = document.body.querySelector(".w-full > div");
    const click = vi.fn();
    Object.defineProperty(input(), "click", { value: click });
    fireEvent.click(zone);
    expect(click).not.toHaveBeenCalled();
  });
});

describe("accepting files", () => {
  it("uploads a file and reports it back", async () => {
    const onUploadStart = vi.fn();
    const onUploadComplete = vi.fn();
    renderArea({ onUploadStart, onUploadComplete });

    fireEvent.change(input(), { target: { files: [file()] } });
    expect(onUploadStart).toHaveBeenCalled();
    await waitFor(() => expect(onUploadComplete).toHaveBeenCalled());
    expect(uploadImage).toHaveBeenCalledTimes(1);
  });

  it("refuses a file over the size limit", async () => {
    renderArea({ maxSizeMB: 5 });
    fireEvent.change(input(), { target: { files: [file("huge.pdf", 10)] } });
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("huge.pdf is too large", "error")
    );
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("caps a multi-file drop at one when it is a single-file picker", async () => {
    renderArea({ multiple: false });
    drop([file("a.pdf"), file("b.pdf")]);
    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
  });

  it("takes every file when multiple is allowed", async () => {
    renderArea({ multiple: true });
    drop([file("a.pdf"), file("b.pdf")]);
    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(2));
  });

  it("does nothing for an empty selection", () => {
    renderArea();
    fireEvent.change(input(), { target: { files: [] } });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("marks a file failed when the upload does not report success", async () => {
    const onUploadError = vi.fn();
    uploadImage.mockResolvedValue({ success: false });
    renderArea({ onUploadError });
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(screen.getByText("Upload failed")).toBeInTheDocument());
  });

  it("marks a file failed when the upload throws", async () => {
    uploadImage.mockRejectedValue(new Error("network"));
    renderArea();
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(document.body.querySelector(".file-error")).toBeInTheDocument());
  });
});

describe("per-file actions", () => {
  it("removes a file and tells the caller", async () => {
    const onRemove = vi.fn();
    renderArea({ onRemove });
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(rows()).toHaveLength(1));

    fireEvent.click(screen.getByLabelText("Remove file"));
    await waitFor(() => expect(rows()).toHaveLength(0));
    expect(onRemove).toHaveBeenCalled();
  });

  it("offers a retry only on a file that failed", async () => {
    uploadImage.mockRejectedValue(new Error("network"));
    renderArea();
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(screen.getByLabelText("Retry upload")).toBeInTheDocument());

    uploadImage.mockResolvedValue({ success: true, data: [{ url: "u", filename: "report.pdf" }] });
    fireEvent.click(screen.getByLabelText("Retry upload"));
    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(2));
  });

  it("shows no retry on a file that uploaded cleanly", async () => {
    renderArea();
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByLabelText("Retry upload")).not.toBeInTheDocument();
  });
});

describe("file type icons and sizes", () => {
  it.each([
    ["a.pdf"],
    ["a.jpg"],
    ["a.png"],
    ["a.mp4"],
    ["a.docx"],
    ["a.unknown"],
  ])("renders a row for %s", async (name) => {
    renderArea();
    fireEvent.change(input(), { target: { files: [file(name)] } });
    await waitFor(() => expect(rows()).toHaveLength(1));
  });

  it.each([
    [500, /\b500 B\b/],
    [2 * 1024, /\b2 KB\b/],
    [3 * 1024 * 1024, /\b3\.0 MB\b/],
  ])("formats a %s byte file", async (bytes, unit) => {
    renderArea();
    const f = new File(["x"], "a.pdf");
    Object.defineProperty(f, "size", { value: bytes });
    fireEvent.change(input(), { target: { files: [f] } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rowText()).toMatch(unit);
  });

  it("labels a zero-byte file as unknown", async () => {
    renderArea();
    const f = new File([], "empty.pdf");
    Object.defineProperty(f, "size", { value: 0 });
    fireEvent.change(input(), { target: { files: [f] } });
    await waitFor(() => expect(rowText()).toContain("Unknown"));
  });
});

describe("the edges of the upload area", () => {
  it("removes a file with no caller listening", async () => {
    // `onRemove` defaults to a no-op, so a parent that does not care must not
    // take the component down.
    renderArea();
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    fireEvent.click(screen.getByLabelText("Remove file"));
    await waitFor(() => expect(rows()).toHaveLength(0));
  });

  it("uploads with no signed-in user at all", async () => {
    const store = configureStore({
      reducer: { authentication: authReducer },
      preloadedState: { authentication: { isAuthenticated: false, user: null } },
    });
    render(
      <Provider store={store}>
        <FileUploadArea />
      </Provider>
    );
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(uploadImage).toHaveBeenCalled());
    expect(uploadImage.mock.calls[0][0].accessToken).toBeUndefined();
  });

  it("ignores a chooser dismissed without a file", () => {
    renderArea();
    fireEvent.change(input(), { target: { files: [] } });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("ignores an empty drop", () => {
    renderArea();
    drop([]);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("ignores a drop while disabled", () => {
    renderArea({ disabled: true });
    drop([file()]);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("does not open the chooser while disabled", () => {
    renderArea({ disabled: true });
    const spy = vi.spyOn(input(), "click");
    fireEvent.click(document.body.querySelector(".upload-area"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("opens the chooser when it is not disabled", () => {
    renderArea();
    const spy = vi.spyOn(input(), "click");
    fireEvent.click(document.body.querySelector(".upload-area"));
    expect(spy).toHaveBeenCalled();
  });

  it("labels a failure that carries no message of its own", async () => {
    uploadImage.mockRejectedValue({});
    renderArea();
    fireEvent.change(input(), { target: { files: [file()] } });
    await waitFor(() => expect(screen.getByText("Upload failed")).toBeInTheDocument());
  });

  it("offers no retry on a file whose original is gone", async () => {
    // An existing file restored from `initialFiles` has no File object behind
    // it, so retrying it would have nothing to send.
    renderArea({ initialFiles: [{ filename: "existing.pdf", url: "u" }] });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(screen.queryByLabelText("Retry upload")).not.toBeInTheDocument();
  });
});
