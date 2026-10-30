import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const uploadImage = vi.hoisted(() => vi.fn());
vi.mock("../api/ImageUpload", () => ({ default: { UploadImage: uploadImage } }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => showToast(...a),
  showApiError: vi.fn(),
}));

const openDocument = vi.fn();
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => ({ openDocument }) }));

import {
  ReportTextInput,
  ReportSelect,
  ReportMultiSelect,
  ReportRadioGroup,
  ReportFileUpload,
  ReportCheckboxGrid,
} from "../Components/Input/ReportInput/ReportBuilderInputs";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The six field controls the clinical report sections are built from.
 *
 * Every one of them takes `onBlur` and `readOnly`, which is what makes the
 * sections' validation work: a section marks a field touched on blur, and only
 * a touched field renders its error. The two dropdowns treat *closing the list*
 * as leaving the field rather than using a native blur, because the button
 * keeps focus while the list is open — a native blur would mark the field
 * touched on the way to picking an option, and flash an error mid-interaction.
 */

const store = () =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      // Tenant's `useAuth` reads the tokens off the user object, not off the
      // slice itself.
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        user: { id: "u1", tenantId: "t1", accessToken: "at", refreshToken: "rt" },
      },
    },
  });

const withStore = (ui) => render(<Provider store={store()}>{ui}</Provider>);

const OPTIONS = [
  { value: "a", label: "Apples" },
  { value: "b", label: "Bananas" },
];

const onChange = vi.fn();
const onBlur = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  uploadImage.mockResolvedValue({
    success: true,
    data: [{ filename: "report.pdf", url: "https://cdn/report.pdf" }],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("marking a field touched", () => {
  it("reports a blur off the text field", () => {
    render(<ReportTextInput label="Name" value="" onChange={onChange} onBlur={onBlur} />);
    fireEvent.blur(document.body.querySelector(".report-builder-input"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("reports a blur off a radio", () => {
    render(
      <ReportRadioGroup label="Fruit" options={OPTIONS} value="" onChange={onChange} onBlur={onBlur} />
    );
    fireEvent.blur(document.body.querySelector(".report-builder-radio-input"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("reports a blur off a checkbox in the grid", () => {
    render(
      <ReportCheckboxGrid label="Fruit" options={OPTIONS} value={[]} onChange={onChange} onBlur={onBlur} />
    );
    fireEvent.blur(document.body.querySelector(".report-builder-checkbox-input"));
    expect(onBlur).toHaveBeenCalled();
  });

  it.each([
    ["ReportSelect", <ReportSelect label="Fruit" options={OPTIONS} value="" onChange={onChange} onBlur={onBlur} />],
    ["ReportMultiSelect", <ReportMultiSelect label="Fruit" options={OPTIONS} value={[]} onChange={onChange} onBlur={onBlur} />],
  ])("%s reports leaving the field only once its list closes", (_name, element) => {
    render(element);
    const button = document.body.querySelector(".report-builder-select-button");

    fireEvent.click(button);
    expect(onBlur).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("reports leaving a single select as soon as a choice is made", () => {
    render(
      <ReportSelect label="Fruit" options={OPTIONS} value="" onChange={onChange} onBlur={onBlur} />
    );
    fireEvent.click(document.body.querySelector(".report-builder-select-button"));
    fireEvent.click(screen.getAllByText("Apples").slice(-1)[0]);
    expect(onChange).toHaveBeenCalledWith("a");
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it("keeps a multi select open across choices, reporting only on close", () => {
    render(
      <ReportMultiSelect label="Fruit" options={OPTIONS} value={[]} onChange={onChange} onBlur={onBlur} />
    );
    fireEvent.click(document.body.querySelector(".report-builder-select-button"));
    fireEvent.click(screen.getAllByText("Apples").slice(-1)[0]);
    // Picking one of several must not end the interaction.
    expect(onChange).toHaveBeenCalledWith(["a"]);
    expect(onBlur).not.toHaveBeenCalled();

    fireEvent.click(document.body.querySelector(".report-builder-select-overlay"));
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["ReportTextInput", <ReportTextInput label="Name" value="" onChange={onChange} />],
    ["ReportSelect", <ReportSelect label="Fruit" options={OPTIONS} value="" onChange={onChange} />],
    ["ReportMultiSelect", <ReportMultiSelect label="Fruit" options={OPTIONS} value={[]} onChange={onChange} />],
    ["ReportRadioGroup", <ReportRadioGroup label="Fruit" options={OPTIONS} value="" onChange={onChange} />],
    ["ReportCheckboxGrid", <ReportCheckboxGrid label="Fruit" options={OPTIONS} value={[]} onChange={onChange} />],
  ])("%s copes with no blur handler wired up", (_name, element) => {
    render(element);
    const control = document.body.querySelector(
      ".report-builder-field input, .report-builder-field button"
    );
    expect(() => {
      fireEvent.blur(control);
      fireEvent.click(control);
    }).not.toThrow();
  });
});

describe("a read-only report", () => {
  it("refuses to edit the text field", () => {
    render(<ReportTextInput label="Name" value="Ada" onChange={onChange} readOnly />);
    const input = document.body.querySelector(".report-builder-input");
    expect(input).toHaveAttribute("readonly");
    // The value is still readable, which is the point of a read-only report.
    expect(input.value).toBe("Ada");
  });

  it.each([
    ["ReportSelect", <ReportSelect label="Fruit" options={OPTIONS} value="a" onChange={onChange} readOnly />],
    ["ReportMultiSelect", <ReportMultiSelect label="Fruit" options={OPTIONS} value={["a"]} onChange={onChange} readOnly />],
  ])("refuses to open %s", (_name, element) => {
    render(element);
    const button = document.body.querySelector(".report-builder-select-button");
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
    // The chosen value still reads back.
    expect(screen.getByText("Apples")).toBeInTheDocument();
  });

  it("disables every radio", () => {
    render(
      <ReportRadioGroup label="Fruit" options={OPTIONS} value="a" onChange={onChange} readOnly />
    );
    const radios = document.body.querySelectorAll(".report-builder-radio-input");
    // A disabled control is what stops the browser dispatching the change at
    // all; jsdom fires it regardless, so the attribute is the real assertion.
    radios.forEach((r) => expect(r).toBeDisabled());
    expect(radios[0].checked).toBe(true);
  });

  it("disables every box in the grid", () => {
    render(
      <ReportCheckboxGrid label="Fruit" options={OPTIONS} value={["a"]} onChange={onChange} readOnly />
    );
    const boxes = document.body.querySelectorAll(".report-builder-checkbox-input");
    boxes.forEach((b) => expect(b).toBeDisabled());
    expect(boxes[0].checked).toBe(true);
  });

  it.each([
    ["ReportSelect", <ReportSelect label="Fruit" options={OPTIONS} value="a" onChange={onChange} />],
    ["ReportRadioGroup", <ReportRadioGroup label="Fruit" options={OPTIONS} value="a" onChange={onChange} />],
  ])("leaves %s editable when the report is not read-only", (_name, element) => {
    render(element);
    const control = document.body.querySelector(
      ".report-builder-select-button, .report-builder-radio-input"
    );
    expect(control).not.toBeDisabled();
  });
});

describe("the text field", () => {
  it("reports the text rather than the event", () => {
    render(<ReportTextInput label="Name" value="" onChange={onChange} />);
    fireEvent.change(document.body.querySelector(".report-builder-input"), {
      target: { value: "Ada" },
    });
    expect(onChange).toHaveBeenCalledWith("Ada");
  });

  it("shows the value it was given, and its placeholder", () => {
    render(
      <ReportTextInput label="Name" value="Ada" placeholder="Full name" onChange={onChange} />
    );
    const input = document.body.querySelector(".report-builder-input");
    expect(input.value).toBe("Ada");
    expect(input.placeholder).toBe("Full name");
  });

  it("defaults to a plain text field and honours another type", () => {
    const { unmount } = render(<ReportTextInput label="Name" value="" onChange={onChange} />);
    expect(document.body.querySelector(".report-builder-input").type).toBe("text");
    unmount();

    render(<ReportTextInput label="When" value="" type="date" onChange={onChange} />);
    expect(document.body.querySelector(".report-builder-input").type).toBe("date");
  });

  it("marks a required field and leaves an optional one unmarked", () => {
    const { unmount } = render(<ReportTextInput label="Name" value="" required />);
    expect(document.body.querySelector(".report-builder-label").textContent).toContain("*");
    unmount();

    render(<ReportTextInput label="Name" value="" />);
    expect(document.body.querySelector(".report-builder-label").textContent).not.toContain("*");
  });

  it("copes with no change handler at all", () => {
    render(<ReportTextInput label="Name" value="" />);
    expect(() =>
      fireEvent.change(document.body.querySelector(".report-builder-input"), {
        target: { value: "Ada" },
      })
    ).not.toThrow();
  });
});

describe("the single select", () => {
  const button = () => document.body.querySelector(".report-builder-select-button");

  it("shows its placeholder until something is chosen", () => {
    render(
      <ReportSelect label="Fruit" placeholder="Pick one" options={OPTIONS} value="" onChange={onChange} />
    );
    expect(screen.getByText("Pick one")).toBeInTheDocument();
    expect(document.body.querySelector(".placeholder")).toBeInTheDocument();
  });

  it("shows the chosen option's label instead", () => {
    render(<ReportSelect label="Fruit" options={OPTIONS} value="b" onChange={onChange} />);
    expect(screen.getByText("Bananas")).toBeInTheDocument();
    expect(document.body.querySelector(".placeholder")).toBeNull();
  });

  it("opens, reports the choice, and closes again", () => {
    render(<ReportSelect label="Fruit" options={OPTIONS} value="" onChange={onChange} />);
    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByText("Apples"));
    expect(onChange).toHaveBeenCalledWith("a");
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a click outside without choosing anything", () => {
    render(<ReportSelect label="Fruit" options={OPTIONS} value="" onChange={onChange} />);
    fireEvent.click(button());
    fireEvent.click(document.body.querySelector(".report-builder-select-overlay"));
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggles shut on a second press of its own button", () => {
    render(<ReportSelect label="Fruit" options={OPTIONS} value="" onChange={onChange} />);
    fireEvent.click(button());
    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("marks the option that is already chosen", () => {
    render(<ReportSelect label="Fruit" options={OPTIONS} value="a" onChange={onChange} />);
    fireEvent.click(button());
    const chosen = screen.getByText("Apples", { selector: ".report-builder-select-option" });
    expect(chosen.className).toContain("selected");
  });

  it("copes with no change handler at all", () => {
    render(<ReportSelect label="Fruit" options={OPTIONS} value="" />);
    fireEvent.click(button());
    expect(() => fireEvent.click(screen.getByText("Apples"))).not.toThrow();
  });
});

describe("the multi select", () => {
  const button = () => document.body.querySelector(".report-builder-select-button");

  it("shows its placeholder while nothing is chosen", () => {
    render(
      <ReportMultiSelect label="Fruit" placeholder="Pick some" options={OPTIONS} value={[]} onChange={onChange} />
    );
    expect(screen.getByText("Pick some")).toBeInTheDocument();
  });

  it("defaults its own placeholder wording", () => {
    render(<ReportMultiSelect label="Fruit" options={OPTIONS} value={[]} onChange={onChange} />);
    expect(screen.getByText("Select options")).toBeInTheDocument();
  });

  it("lists every chosen label", () => {
    render(
      <ReportMultiSelect label="Fruit" options={OPTIONS} value={["a", "b"]} onChange={onChange} />
    );
    expect(screen.getByText("Apples, Bananas")).toBeInTheDocument();
  });

  it("adds a choice to what is already held", () => {
    render(<ReportMultiSelect label="Fruit" options={OPTIONS} value={["a"]} onChange={onChange} />);
    fireEvent.click(button());
    fireEvent.click(screen.getByText("Bananas"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });

  it("removes a choice that was already held", () => {
    render(
      <ReportMultiSelect label="Fruit" options={OPTIONS} value={["a", "b"]} onChange={onChange} />
    );
    fireEvent.click(button());
    fireEvent.click(screen.getAllByText("Apples").slice(-1)[0]);
    expect(onChange).toHaveBeenCalledWith(["b"]);
  });

  it("ticks the boxes for what is held", () => {
    render(<ReportMultiSelect label="Fruit" options={OPTIONS} value={["b"]} onChange={onChange} />);
    fireEvent.click(button());
    const boxes = document.body.querySelectorAll(".report-builder-multi-checkbox-input");
    expect(boxes[0].checked).toBe(false);
    expect(boxes[1].checked).toBe(true);
  });

  it("closes on a click outside", () => {
    render(<ReportMultiSelect label="Fruit" options={OPTIONS} value={[]} onChange={onChange} />);
    fireEvent.click(button());
    fireEvent.click(document.body.querySelector(".report-builder-select-overlay"));
    expect(button()).toHaveAttribute("aria-expanded", "false");
  });

  it("defaults to holding nothing when given no value", () => {
    render(<ReportMultiSelect label="Fruit" options={OPTIONS} onChange={onChange} />);
    fireEvent.click(button());
    fireEvent.click(screen.getByText("Apples"));
    expect(onChange).toHaveBeenCalledWith(["a"]);
  });
});

describe("the checkbox grid", () => {
  it("ticks and unticks", () => {
    render(
      <ReportCheckboxGrid label="Fruit" options={OPTIONS} value={["a"]} onChange={onChange} />
    );
    const boxes = document.body.querySelectorAll(".report-builder-checkbox-input");
    expect(boxes[0].checked).toBe(true);

    fireEvent.click(boxes[1]);
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);

    fireEvent.click(boxes[0]);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it.each([
    ["single", "single"],
    ["double", "double"],
  ])("lays itself out %s", (layout, className) => {
    render(
      <ReportCheckboxGrid label="Fruit" options={OPTIONS} value={[]} onChange={onChange} layout={layout} />
    );
    expect(document.body.querySelector(".report-builder-checkbox-grid").className).toContain(
      className
    );
  });

  it("lays itself out singly when told nothing", () => {
    render(<ReportCheckboxGrid label="Fruit" options={OPTIONS} value={[]} onChange={onChange} />);
    expect(document.body.querySelector(".report-builder-checkbox-grid").className).toContain(
      "single"
    );
  });

  it("copes with no change handler at all", () => {
    render(<ReportCheckboxGrid label="Fruit" options={OPTIONS} value={[]} />);
    expect(() =>
      fireEvent.click(document.body.querySelector(".report-builder-checkbox-input"))
    ).not.toThrow();
  });
});

describe("the radio group", () => {
  it("marks the option that is held and reports a change", () => {
    render(<ReportRadioGroup label="Fruit" options={OPTIONS} value="a" onChange={onChange} />);
    const radios = document.body.querySelectorAll(".report-builder-radio-input");
    expect(radios[0].checked).toBe(true);

    fireEvent.click(radios[1]);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("copes with no change handler at all", () => {
    render(<ReportRadioGroup label="Fruit" options={OPTIONS} value="a" />);
    expect(() =>
      fireEvent.click(document.body.querySelectorAll(".report-builder-radio-input")[1])
    ).not.toThrow();
  });
});

describe("the file upload", () => {
  const onUpload = vi.fn();
  const file = (name = "report.pdf") => new File(["x"], name, { type: "application/pdf" });

  const renderUpload = (props = {}) =>
    withStore(
      <ReportFileUpload
        label="Attach"
        value={[]}
        onChange={onChange}
        onUpload={onUpload}
        acceptedFormats="PDF, DOCX"
        {...props}
      />
    );

  const input = () => document.body.querySelector(".report-builder-file-input");

  const choose = (files) =>
    act(async () => {
      fireEvent.change(input(), { target: { files } });
    });

  it("builds its accept list from the formats it was given", () => {
    renderUpload();
    expect(input().accept).toBe(".pdf,.docx");
    expect(screen.getByText("PDF, DOCX")).toBeInTheDocument();
  });

  it("accepts anything when no formats are named", () => {
    renderUpload({ acceptedFormats: undefined });
    expect(input().accept).toBe("");
  });

  it("uploads a file and reports it both ways", async () => {
    renderUpload();
    await choose([file()]);

    expect(uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "at", refreshToken: "rt" })
    );
    const uploaded = [{ filename: "report.pdf", url: "https://cdn/report.pdf" }];
    expect(onChange).toHaveBeenCalledWith(uploaded);
    expect(onUpload).toHaveBeenCalledWith(uploaded);
  });

  it("replaces the held file when only one is allowed", async () => {
    renderUpload({ value: [{ filename: "old.pdf", url: "https://cdn/old.pdf" }] });
    await choose([file()]);
    expect(onChange).toHaveBeenCalledWith([
      { filename: "report.pdf", url: "https://cdn/report.pdf" },
    ]);
  });

  it("appends to the held files when several are allowed", async () => {
    renderUpload({
      multiple: true,
      value: [{ filename: "old.pdf", url: "https://cdn/old.pdf" }],
    });
    await choose([file()]);
    expect(onChange).toHaveBeenCalledWith([
      { filename: "old.pdf", url: "https://cdn/old.pdf" },
      { filename: "report.pdf", url: "https://cdn/report.pdf" },
    ]);
  });

  it("copes with a held value that is not a list", async () => {
    renderUpload({ multiple: true, value: "nonsense" });
    await choose([file()]);
    expect(onChange).toHaveBeenCalledWith([
      { filename: "report.pdf", url: "https://cdn/report.pdf" },
    ]);
  });

  it("ignores a chooser dismissed without a file", async () => {
    renderUpload();
    await choose([]);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it.each([
    ["a refusal", { success: false, error: "storage full" }],
    ["an empty result", { success: true, data: [] }],
  ])("reports %s", async (_case, response) => {
    uploadImage.mockResolvedValue(response);
    renderUpload();
    await choose([file()]);
    expect(showToast).toHaveBeenCalledWith("File upload failed", "error");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("reports an upload that threw", async () => {
    uploadImage.mockRejectedValue(new Error("offline"));
    renderUpload();
    await choose([file()]);
    expect(showToast).toHaveBeenCalledWith("File upload failed", "error");
  });

  it("clears the chooser so the same file can be picked again", async () => {
    renderUpload();
    await choose([file()]);
    expect(input().value).toBe("");
  });

  it("lists a held file and opens it in the viewer", () => {
    renderUpload({ value: [{ filename: "report.pdf", url: "https://cdn/report.pdf" }] });
    fireEvent.click(screen.getByText("report.pdf"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/report.pdf", "report.pdf");
  });

  it("numbers a held file the API did not name", () => {
    renderUpload({ value: [{ url: "https://cdn/a.pdf" }] });
    fireEvent.click(screen.getByText("File 1"));
    expect(openDocument).toHaveBeenCalledWith("https://cdn/a.pdf", "File 1");
  });

  it("removes a held file", () => {
    renderUpload({
      value: [
        { filename: "a.pdf", url: "https://cdn/a.pdf" },
        { filename: "b.pdf", url: "https://cdn/b.pdf" },
      ],
    });
    fireEvent.click(document.body.querySelectorAll(".report-builder-file-remove")[0]);
    expect(onChange).toHaveBeenCalledWith([{ filename: "b.pdf", url: "https://cdn/b.pdf" }]);
  });

  it("is the one control here that honours readOnly", () => {
    renderUpload({
      readOnly: true,
      value: [{ filename: "a.pdf", url: "https://cdn/a.pdf" }],
    });
    expect(document.body.querySelector(".report-builder-file-upload-wrapper")).toBeNull();
    expect(document.body.querySelector(".report-builder-file-remove")).toBeNull();
    // The file itself stays readable.
    expect(screen.getByText("a.pdf")).toBeInTheDocument();
  });

  it("shows it is working while the upload is in flight", async () => {
    let settle;
    uploadImage.mockReturnValue(new Promise((r) => { settle = r; }));
    renderUpload();
    await act(async () => {
      fireEvent.change(input(), { target: { files: [file()] } });
    });
    await waitFor(() => expect(screen.getByText("Uploading...")).toBeInTheDocument());

    await act(async () => {
      settle({ success: true, data: [{ filename: "report.pdf", url: "https://cdn/report.pdf" }] });
    });
    await waitFor(() => expect(screen.getByText("Click to upload")).toBeInTheDocument());
  });

  it("copes with no callbacks wired up at all", async () => {
    withStore(<ReportFileUpload label="Attach" value={[]} />);
    await act(async () => {
      fireEvent.change(input(), { target: { files: [file()] } });
    });
    expect(uploadImage).toHaveBeenCalled();
  });
});
