import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

/**
 * SignatureCapture offers three ways to sign a clinical report -- type a name,
 * draw one on a canvas, or upload an image -- and a read-only mode that just
 * shows whatever was stored. Drawn and uploaded signatures both come out as
 * base64 data URIs, which is also how the component decides whether a stored
 * value is a picture or a typed name.
 *
 * jsdom has no canvas backend, so `getContext` and `toDataURL` are stubbed
 * here; the drawing tests assert on the calls the pad makes to that context and
 * on the data URI it emits when a stroke ends. The upload path runs through a
 * real FileReader for the success case and a stubbed one for the failure case,
 * since a genuine read error cannot be provoked from a Blob.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
}));

import SignatureCapture from "../Components/SignatureCapture/SignatureCapture";

const PNG = "data:image/png;base64,AAA";

let ctx;
let originalFileReader;

const renderCapture = (props = {}) =>
  render(
    <SignatureCapture
      signatureType="type"
      value=""
      onTypeChange={vi.fn()}
      onChange={vi.fn()}
      {...props}
    />
  );

const typeButton = (label) => screen.getByRole("button", { name: label });
const canvas = () => document.body.querySelector(".sig-canvas");
const fileInput = () => document.body.querySelector('input[type="file"]');

const makeFile = (name, type, size = 1024) => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

beforeEach(() => {
  vi.clearAllMocks();
  ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,DRAWN");
  originalFileReader = globalThis.FileReader;
});

afterEach(() => {
  globalThis.FileReader = originalFileReader;
  vi.restoreAllMocks();
});

describe("the read-only signature", () => {
  it("says so when nothing was ever signed", () => {
    renderCapture({ readOnly: true, value: "" });
    expect(screen.getByText("Not signed")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a stored image as a picture", () => {
    renderCapture({ readOnly: true, value: PNG });
    expect(screen.getByAltText("Signature")).toHaveAttribute("src", PNG);
  });

  it("shows a stored typed name as text", () => {
    renderCapture({ readOnly: true, value: "Ada Lovelace" });
    expect(document.body.querySelector(".sig-typed-preview")).toHaveTextContent(
      "Ada Lovelace"
    );
    expect(screen.queryByAltText("Signature")).toBeNull();
  });

  it("keeps the field's own label", () => {
    renderCapture({ readOnly: true, value: "", label: "Approver signature" });
    expect(screen.getByText("Approver signature")).toBeInTheDocument();
  });
});

describe("the label", () => {
  it("defaults to a plain word with no asterisk", () => {
    renderCapture();
    expect(screen.getByText("Signature")).toBeInTheDocument();
    expect(document.body.querySelector(".sig-required")).toBeNull();
  });

  it("marks the field when a signature is required", () => {
    renderCapture({ required: true, label: "Clinician signature" });
    expect(document.body.querySelector(".sig-required")).toBeInTheDocument();
    expect(screen.getByText("Clinician signature")).toBeInTheDocument();
  });
});

describe("choosing how to sign", () => {
  it("offers all three methods and marks the current one", () => {
    renderCapture({ signatureType: "draw" });
    expect(typeButton("Type")).not.toHaveClass("active");
    expect(typeButton("Draw")).toHaveClass("active");
    expect(typeButton("Image")).not.toHaveClass("active");
  });

  it("marks none of them when no method has been chosen", () => {
    renderCapture({ signatureType: "" });
    expect(document.body.querySelectorAll(".sig-type-btn.active")).toHaveLength(0);
    expect(document.body.querySelector(".sig-input-area")).toBeNull();
  });

  it("throws the old signature away when the method changes", () => {
    const onChange = vi.fn();
    const onTypeChange = vi.fn();
    renderCapture({ signatureType: "type", value: "Ada", onChange, onTypeChange });
    fireEvent.click(typeButton("Draw"));

    expect(onChange).toHaveBeenCalledWith("");
    expect(onTypeChange).toHaveBeenCalledWith("draw");
  });

  it("keeps the signature when the current method is clicked again", () => {
    const onChange = vi.fn();
    const onTypeChange = vi.fn();
    renderCapture({ signatureType: "type", value: "Ada", onChange, onTypeChange });
    fireEvent.click(typeButton("Type"));

    expect(onChange).not.toHaveBeenCalled();
    expect(onTypeChange).toHaveBeenCalledWith("type");
  });
});

describe("typing a signature", () => {
  it("starts empty and reports what is typed", () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "type", value: "", onChange });
    const input = document.body.querySelector(".sig-typed-input");
    expect(input).toHaveValue("");

    fireEvent.change(input, { target: { value: "Ada Lovelace" } });
    expect(onChange).toHaveBeenCalledWith("Ada Lovelace");
  });

  it("shows the typed name back in a script preview", () => {
    renderCapture({ signatureType: "type", value: "Ada Lovelace" });
    expect(document.body.querySelector(".sig-typed-preview")).toHaveTextContent(
      "Ada Lovelace"
    );
  });

  it("shows no preview while nothing has been typed", () => {
    renderCapture({ signatureType: "type", value: "" });
    expect(document.body.querySelector(".sig-typed-preview")).toBeNull();
  });

  it("copes with a value that was never set", () => {
    renderCapture({ signatureType: "type", value: undefined });
    expect(document.body.querySelector(".sig-typed-input")).toHaveValue("");
  });
});

describe("drawing a signature", () => {
  const rect = { left: 10, top: 20, width: 300, height: 120 };

  const setUpCanvas = (props = {}) => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "draw", value: "", onChange, ...props });
    canvas().getBoundingClientRect = () => rect;
    return onChange;
  };

  it("sizes the canvas from its own box on mount", () => {
    renderCapture({ signatureType: "draw" });
    // The stubbed rect is all zeroes, so this only proves the effect ran
    // against the context rather than throwing.
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith("2d");
    expect(ctx.lineWidth).toBe(2);
    expect(ctx.strokeStyle).toBe("#1f2937");
  });

  it("emits a data URI once a stroke finishes", () => {
    const onChange = setUpCanvas();
    fireEvent.mouseDown(canvas(), { clientX: 40, clientY: 60 });
    fireEvent.mouseMove(canvas(), { clientX: 60, clientY: 80 });
    fireEvent.mouseUp(canvas());

    expect(ctx.moveTo).toHaveBeenCalledWith(30, 40);
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 60);
    expect(ctx.stroke).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("data:image/png;base64,DRAWN");
  });

  it("draws nothing while the pointer is merely passing over", () => {
    const onChange = setUpCanvas();
    fireEvent.mouseMove(canvas(), { clientX: 60, clientY: 80 });
    expect(ctx.lineTo).not.toHaveBeenCalled();

    fireEvent.mouseUp(canvas());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("ends the stroke when the pointer leaves the pad", () => {
    const onChange = setUpCanvas();
    fireEvent.mouseDown(canvas(), { clientX: 40, clientY: 60 });
    fireEvent.mouseLeave(canvas());
    expect(onChange).toHaveBeenCalledWith("data:image/png;base64,DRAWN");
  });

  it("takes a stroke from a finger as readily as from a mouse", () => {
    const onChange = setUpCanvas();
    fireEvent.touchStart(canvas(), { touches: [{ clientX: 15, clientY: 25 }] });
    fireEvent.touchMove(canvas(), { touches: [{ clientX: 25, clientY: 35 }] });
    fireEvent.touchEnd(canvas());

    expect(ctx.moveTo).toHaveBeenCalledWith(5, 5);
    expect(ctx.lineTo).toHaveBeenCalledWith(15, 15);
    expect(onChange).toHaveBeenCalledWith("data:image/png;base64,DRAWN");
  });

  it("wipes the pad and the stored signature from Clear", () => {
    const onChange = setUpCanvas({ value: PNG });
    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("confirms a captured signature only once there is one", () => {
    const { rerender } = render(
      <SignatureCapture
        signatureType="draw"
        value=""
        onTypeChange={vi.fn()}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByText("Signature captured")).toBeNull();

    rerender(
      <SignatureCapture
        signatureType="draw"
        value={PNG}
        onTypeChange={vi.fn()}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText("Signature captured")).toBeInTheDocument();
  });
});

describe("uploading a signature image", () => {
  it("invites an upload while nothing has been chosen", () => {
    renderCapture({ signatureType: "image", value: "" });
    expect(screen.getByText("Click to upload a signature image")).toBeInTheDocument();
    expect(fileInput()).toHaveAttribute("accept", "image/*");
  });

  it("stores the chosen image as a data URI", async () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: "", onChange });
    fireEvent.change(fileInput(), {
      target: { files: [makeFile("sig.png", "image/png")] },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(onChange.mock.calls[0][0]).toMatch(/^data:image\/png;base64,/);
    expect(document.body.querySelector(".sig-error")).toBeNull();
  });

  it("ignores a change event that carries no file", () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: "", onChange });
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(onChange).not.toHaveBeenCalled();
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("refuses a file that is not an image", () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: "", onChange });
    fireEvent.change(fileInput(), {
      target: { files: [makeFile("notes.pdf", "application/pdf")] },
    });

    expect(screen.getByText("Please choose an image file")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith("Please choose an image file", "error");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("refuses an image over five megabytes", () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: "", onChange });
    fireEvent.change(fileInput(), {
      target: { files: [makeFile("huge.png", "image/png", 6 * 1024 * 1024)] },
    });

    expect(screen.getByText("Image must be under 5MB")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith("Image must be under 5MB", "error");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports a file it cannot read", () => {
    // A genuine read failure cannot be provoked from a Blob, so the reader is
    // replaced with one that fails on demand.
    globalThis.FileReader = class {
      readAsDataURL() {
        this.onerror();
      }
    };
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: "", onChange });
    fireEvent.change(fileInput(), {
      target: { files: [makeFile("sig.png", "image/png")] },
    });

    expect(screen.getByText("Couldn't read that file")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith("Couldn't read that file", "error");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clears an earlier complaint once a good image arrives", async () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: "", onChange });
    fireEvent.change(fileInput(), {
      target: { files: [makeFile("notes.pdf", "application/pdf")] },
    });
    expect(document.body.querySelector(".sig-error")).toBeInTheDocument();

    fireEvent.change(fileInput(), {
      target: { files: [makeFile("sig.png", "image/png")] },
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(document.body.querySelector(".sig-error")).toBeNull();
  });

  it("previews a stored image instead of the upload box", () => {
    renderCapture({ signatureType: "image", value: PNG });
    expect(screen.getByAltText("Signature")).toHaveAttribute("src", PNG);
    expect(screen.queryByText("Click to upload a signature image")).toBeNull();
  });

  it("treats a typed value in image mode as no image at all", () => {
    renderCapture({ signatureType: "image", value: "Ada Lovelace" });
    expect(screen.getByText("Click to upload a signature image")).toBeInTheDocument();
  });

  it("throws the stored image away from the remove button", () => {
    const onChange = vi.fn();
    renderCapture({ signatureType: "image", value: PNG, onChange });
    fireEvent.click(screen.getByLabelText("Remove signature image"));
    expect(onChange).toHaveBeenCalledWith("");
  });
});
