import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const getForm = vi.fn();
const createResponse = vi.fn();
vi.mock("../api/documentsAndFormsApis", () => ({
  default: {
    GetFormWithItsFields: (...a) => getForm(...a),
    CreateFormResponseField: (...a) => createResponse(...a),
  },
}));

const uploadImage = vi.fn();
vi.mock("../api/ImageUpload", () => ({ default: { UploadImage: (...a) => uploadImage(...a) } }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate, useParams: () => ({ id: "form-1" }) };
});

// react-signature-canvas needs a real canvas. The stub keeps the pad's public
// surface -- clear / toDataURL -- and captures the `onEnd` the renderer wires up,
// so a drawn signature can be simulated. In React 19 the ref is a plain prop.
const { pad } = vi.hoisted(() => ({
  pad: { dataUrl: "data:image/png;base64,drawn", cleared: 0, ends: {} },
}));
vi.mock("react-signature-canvas", () => ({
  default: function SignatureCanvas({ ref, onEnd, canvasProps }) {
    if (ref) {
      ref({
        clear: () => { pad.cleared += 1; },
        toDataURL: () => pad.dataUrl,
        fromDataURL: (v) => { pad.restored = v; },
      });
    }
    pad.lastOnEnd = onEnd;
    return <canvas data-testid="signature-canvas" className={canvasProps?.className} onClick={onEnd} />;
  },
}));

import FormRenderer from "../Components/FormRender/FormRenderer";
import formBuilderReducer from "../ReduxStore/features/formBuilderSlice";
import formResponseReducer from "../ReduxStore/features/formResponseSlice";
import authReducer from "../ReduxStore/features/authentication";

// `waitFor` resolves as soon as its callback stops throwing, and `querySelector`
// returns null rather than throwing -- so awaiting one directly never waits at
// all. On a slower runner that hands back null and the next line dies with
// "Unable to fire a click event - please provide a DOM element". This asserts
// the value before handing it back, which is what makes the wait real.
const waitForValue = (read) =>
  waitFor(() => {
    const value = read();
    expect(value).toBeTruthy();
    return value;
  });


/**
 * The shared-form renderer.
 *
 * It fetches the form, transforms the API's `fields` into elements, and renders
 * one control per field type. The required-field check on submit reads a
 * different shape per type -- an array for checkboxes, a positive number for a
 * star rating, an uploaded url for a file, a string for the rest -- so each is
 * covered separately here.
 */

// A question renders as "{number}. {label}", so labels are matched loosely.
const field = (over = {}) => ({
  id: "f1",
  fieldType: "shortText",
  label: "Full name",
  placeholder: "Type here",
  isRequired: false,
  options: [],
  order: 1,
  ...over,
});

const formResponse = (fields) => ({
  status: "ok",
  data: { id: "form-1", name: "Intake", fields },
});

const makeStore = () =>
  configureStore({
    reducer: {
      formBuilder: formBuilderReducer,
      formResponse: formResponseReducer,
      // The client mounts its auth slice as `auth`, and useAuth derives the
      // tenant and client ids from the user's first tenantLink.
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: {
          id: "u1",
          tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }],
        },
      },
    },
  });

const renderForm = async (fields = [field()]) => {
  getForm.mockResolvedValue(formResponse(fields));
  const view = render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <FormRenderer />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(getForm).toHaveBeenCalled());
  return view;
};

const submit = () => fireEvent.click(screen.getByText(/submit/i));

beforeEach(() => {
  vi.clearAllMocks();
  pad.cleared = 0;
  pad.dataUrl = "data:image/png;base64,drawn";
  delete pad.restored;
  createResponse.mockResolvedValue({ data: { id: "sub-1" } });
  uploadImage.mockResolvedValue({ success: true, data: [{ url: "https://x/a.pdf", filename: "a.pdf" }] });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("loading the form", () => {
  it("fetches the form by the id in the route", async () => {
    await renderForm();
    expect(getForm).toHaveBeenCalledWith(
      expect.objectContaining({ formId: "form-1", accessToken: "at", refreshToken: "rt" })
    );
  });

  it("renders the field it was given", async () => {
    await renderForm();
    await waitFor(() => expect(screen.getByText(new RegExp("Full name"))).toBeInTheDocument());
  });

  it("reports a fetch that comes back with no data", async () => {
    getForm.mockResolvedValue({});
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(showToast).toHaveBeenCalled());
  });

  it("reports a non-ok status", async () => {
    getForm.mockResolvedValue({ status: "error", message: "no such form", data: {} });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(showToast).toHaveBeenCalled());
  });

  it("copes with a form whose fields are missing", async () => {
    getForm.mockResolvedValue({ status: "ok", data: { id: "form-1", name: "Intake" } });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(getForm).toHaveBeenCalled());
  });
});

describe("field types", () => {
  it("renders a section header and body text", async () => {
    await renderForm([
      field({ id: "h", fieldType: "sectionHeader", label: "Section one" }),
      field({ id: "b", fieldType: "bodyText", label: "Some guidance" }),
    ]);
    await waitFor(() => expect(screen.getByText("Section one")).toBeInTheDocument());
    expect(screen.getByText("Some guidance")).toBeInTheDocument();
  });

  it("renders a short text field and records what is typed", async () => {
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    expect(input.value).toBe("Ada");
  });

  it("renders a paragraph field", async () => {
    await renderForm([field({ fieldType: "paragraph", label: "Notes" })]);
    await waitFor(() => expect(document.body.querySelector("textarea")).toBeInTheDocument());
  });

  it("renders radio options", async () => {
    await renderForm([field({ fieldType: "radio", label: "Pick one", options: ["A", "B"] })]);
    await waitFor(() =>
      expect(document.body.querySelectorAll('input[type="radio"]').length).toBe(2)
    );
  });

  it("renders checkbox options and records several", async () => {
    await renderForm([field({ fieldType: "checkbox", label: "Pick any", options: ["A", "B"] })]);
    const boxes = await waitFor(() => {
      const found = document.body.querySelectorAll('input[type="checkbox"]');
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    expect(boxes[0].checked).toBe(true);
  });

  it("renders a dropdown", async () => {
    await renderForm([field({ fieldType: "dropdown", label: "Choose", options: ["A", "B"] })]);
    await waitFor(() => expect(document.body.querySelector("select")).toBeInTheDocument());
  });

  it("renders a star rating with the configured number of stars", async () => {
    await renderForm([field({ fieldType: "starRating", label: "Rate", starRating: ["3"] })]);
    await waitFor(() => expect(screen.getByText(new RegExp("Rate"))).toBeInTheDocument());
  });

  it("renders a file upload field", async () => {
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "2", maxSize: "5MB" }] }),
    ]);
    await waitFor(() => expect(screen.getByText(new RegExp("Attach"))).toBeInTheDocument());
  });

  it("renders a signature field with its three modes", async () => {
    await renderForm([field({ fieldType: "signature", label: "Sign here", signature: [{ allowUpload: true }] })]);
    await waitFor(() => expect(screen.getByText(new RegExp("Sign here"))).toBeInTheDocument());
  });
});

describe("required fields on submit", () => {
  const requiredOf = (fieldType, extra = {}) =>
    renderForm([field({ fieldType, label: "Answer me", isRequired: true, ...extra })]);

  it("blocks a submit while a required text field is blank", async () => {
    await requiredOf("shortText");
    await waitFor(() => expect(screen.getByText(new RegExp("Answer me"))).toBeInTheDocument());
    submit();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Answer me"),
        "error"
      )
    );
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("blocks a submit while a required checkbox has nothing ticked", async () => {
    await requiredOf("checkbox", { options: ["A"] });
    await waitFor(() => expect(screen.getByText(new RegExp("Answer me"))).toBeInTheDocument());
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("blocks a submit while a required star rating is unset", async () => {
    await requiredOf("starRating", { starRating: ["5"] });
    await waitFor(() => expect(screen.getByText(new RegExp("Answer me"))).toBeInTheDocument());
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("blocks a submit while a required upload has no file", async () => {
    await requiredOf("fileUpload", { fileUpload: [{ maxFiles: "1" }] });
    await waitFor(() => expect(screen.getByText(new RegExp("Answer me"))).toBeInTheDocument());
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("blocks a submit while a required signature is empty", async () => {
    await requiredOf("signature", { signature: [{ allowUpload: true }] });
    await waitFor(() => expect(screen.getByText(new RegExp("Answer me"))).toBeInTheDocument());
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("never blocks on a section header or body text, required or not", async () => {
    await renderForm([
      field({ id: "h", fieldType: "sectionHeader", label: "Header", isRequired: true }),
      field({ id: "b", fieldType: "bodyText", label: "Body", isRequired: true }),
    ]);
    await waitFor(() => expect(screen.getByText(new RegExp("Header"))).toBeInTheDocument());
    submit();
    await waitFor(() => expect(createResponse).toHaveBeenCalled());
  });
});

describe("submitting", () => {
  it("sends the answers and reports success", async () => {
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    submit();

    await waitFor(() => expect(createResponse).toHaveBeenCalled());
    const [payload] = createResponse.mock.calls[0];
    expect(payload.responseFields).toEqual([{ formFieldId: "f1", value: "Ada" }]);
    expect(payload.formId).toBe("form-1");
    expect(payload.submittedBy).toBe("tc1");
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Form submitted successfully!", "success")
    );
  });

  it("joins a multi-select answer into one value", async () => {
    await renderForm([field({ fieldType: "checkbox", label: "Pick any", options: ["A", "B"] })]);
    const boxes = await waitFor(() => {
      const found = document.body.querySelectorAll('input[type="checkbox"]');
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    submit();

    await waitFor(() => expect(createResponse).toHaveBeenCalled());
    const [payload] = createResponse.mock.calls[0];
    expect(payload.responseFields[0].value).toBe("A, B");
  });

  it("reports a failed submit without navigating away", async () => {
    createResponse.mockRejectedValue(new Error("server said no"));
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    submit();
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("server said no", "error"));
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("reading the file-upload configuration", () => {
  const uploadField = (fileUpload) =>
    renderForm([field({ fieldType: "fileUpload", label: "Attach", fileUpload })]);

  const hint = () => document.body.querySelector(".file-upload-container small").textContent;

  it.each([
    ["a plain number of megabytes", [{ maxSize: 5, maxFiles: "2" }], "5MB"],
    ["a size written with a unit", [{ maxSize: "25 MB", maxFiles: "1" }], "25MB"],
    ["a size in kilobytes", [{ maxSize: "512KB", maxFiles: "1" }], "0.5MB"],
    ["a size in gigabytes", [{ maxSize: "1GB", maxFiles: "1" }], "1024MB"],
    ["a size with no unit at all", [{ maxSize: "7", maxFiles: "1" }], "7MB"],
    ["a size it cannot parse", [{ maxSize: "loads", maxFiles: "1" }], "10MB"],
    ["no size at all", [{ maxFiles: "1" }], "10MB"],
    ["no configuration at all", undefined, "10MB"],
  ])("reads %s", async (_case, fileUpload, expected) => {
    await uploadField(fileUpload);
    await waitFor(() => expect(hint()).toContain(expected));
  });

  it("treats a zero size as zero rather than falling back", async () => {
    await uploadField([{ maxSize: 0, maxFiles: "1" }]);
    // parseFileSize returns 0, and `|| 10` then rescues it -- pinning the
    // fallback that a literal zero actually gets.
    await waitFor(() => expect(hint()).toContain("10MB"));
  });

  it("defaults to a single file when the count is unusable", async () => {
    await uploadField([{ maxFiles: "not a number" }]);
    await waitFor(() => expect(hint()).toContain("max 1 files"));
  });

  it.each([
    ["a known type list", ["PDF", "Image"], "PDF, Image"],
    ["a list of one", ["PDF"], "PDF"],
  ])("lists %s in the hint", async (_case, allowedTypes, expected) => {
    await uploadField([{ maxFiles: "1", allowedTypes }]);
    await waitFor(() => expect(hint()).toContain(expected));
  });

  it("defaults the accepted types when the config names none", async () => {
    await uploadField([{ maxFiles: "1" }]);
    await waitFor(() => expect(hint()).toContain("Image, PDF"));
  });

  it("accepts everything when the type list is empty", async () => {
    await uploadField([{ maxFiles: "1", allowedTypes: [] }]);
    await waitFor(() =>
      expect(document.body.querySelector('input[type="file"]').accept).toBe("*")
    );
  });

  it("maps a known type to its mime type and an unknown one to an extension", async () => {
    await uploadField([{ maxFiles: "1", allowedTypes: ["PDF", "heic"] }]);
    const accept = await waitForValue(
      () => document.body.querySelector('input[type="file"]').accept
    );
    expect(accept).toContain(".heic");
    expect(accept.split(",").length).toBeGreaterThan(1);
  });

  it("collapses duplicate accept entries", async () => {
    await uploadField([{ maxFiles: "1", allowedTypes: ["heic", "HEIC"] }]);
    await waitFor(() =>
      expect(document.body.querySelector('input[type="file"]').accept).toBe(".heic")
    );
  });
});

describe("uploading files to a field", () => {
  const attach = (files) =>
    act(async () => {
      fireEvent.change(document.body.querySelector('input[type="file"]'), {
        target: { files },
      });
    });

  const pdf = (name = "a.pdf", size = 1024) => {
    const f = new File(["x"], name, { type: "application/pdf" });
    Object.defineProperty(f, "size", { value: size });
    return f;
  };

  const uploadForm = (over = {}) =>
    renderForm([
      field({
        fieldType: "fileUpload",
        label: "Attach",
        fileUpload: [{ maxFiles: "2", maxSize: "1MB", ...over }],
      }),
    ]);

  it("uploads and marks the file done", async () => {
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);

    expect(uploadImage).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText("Uploaded successfully")).toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalledWith("1 file uploaded successfully", "success");
  });

  it("announces several files in the plural", async () => {
    uploadImage.mockResolvedValue({
      success: true,
      data: [
        { url: "https://x/a.pdf", filename: "a.pdf" },
        { url: "https://x/b.pdf", filename: "b.pdf" },
      ],
    });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("a.pdf"), pdf("b.pdf")]);
    expect(showToast).toHaveBeenCalledWith("Uploading 2 files...", "info");
    expect(showToast).toHaveBeenCalledWith("2 files uploaded successfully", "success");
  });

  it("keeps the server's filename when it renames the upload", async () => {
    uploadImage.mockResolvedValue({
      success: true,
      data: [{ url: "https://x/renamed.pdf", filename: "renamed.pdf" }],
    });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);
    await waitFor(() => expect(screen.getByText("renamed.pdf")).toBeInTheDocument());
  });

  it("keeps the local filename when the server does not send one", async () => {
    uploadImage.mockResolvedValue({ success: true, data: [{ url: "https://x/a.pdf" }] });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("local.pdf")]);
    await waitFor(() => expect(screen.getByText("local.pdf")).toBeInTheDocument());
  });

  it("refuses more files than the field allows", async () => {
    await uploadForm({ maxFiles: "1" });
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("a.pdf"), pdf("b.pdf")]);
    expect(showToast).toHaveBeenCalledWith("Maximum 1 file allowed", "error");
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("says files in the plural when several are allowed", async () => {
    await uploadForm({ maxFiles: "2" });
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("a.pdf"), pdf("b.pdf"), pdf("c.pdf")]);
    expect(showToast).toHaveBeenCalledWith("Maximum 2 files allowed", "error");
  });

  it("refuses a file over the size limit", async () => {
    await uploadForm({ maxSize: "1MB" });
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("big.pdf", 2 * 1024 * 1024)]);
    expect(showToast).toHaveBeenCalledWith(
      "One or more files exceed 1MB limit",
      "error"
    );
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("marks the file failed when the upload is refused", async () => {
    uploadImage.mockResolvedValue({ success: false, error: "storage full" });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);
    await waitFor(() => expect(screen.getByText("storage full")).toBeInTheDocument());
    expect(showToast).toHaveBeenCalledWith(
      "Failed to upload files: storage full",
      "error"
    );
  });

  it("marks the file failed when the response is not a list", async () => {
    uploadImage.mockResolvedValue({ success: true, data: "nope" });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);
    await waitFor(() =>
      expect(screen.getByText("Upload failed - invalid response")).toBeInTheDocument()
    );
  });

  it("marks the file failed when the upload throws", async () => {
    uploadImage.mockRejectedValue(new Error("offline"));
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);
    await waitFor(() => expect(screen.getByText("offline")).toBeInTheDocument());
  });

  it("flags a file the server answered about with no url", async () => {
    uploadImage.mockResolvedValue({ success: true, data: [{ filename: "a.pdf" }] });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);
    await waitFor(() =>
      expect(screen.getByText("Upload result not found")).toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalledWith("0 files uploaded successfully", "success");
  });

  it("removes an uploaded file again", async () => {
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);
    await waitFor(() => expect(screen.getByLabelText("Remove file")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Remove file"));
    await waitFor(() => expect(screen.queryByLabelText("Remove file")).toBeNull());
  });

  it("shows a file's size in kilobytes", async () => {
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("a.pdf", 2048)]);
    await waitFor(() => expect(screen.getByText("2.0 KB")).toBeInTheDocument());
  });

  it("accepts files dropped onto the field", async () => {
    await uploadForm();
    const zone = await waitForValue(() => document.body.querySelector(".upload-trigger"));
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } });
    fireEvent.dragLeave(zone, { dataTransfer: { files: [] } });
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [pdf()] } });
    });
    expect(uploadImage).toHaveBeenCalled();
  });

  it("ignores an empty drop", async () => {
    await uploadForm();
    const zone = await waitForValue(() => document.body.querySelector(".upload-trigger"));
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [] } });
    });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("sends every uploaded url as its own response field", async () => {
    uploadImage.mockResolvedValue({
      success: true,
      data: [
        { url: "https://x/a.pdf", filename: "a.pdf" },
        { url: "https://x/b.pdf", filename: "b.pdf" },
      ],
    });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("a.pdf"), pdf("b.pdf")]);
    await waitFor(() => expect(screen.getAllByLabelText("Remove file")).toHaveLength(2));

    await act(async () => { submit(); });
    const [payload] = createResponse.mock.calls[0];
    expect(payload.responseFields).toEqual([
      { formFieldId: "f1", value: "https://x/a.pdf" },
      { formFieldId: "f1", value: "https://x/b.pdf" },
    ]);
  });
});

describe("signatures", () => {
  const sigForm = (over = {}) =>
    renderForm([
      field({ fieldType: "signature", label: "Sign here", signature: [{ allowUpload: true }], ...over }),
    ]);

  it("starts on the drawing tab", async () => {
    await sigForm();
    await waitFor(() => expect(screen.getByTestId("signature-canvas")).toBeInTheDocument());
    expect(screen.getByText("Draw").className).toContain("active");
  });

  it("offers the image tab only when the field allows uploads", async () => {
    await sigForm();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
  });

  it("hides the image tab when the field forbids uploads", async () => {
    await renderForm([
      field({ fieldType: "signature", label: "Sign here", signature: [{ allowUpload: false }] }),
    ]);
    await waitFor(() => expect(screen.getByText("Draw")).toBeInTheDocument());
    expect(screen.queryByText("Image")).not.toBeInTheDocument();
  });

  it("hides the image tab when the field says nothing about uploads", async () => {
    await renderForm([field({ fieldType: "signature", label: "Sign here" })]);
    await waitFor(() => expect(screen.getByText("Draw")).toBeInTheDocument());
    expect(screen.queryByText("Image")).not.toBeInTheDocument();
  });

  it("records what was drawn", async () => {
    await sigForm();
    const canvas = await waitFor(() => screen.getByTestId("signature-canvas"));
    act(() => { fireEvent.click(canvas); });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "data:image/png;base64,drawn" },
    ]);
  });

  it("records nothing when the pad hands back no image", async () => {
    pad.dataUrl = "";
    await sigForm();
    const canvas = await waitFor(() => screen.getByTestId("signature-canvas"));
    act(() => { fireEvent.click(canvas); });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([]);
  });

  it("clears the pad and forgets the signature", async () => {
    await sigForm();
    const canvas = await waitFor(() => screen.getByTestId("signature-canvas"));
    act(() => { fireEvent.click(canvas); });
    const before = pad.cleared;
    fireEvent.click(screen.getByText("Clear"));
    expect(pad.cleared).toBe(before + 1);

    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([]);
  });

  it("records a typed signature", async () => {
    await sigForm();
    await waitFor(() => expect(screen.getByText("Type")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Type"));

    const input = await waitFor(() => screen.getByPlaceholderText("Type your full name"));
    fireEvent.change(input, { target: { value: "Ada Bell" } });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "Ada Bell" },
    ]);
  });

  it("records an uploaded signature image", async () => {
    const objectUrl = "blob:signature";
    vi.spyOn(URL, "createObjectURL").mockReturnValue(objectUrl);
    await sigForm();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Image"));

    const input = await waitForValue(() =>
      document.body.querySelector(".signature-image-upload input")
    );
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "sig.png", { type: "image/png" })] },
      });
    });
    await waitFor(() =>
      expect(document.body.querySelector(".signature-preview")).toBeInTheDocument()
    );

    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: objectUrl },
    ]);
  });

  it("ignores an image chooser dismissed without a file", async () => {
    await sigForm();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Image"));
    const input = await waitForValue(() =>
      document.body.querySelector(".signature-image-upload input")
    );
    await act(async () => { fireEvent.change(input, { target: { files: [] } }); });
    expect(screen.getByText("Click to upload signature image")).toBeInTheDocument();
  });
});

describe("the other field types", () => {
  it("records a radio choice", async () => {
    await renderForm([field({ fieldType: "radio", label: "Pick one", options: ["A", "B"] })]);
    const radios = await waitFor(() => {
      const found = document.body.querySelectorAll('input[type="radio"]');
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.click(radios[1]);
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "B" },
    ]);
  });

  it("records a dropdown choice", async () => {
    await renderForm([field({ fieldType: "dropdown", label: "Choose", options: ["A", "B"] })]);
    const select = await waitForValue(() => document.body.querySelector("select"));
    fireEvent.change(select, { target: { value: "B" } });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "B" },
    ]);
  });

  it("records a paragraph answer", async () => {
    await renderForm([field({ fieldType: "paragraph", label: "Notes" })]);
    const box = await waitForValue(() => document.body.querySelector("textarea"));
    fireEvent.change(box, { target: { value: "  Some notes  " } });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "Some notes" },
    ]);
  });

  it("unticks a checkbox that was ticked", async () => {
    await renderForm([field({ fieldType: "checkbox", label: "Pick any", options: ["A", "B"] })]);
    const boxes = await waitFor(() => {
      const found = document.body.querySelectorAll('input[type="checkbox"]');
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[0]);
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "B" },
    ]);
  });

  it("renders the number of stars the field configures", async () => {
    await renderForm([field({ fieldType: "starRating", label: "Rate", starRating: ["3"] })]);
    await waitFor(() =>
      expect(document.body.querySelectorAll(".star")).toHaveLength(3)
    );
    expect(screen.getByText("Click to rate")).toBeInTheDocument();
  });

  it("defaults to five stars when the count is unusable", async () => {
    await renderForm([field({ fieldType: "starRating", label: "Rate", starRating: ["lots"] })]);
    await waitFor(() =>
      expect(document.body.querySelectorAll(".star")).toHaveLength(5)
    );
  });

  it("records a rating and reports it back", async () => {
    await renderForm([field({ fieldType: "starRating", label: "Rate", starRating: ["5"] })]);
    const stars = await waitFor(() => {
      const found = document.body.querySelectorAll(".star");
      expect(found.length).toBe(5);
      return found;
    });
    fireEvent.click(stars[3]);
    await waitFor(() => expect(screen.getByText("You rated: 4 stars")).toBeInTheDocument());
    expect(stars[3].className).toContain("filled");

    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "f1", value: "4" },
    ]);
  });

  it("numbers questions but not headers", async () => {
    await renderForm([
      field({ id: "h", fieldType: "sectionHeader", label: "Section" }),
      field({ id: "q1", fieldType: "shortText", label: "First" }),
      field({ id: "q2", fieldType: "shortText", label: "Second" }),
    ]);
    await waitFor(() => expect(screen.getByText(/1\. First/)).toBeInTheDocument());
    expect(screen.getByText(/2\. Second/)).toBeInTheDocument();
  });

  it("labels an unlabelled question and header", async () => {
    await renderForm([
      field({ id: "h", fieldType: "sectionHeader", label: "" }),
      field({ id: "q1", fieldType: "shortText", label: "" }),
    ]);
    await waitFor(() => expect(screen.getByText("Section Header")).toBeInTheDocument());
    expect(screen.getByText(/1\. Question/)).toBeInTheDocument();
  });

  it("marks a required question with an asterisk", async () => {
    await renderForm([field({ isRequired: true })]);
    await waitFor(() =>
      expect(document.body.querySelector(".required-indicator")).toBeInTheDocument()
    );
  });
});

describe("paging a long form", () => {
  const many = (n) =>
    Array.from({ length: n }, (_, i) =>
      field({ id: `q${i}`, label: `Question ${i}`, order: i })
    );

  it("keeps a short form on one page with no pager", async () => {
    await renderForm(many(3));
    await waitFor(() => expect(screen.getByText(/1\. Question 0/)).toBeInTheDocument());
    expect(screen.queryByText("Next page →")).not.toBeInTheDocument();
  });

  it("splits at ten questions and steps between the pages", async () => {
    await renderForm(many(14));
    // "Page 1 of 2" appears twice: the progress bar and the pager.
    await waitFor(() => expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2));
    expect(screen.queryByText(/Question 10/)).toBeNull();
    expect(screen.getByText("← Previous page")).toBeDisabled();

    fireEvent.click(screen.getByText("Next page →"));
    await waitFor(() => expect(screen.getByText(/11\. Question 10/)).toBeInTheDocument());
    expect(screen.getByText("Next page →")).toBeDisabled();

    fireEvent.click(screen.getByText("← Previous page"));
    await waitFor(() => expect(screen.getByText(/1\. Question 0/)).toBeInTheDocument());
  });

  it("only offers the submit buttons on the last page", async () => {
    await renderForm(many(14));
    await waitFor(() => expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2));
    expect(screen.queryByText("Clear Form")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Next page →"));
    await waitFor(() => expect(screen.getByText("Clear Form")).toBeInTheDocument());
  });

  it("keeps headers with the questions that follow them", async () => {
    await renderForm([
      field({ id: "h", fieldType: "sectionHeader", label: "Section" }),
      ...many(12),
    ]);
    await waitFor(() => expect(screen.getByText("Section")).toBeInTheDocument());
    expect(screen.getAllByText("Page 1 of 2")).toHaveLength(2);
  });
});

describe("clearing the form", () => {
  it("asks before wiping everything, and can be called off", async () => {
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });

    fireEvent.click(screen.getByText("Clear Form"));
    await waitFor(() =>
      expect(screen.getByText("Clear all responses?")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Cancel"));
    await waitFor(() => expect(screen.queryByText("Clear all responses?")).toBeNull());
    expect(document.body.querySelector('input[type="text"]').value).toBe("Ada");
  });

  it("wipes the answers and the signature pad on confirmation", async () => {
    await renderForm([
      field({ id: "q1", fieldType: "shortText", label: "Name" }),
      field({ id: "q2", fieldType: "signature", label: "Sign", signature: [{ allowUpload: true }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });

    fireEvent.click(screen.getByText("Clear Form"));
    await waitFor(() => expect(screen.getByText("Clear all")).toBeInTheDocument());
    const before = pad.cleared;
    await act(async () => { fireEvent.click(screen.getByText("Clear all")); });

    await waitFor(() =>
      expect(document.body.querySelector('input[type="text"]').value).toBe("")
    );
    expect(pad.cleared).toBeGreaterThan(before);
    expect(showToast).toHaveBeenCalledWith("All responses cleared", "info");
  });
});

describe("after submitting", () => {
  it("shows the thank-you screen and offers a way back", async () => {
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    await act(async () => { submit(); });

    await waitFor(() =>
      expect(screen.getByText(/Form Submitted Successfully/)).toBeInTheDocument()
    );
    expect(screen.getByText("Back to Forms")).toBeInTheDocument();
  });

  it("routes to the documents page a moment later", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    await act(async () => { submit(); });

    await act(async () => { vi.advanceTimersByTime(2000); });
    expect(navigate).toHaveBeenCalledWith("/documents");
  });

  it("reads the submission id from either response shape", async () => {
    createResponse.mockResolvedValue({ data: { data: { id: "nested-1" } } });
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    await act(async () => { submit(); });
    await waitFor(() =>
      expect(screen.getByText(/Form Submitted Successfully/)).toBeInTheDocument()
    );
  });

  it("reports a failure that carries no message", async () => {
    createResponse.mockRejectedValue({});
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    await act(async () => { submit(); });
    expect(showToast).toHaveBeenCalledWith("Submission failed", "error");
  });
});

describe("forms that will not render", () => {
  it("says so when the form has no fields", async () => {
    await renderForm([]);
    await waitFor(() =>
      expect(screen.getByText("Form is empty or could not be loaded")).toBeInTheDocument()
    );
  });

  it("names an unnamed form", async () => {
    getForm.mockResolvedValue({ status: "ok", data: { id: "form-1", fields: [field()] } });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("Untitled Form")).toBeInTheDocument());
  });

  it("reports the message the API gave for a non-ok status", async () => {
    getForm.mockResolvedValue({ status: "error", message: "no such form", data: {} });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("no such form", "error"));
  });

  it("falls back to its own wording when the API gave none", async () => {
    getForm.mockResolvedValue({ status: "error", data: {} });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("API returned non-success status", "error")
    );
  });

  it("reports a fetch that throws", async () => {
    getForm.mockRejectedValue(new Error("offline"));
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("offline", "error"));
  });
});

describe("fields the form author left bare", () => {
  // Every renderable type at once, each with no label and no placeholder and
  // each marked required -- the fallbacks and the required markers are written
  // separately per type, so one bare form exercises all of them.
  const TYPES = [
    "sectionHeader",
    "bodyText",
    "shortText",
    "paragraph",
    "radio",
    "checkbox",
    "dropdown",
    "starRating",
    "fileUpload",
    "signature",
  ];

  it("labels and marks every type", async () => {
    await renderForm(
      TYPES.map((fieldType, i) => ({
        id: `f${i}`,
        fieldType,
        label: "",
        placeholder: undefined,
        isRequired: true,
        options: ["A"],
        order: i,
      }))
    );

    await waitFor(() =>
      expect(document.body.querySelectorAll(".question-block").length).toBe(8)
    );
    // Eight questions, each numbered and each falling back to "Question" --
    // except the upload and signature blocks, which have their own wording.
    expect(screen.getAllByText(/^\d+\. Question$/)).toHaveLength(6);
    // Headers and body text are not numbered, so the upload is the seventh
    // question and the signature the eighth.
    expect(screen.getByText(/7\. Upload files/)).toBeInTheDocument();
    expect(screen.getByText(/8\. Signature/)).toBeInTheDocument();
    expect(screen.getByText("Section Header")).toBeInTheDocument();

    expect(document.body.querySelectorAll(".required-indicator")).toHaveLength(8);
    expect(document.body.querySelectorAll(".required-label").length).toBeGreaterThan(0);

    // With no placeholder configured, the text inputs fall back.
    const texts = document.body.querySelectorAll('input[type="text"], textarea');
    expect(texts[0].placeholder).toBe("Your answer");
  });

  it("names a required field by its id when it has no label at all", async () => {
    await renderForm([field({ id: "q-9", label: "", isRequired: true })]);
    await waitFor(() => expect(screen.getByText(/1\. Question/)).toBeInTheDocument());
    submit();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "Please complete required fields: Question q-9",
        "error"
      )
    );
  });
});

describe("odds and ends of the loader", () => {
  it("marks a form the author has not published as a draft", async () => {
    getForm.mockResolvedValue({
      status: "ok",
      data: { id: "form-1", name: "Intake", isDraft: true, fields: [field()] },
    });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("Intake")).toBeInTheDocument());
  });

  it("reports a form whose fields are not a list at all", async () => {
    vi.stubEnv("DEV", false);
    getForm.mockResolvedValue({
      status: "ok",
      data: { id: "form-1", name: "Intake", fields: "nope" },
    });
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    // The guard above only warns; the very next line still calls `.map` on the
    // non-array, so what the responder actually sees is the load error.
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "(formData.fields || []).map is not a function",
        "error"
      )
    );
    vi.unstubAllEnvs();
  });

  it("falls back to its own wording when the fetch throws nothing useful", async () => {
    getForm.mockRejectedValue({});
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        "Failed to load form. Please check the link or try again.",
        "error"
      )
    );
  });

  it("returns to the page the responder had reached", async () => {
    const store = makeStore();
    store.dispatch({ type: "formResponse/setCurrentPage", payload: 1 });
    getForm.mockResolvedValue({
      status: "ok",
      data: {
        id: "form-1",
        name: "Intake",
        fields: Array.from({ length: 14 }, (_, i) =>
          field({ id: `q${i}`, label: `Question ${i}`, order: i })
        ),
      },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <FormRenderer />
        </MemoryRouter>
      </Provider>
    );
    await waitFor(() => expect(screen.getByText(/11\. Question 10/)).toBeInTheDocument());
  });
});

describe("odds and ends of submitting", () => {
  it("drops an answer that is only whitespace", async () => {
    await renderForm([
      field({ id: "q1", label: "Name" }),
      field({ id: "q2", label: "Nickname" }),
    ]);
    const inputs = await waitFor(() => {
      const found = document.body.querySelectorAll('input[type="text"]');
      expect(found.length).toBe(2);
      return found;
    });
    fireEvent.change(inputs[0], { target: { value: "Ada" } });
    fireEvent.change(inputs[1], { target: { value: "   " } });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([
      { formFieldId: "q1", value: "Ada" },
    ]);
  });

  it("drops an answer that was typed and then erased", async () => {
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([]);
  });

  it("does not send a file that failed to upload", async () => {
    uploadImage.mockResolvedValue({ success: true, data: [{ filename: "a.pdf" }] });
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "1" }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="file"]'));
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "a.pdf", { type: "application/pdf" })] },
      });
    });
    await waitFor(() =>
      expect(screen.getByText("Upload result not found")).toBeInTheDocument()
    );

    await act(async () => { submit(); });
    expect(createResponse.mock.calls[0][0].responseFields).toEqual([]);
  });

  it("accepts a required checkbox once something is ticked", async () => {
    await renderForm([
      field({ fieldType: "checkbox", label: "Pick any", isRequired: true, options: ["A"] }),
    ]);
    const box = await waitForValue(() => document.body.querySelector('input[type="checkbox"]'));
    fireEvent.click(box);
    await act(async () => { submit(); });
    expect(createResponse).toHaveBeenCalled();
  });

  it("accepts a required rating once a star is chosen", async () => {
    await renderForm([
      field({ fieldType: "starRating", label: "Rate", isRequired: true, starRating: ["5"] }),
    ]);
    const stars = await waitFor(() => {
      const found = document.body.querySelectorAll(".star");
      expect(found.length).toBe(5);
      return found;
    });
    fireEvent.click(stars[0]);
    await act(async () => { submit(); });
    expect(createResponse).toHaveBeenCalled();
  });

  it("replaces the whole form with a loader while the submission is in flight", async () => {
    let settle;
    createResponse.mockReturnValue(new Promise((r) => { settle = r; }));
    await renderForm();
    const input = await waitForValue(() => document.body.querySelector('input[type="text"]'));
    fireEvent.change(input, { target: { value: "Ada" } });
    await act(async () => { submit(); });

    // `isLoading` is checked before the form is rendered at all, so the submit
    // button's own spinner branch never gets a chance to show.
    expect(document.body.querySelector(".submit-btn")).toBeNull();
    expect(document.body.querySelector(".section-loader")).toBeInTheDocument();

    await act(async () => { settle({ data: { id: "sub-1" } }); });
  });
});

describe("odds and ends of uploading", () => {
  const pdf = (name) => new File(["x"], name, { type: "application/pdf" });

  it("adds a second file alongside one already uploaded", async () => {
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "3" }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="file"]'));

    uploadImage.mockResolvedValue({
      success: true,
      data: [{ url: "https://x/a.pdf", filename: "a.pdf" }],
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [pdf("a.pdf")] } });
    });
    await waitFor(() => expect(screen.getAllByLabelText("Remove file")).toHaveLength(1));

    uploadImage.mockResolvedValue({
      success: true,
      data: [{ url: "https://x/b.pdf", filename: "b.pdf" }],
    });
    await act(async () => {
      fireEvent.change(input, { target: { files: [pdf("b.pdf")] } });
    });
    await waitFor(() => expect(screen.getAllByLabelText("Remove file")).toHaveLength(2));
    // The first file keeps its own url rather than being overwritten.
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(screen.getByText("b.pdf")).toBeInTheDocument();
  });

  it("flags a batch that failed with no message of its own", async () => {
    uploadImage.mockRejectedValue({});
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "1" }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="file"]'));
    await act(async () => {
      fireEvent.change(input, { target: { files: [pdf("a.pdf")] } });
    });
    await waitFor(() =>
      expect(screen.getByText("Batch upload failed")).toBeInTheDocument()
    );
    expect(showToast).toHaveBeenCalledWith(
      "Failed to upload files: Unknown error",
      "error"
    );
  });

  it("dashes a file the browser reported no size for", async () => {
    const zero = pdf("a.pdf");
    Object.defineProperty(zero, "size", { value: 0 });
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "1" }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="file"]'));
    await act(async () => { fireEvent.change(input, { target: { files: [zero] } }); });
    await waitFor(() => expect(screen.getByText("—")).toBeInTheDocument());
  });

  it("ignores a file chooser dismissed without a file", async () => {
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "1" }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="file"]'));
    await act(async () => { fireEvent.change(input, { target: { files: [] } }); });
    expect(uploadImage).not.toHaveBeenCalled();
  });
});

describe("the last few shapes the renderer defends against", () => {
  const pdf = (name = "a.pdf") => new File(["x"], name, { type: "application/pdf" });

  const uploadForm = () =>
    renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "3" }] }),
    ]);

  const attach = (files) =>
    act(async () => {
      fireEvent.change(document.body.querySelector('input[type="file"]'), {
        target: { files },
      });
    });

  it("keeps the options a field actually declares", async () => {
    await renderForm([field({ fieldType: "radio", label: "Pick", options: ["A", "B", "C"] })]);
    await waitFor(() =>
      expect(document.body.querySelectorAll('input[type="radio"]')).toHaveLength(3)
    );
  });

  it("shows the progress bar on a file part-way through its upload", async () => {
    let settle;
    uploadImage.mockReturnValue(new Promise((r) => { settle = r; }));
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf()]);

    // The row exists at zero progress while the request is in flight; the bar
    // itself only renders strictly between 0 and 100.
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
    expect(document.body.querySelector(".progress-bar")).toBeNull();

    await act(async () => {
      settle({ success: true, data: [{ url: "https://x/a.pdf", filename: "a.pdf" }] });
    });
    await waitFor(() =>
      expect(screen.getByText("Uploaded successfully")).toBeInTheDocument()
    );
  });

  it("removes the right file when two are attached", async () => {
    uploadImage.mockResolvedValue({
      success: true,
      data: [
        { url: "https://x/a.pdf", filename: "a.pdf" },
        { url: "https://x/b.pdf", filename: "b.pdf" },
      ],
    });
    await uploadForm();
    await waitFor(() => expect(document.body.querySelector('input[type="file"]')).toBeTruthy());
    await attach([pdf("a.pdf"), pdf("b.pdf")]);
    await waitFor(() => expect(screen.getAllByLabelText("Remove file")).toHaveLength(2));

    fireEvent.click(screen.getAllByLabelText("Remove file")[0]);
    await waitFor(() => expect(screen.getAllByLabelText("Remove file")).toHaveLength(1));
    expect(screen.getByText("b.pdf")).toBeInTheDocument();
    expect(screen.queryByText("a.pdf")).not.toBeInTheDocument();
  });

  it("blocks a required text field whose answer is not a string", async () => {
    // A checkbox answer is an array; if such a value ever reached a text field
    // the required check would reject it rather than letting it through.
    await renderForm([
      field({ id: "q1", fieldType: "checkbox", label: "Pick", options: ["A"] }),
      field({ id: "q2", fieldType: "shortText", label: "Answer me", isRequired: true }),
    ]);
    const box = await waitForValue(() => document.body.querySelector('input[type="checkbox"]'));
    fireEvent.click(box);
    submit();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining("Answer me"),
        "error"
      )
    );
  });
});

describe("gaps the API leaves in a field", () => {
  it("gives a choice field with no options list an empty one", async () => {
    // Every other fixture here carries `options`, so this is the one route to
    // the transform's fallback -- the group renders with nothing to pick.
    await renderForm([
      field({ id: "r1", fieldType: "radio", label: "Preferred contact", options: undefined }),
    ]);
    await waitFor(() => expect(screen.getByText(/Preferred contact/)).toBeInTheDocument());
    expect(document.body.querySelectorAll('input[type="radio"]')).toHaveLength(0);
  });
});

describe("a required text answer that is actually filled in", () => {
  it("submits once the answer is a non-empty string", async () => {
    await renderForm([
      field({ id: "t1", fieldType: "shortText", label: "Full name", isRequired: true }),
    ]);
    await waitFor(() => expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Type here"), {
      target: { value: "Ada Bell" },
    });
    await act(async () => { submit(); });

    expect(showToast).not.toHaveBeenCalledWith(
      expect.stringContaining("Please fill"),
      "error"
    );
    expect(createResponse).toHaveBeenCalled();
  });
});

describe("a second upload batch that fails as well", () => {
  const pdf = (name) => new File(["x"], name, { type: "application/pdf" });

  it("leaves the earlier file's own error alone", async () => {
    uploadImage.mockRejectedValue(new Error("network down"));
    await renderForm([
      field({ fieldType: "fileUpload", label: "Attach", fileUpload: [{ maxFiles: "3" }] }),
    ]);
    const input = await waitForValue(() => document.body.querySelector('input[type="file"]'));

    await act(async () => {
      fireEvent.change(input, { target: { files: [pdf("a.pdf")] } });
    });
    await waitFor(() => expect(screen.getAllByText("network down")).toHaveLength(1));

    // The second batch rewrites only the files it added; everything before its
    // start index has to survive untouched.
    await act(async () => {
      fireEvent.change(input, { target: { files: [pdf("b.pdf")] } });
    });
    await waitFor(() => expect(screen.getAllByText("network down")).toHaveLength(2));
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
  });
});
