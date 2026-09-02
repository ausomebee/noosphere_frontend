import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * FileUploadArea is the drop zone used by the document modals: it takes files
 * from a hidden input or from a drop, rejects anything over the size limit,
 * pushes each one at the image endpoint in turn, and shows a per-row progress
 * bar, a tick, a delete button and -- once a row has failed -- a retry button.
 *
 * The progress bar is a `setInterval` simulation rather than real upload
 * progress, so these tests run on fake timers and step the clock by hand. The
 * upload itself is a promise, so a test that wants to see progress mid-flight
 * holds the api's promise open, ticks the clock, and only then resolves it.
 *
 * The tokens come from the redux `authentication` slice, which is read through
 * a mocked `useSelector` over a plain object so the "no user yet" arm is one
 * line away.
 */

const uploadApi = vi.hoisted(() => ({ UploadImage: vi.fn() }));
vi.mock("../api/ImageUpload", () => ({ default: uploadApi }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

const redux = vi.hoisted(() => ({ state: {} }));
vi.mock("react-redux", () => ({
  useSelector: (selector) => selector(redux.state),
}));

import FileUploadArea from "../Components/FileUpload/FileUploadArea";

// `initialFiles` sits in an effect's dependency list, so every render must be
// handed the same array identity or the effect loops.
const NO_FILES = [];

const makeFile = (name, sizeInBytes = 1024) => {
  const file = new File(["x"], name, { type: "application/octet-stream" });
  Object.defineProperty(file, "size", { value: sizeInBytes });
  return file;
};

const renderArea = (props = {}) =>
  render(<FileUploadArea onUploadComplete={vi.fn()} initialFiles={NO_FILES} {...props} />);

const input = () => document.body.querySelector('input[type="file"]');
const dropZone = () => document.body.querySelector(".upload-area");

// The change handler reads `e.target.files`, which fireEvent will happily set
// to a plain array -- `Array.from` treats it the same as a FileList.
const chooseFiles = async (files) => {
  await act(async () => {
    fireEvent.change(input(), { target: { files } });
  });
};

const rows = () => Array.from(document.body.querySelectorAll(".file-item"));
const rowText = () => rows().map((r) => r.querySelector(".file-name").textContent);
const progressText = () =>
  Array.from(document.body.querySelectorAll(".progress-text")).map((p) => p.textContent);

const uploaded = (over = {}) => ({
  success: true,
  data: [{ url: "https://cdn/one.pdf", filename: "one.pdf", ...over }],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  redux.state = { authentication: { user: { accessToken: "at", refreshToken: "rt" } } };
  uploadApi.UploadImage.mockResolvedValue(uploaded());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the empty drop zone", () => {
  it("invites a click or a drop and lists nothing yet", () => {
    renderArea();
    expect(screen.getByText("Click to upload or drag and drop")).toBeInTheDocument();
    expect(rows()).toHaveLength(0);
  });

  it("passes the accepted extensions straight to the input", () => {
    renderArea({ accept: ".pdf" });
    expect(input()).toHaveAttribute("accept", ".pdf");
  });

  it("defaults to the full set of extensions", () => {
    renderArea();
    expect(input().getAttribute("accept")).toBe(".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp4");
  });

  it("opens the file dialog when the zone is clicked", () => {
    renderArea();
    const click = vi.spyOn(input(), "click").mockImplementation(() => {});
    fireEvent.click(dropZone());
    expect(click).toHaveBeenCalled();
  });

  it("stays shut, and refuses a drop, while it is disabled", async () => {
    renderArea({ disabled: true });
    const click = vi.spyOn(input(), "click").mockImplementation(() => {});
    fireEvent.click(dropZone());
    expect(click).not.toHaveBeenCalled();
    expect(dropZone()).toHaveClass("is-disabled");

    await act(async () => {
      fireEvent.drop(dropZone(), { dataTransfer: { files: [makeFile("a.pdf")] } });
    });
    expect(uploadApi.UploadImage).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(0);
  });

  it("ignores a change event that carries no files", async () => {
    renderArea();
    await chooseFiles([]);
    expect(uploadApi.UploadImage).not.toHaveBeenCalled();
  });
});

describe("files handed over at mount", () => {
  it("shows each existing file as already uploaded", () => {
    const existing = [
      { id: "f1", filename: "consent.pdf", url: "https://cdn/consent.pdf" },
      { filename: "scan.png", fileUrl: "https://cdn/scan.png" },
    ];
    renderArea({ initialFiles: existing });

    expect(rowText()).toEqual(["consent.pdf • Uploaded", "scan.png • Uploaded"]);
    expect(progressText()).toEqual(["100%", "100%"]);
    expect(document.body.querySelectorAll(".file-success")).toHaveLength(2);
  });

  it("names an existing file that arrived without one", () => {
    renderArea({ initialFiles: [{ url: "https://cdn/x" }] });
    expect(rowText()).toEqual(["Unknown File • Uploaded"]);
  });

  it("renders nothing at all for an empty list", () => {
    renderArea({ initialFiles: NO_FILES });
    expect(document.body.querySelector(".file-list")).toBeNull();
  });
});

describe("the icon each row gets", () => {
  const iconClass = () =>
    document.body.querySelector(".file-info svg").getAttribute("class");

  it.each([
    ["report.pdf", "text-red-600"],
    ["photo.JPEG", "text-green-600"],
    ["clip.mov", "text-purple-600"],
    ["notes.docx", "text-blue-600"],
    ["archive.zip", "text-gray-600"],
  ])("marks %s with the %s icon", (filename, expected) => {
    renderArea({ initialFiles: [{ filename, url: "u" }] });
    expect(iconClass()).toContain(expected);
  });
});

describe("uploading a file", () => {
  it("sends the file up and reports the result to the parent", async () => {
    const onUploadComplete = vi.fn();
    renderArea({ onUploadComplete });
    await chooseFiles([makeFile("one.pdf", 2048)]);

    expect(uploadApi.UploadImage).toHaveBeenCalledWith({
      formData: expect.any(FormData),
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(onUploadComplete).toHaveBeenCalledWith([
      { filename: "one.pdf", url: "https://cdn/one.pdf" },
    ]);
    expect(rowText()).toEqual(["one.pdf • 2 KB"]);
    expect(progressText()).toEqual(["100%"]);
  });

  it("uploads without tokens when no user is signed in yet", async () => {
    redux.state = {};
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    expect(uploadApi.UploadImage).toHaveBeenCalledWith({
      formData: expect.any(FormData),
      accessToken: undefined,
      refreshToken: undefined,
    });
  });

  it("uploads a dropped file the same way", async () => {
    const onUploadComplete = vi.fn();
    renderArea({ onUploadComplete });
    await act(async () => {
      fireEvent.drop(dropZone(), { dataTransfer: { files: [makeFile("drop.pdf")] } });
    });
    expect(onUploadComplete).toHaveBeenCalledTimes(1);
    expect(rowText()).toEqual(["drop.pdf • 1 KB"]);
  });

  it("uploads a whole batch one after another", async () => {
    const onUploadComplete = vi.fn();
    uploadApi.UploadImage.mockResolvedValueOnce(uploaded({ filename: "a.pdf" }))
      .mockResolvedValueOnce(uploaded({ filename: "b.pdf" }));
    renderArea({ onUploadComplete });
    await chooseFiles([makeFile("a.pdf"), makeFile("b.pdf")]);

    expect(uploadApi.UploadImage).toHaveBeenCalledTimes(2);
    expect(onUploadComplete).toHaveBeenCalledWith([
      { filename: "a.pdf", url: "https://cdn/one.pdf" },
      { filename: "b.pdf", url: "https://cdn/one.pdf" },
    ]);
    expect(rows()).toHaveLength(2);
  });

  it("keeps the rows from an earlier batch and appends the new one", async () => {
    renderArea();
    await chooseFiles([makeFile("first.pdf")]);
    await chooseFiles([makeFile("second.pdf")]);
    expect(rowText()).toEqual(["first.pdf • 1 KB", "second.pdf • 1 KB"]);
    expect(progressText()).toEqual(["100%", "100%"]);
  });

  it("walks the progress bar up while the upload is still in flight", async () => {
    let release;
    uploadApi.UploadImage.mockReturnValue(new Promise((r) => (release = r)));
    renderArea();
    await chooseFiles([makeFile("slow.pdf")]);
    expect(progressText()).toEqual(["0%"]);

    await act(async () => {
      vi.advanceTimersByTime(450);
    });
    expect(progressText()).toEqual(["30%"]);

    await act(async () => {
      release(uploaded());
    });
    expect(progressText()).toEqual(["100%"]);
  });

  it("stops the simulation once it reaches the top", async () => {
    uploadApi.UploadImage.mockReturnValue(new Promise(() => {}));
    renderArea();
    await chooseFiles([makeFile("stuck.pdf")]);
    await act(async () => {
      vi.advanceTimersByTime(150 * 12);
    });
    // The interval clears itself at 100 rather than running past it.
    expect(progressText()).toEqual(["100%"]);
  });
});

describe("a file that cannot be uploaded", () => {
  it("rejects anything over the size limit before it is sent", async () => {
    const onUploadComplete = vi.fn();
    renderArea({ onUploadComplete, maxSizeMB: 1 });
    await chooseFiles([makeFile("huge.pdf", 2 * 1024 * 1024)]);

    expect(toast.showToast).toHaveBeenCalledWith({
      message: "huge.pdf is too large",
      type: "error",
    });
    expect(uploadApi.UploadImage).not.toHaveBeenCalled();
    expect(rows()).toHaveLength(0);
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it("uploads the acceptable half of a mixed batch", async () => {
    renderArea({ maxSizeMB: 1 });
    await chooseFiles([makeFile("huge.pdf", 5 * 1024 * 1024), makeFile("small.pdf")]);
    expect(uploadApi.UploadImage).toHaveBeenCalledTimes(1);
    expect(rowText()).toEqual(["small.pdf • 1 KB"]);
  });

  it("uses the default 50MB limit when none is given", async () => {
    renderArea();
    await chooseFiles([makeFile("big.pdf", 60 * 1024 * 1024)]);
    expect(uploadApi.UploadImage).not.toHaveBeenCalled();
  });

  it("shows the server's error when the upload resolves unsuccessfully", async () => {
    const onUploadComplete = vi.fn();
    uploadApi.UploadImage.mockResolvedValue({ success: false, error: "Bucket is full" });
    renderArea({ onUploadComplete });
    await chooseFiles([makeFile("one.pdf")]);

    expect(screen.getByText("Bucket is full")).toBeInTheDocument();
    expect(document.body.querySelector(".progress-bar")).toBeNull();
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Failed to upload one.pdf",
      type: "error",
    });
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it("falls back to a generic message when the failure names no reason", async () => {
    uploadApi.UploadImage.mockResolvedValue({ success: false });
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("treats a successful response with no payload as a failure", async () => {
    uploadApi.UploadImage.mockResolvedValue({ success: true, data: [] });
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("shows the thrown message when the request itself blows up", async () => {
    uploadApi.UploadImage.mockRejectedValue(new Error("Network down"));
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("still labels a rejection that carries no message", async () => {
    uploadApi.UploadImage.mockRejectedValue({ status: 500 });
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("still reports the ones that did work in a half-failed batch", async () => {
    const onUploadComplete = vi.fn();
    uploadApi.UploadImage.mockResolvedValueOnce({ success: false, error: "nope" })
      .mockResolvedValueOnce(uploaded({ filename: "b.pdf" }));
    renderArea({ onUploadComplete });
    await chooseFiles([makeFile("a.pdf"), makeFile("b.pdf")]);

    expect(onUploadComplete).toHaveBeenCalledWith([
      { filename: "b.pdf", url: "https://cdn/one.pdf" },
    ]);
    expect(screen.getByText("nope")).toBeInTheDocument();
  });
});

describe("removing a row", () => {
  it("drops the row, tells the parent and says so", async () => {
    const onRemove = vi.fn();
    renderArea({ onRemove });
    await chooseFiles([makeFile("one.pdf")]);
    fireEvent.click(screen.getByLabelText("Remove file"));

    expect(rows()).toHaveLength(0);
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ name: "one.pdf" }));
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "File one.pdf removed",
      type: "info",
    });
  });

  it("removes happily with no listener attached", async () => {
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    fireEvent.click(screen.getByLabelText("Remove file"));
    expect(rows()).toHaveLength(0);
  });

  it("removes only the row that was clicked", async () => {
    renderArea();
    await chooseFiles([makeFile("a.pdf"), makeFile("b.pdf")]);
    fireEvent.click(screen.getAllByLabelText("Remove file")[0]);
    expect(rowText()).toEqual(["b.pdf • 1 KB"]);
  });
});

describe("retrying a failed row", () => {
  const failThenRender = async () => {
    uploadApi.UploadImage.mockResolvedValue({ success: false, error: "nope" });
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
  };

  it("keeps the retry button away from a row that uploaded cleanly", async () => {
    renderArea();
    await chooseFiles([makeFile("one.pdf")]);
    expect(screen.queryByLabelText("Retry upload")).toBeNull();
  });

  it("offers a retry button on a row that failed", async () => {
    await failThenRender();
    expect(screen.getByLabelText("Retry upload")).toBeInTheDocument();
  });

  it("clears the error and runs the progress simulation to the end", async () => {
    await failThenRender();
    fireEvent.click(screen.getByLabelText("Retry upload"));

    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Retrying upload for one.pdf",
      type: "info",
    });
    expect(screen.queryByText("nope")).toBeNull();
    expect(progressText()).toEqual(["0%"]);

    await act(async () => {
      vi.advanceTimersByTime(300 * 5);
    });
    expect(progressText()).toEqual(["50%"]);

    await act(async () => {
      vi.advanceTimersByTime(300 * 5);
    });
    expect(progressText()).toEqual(["100%"]);
    expect(toast.showToast).toHaveBeenCalledWith({
      message: "Retry upload simulation completed for one.pdf",
      type: "success",
    });
    // The retry is a simulation only: nothing is sent a second time.
    expect(uploadApi.UploadImage).toHaveBeenCalledTimes(1);
  });
});
