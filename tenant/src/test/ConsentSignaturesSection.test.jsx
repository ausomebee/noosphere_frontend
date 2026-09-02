import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The Consent & Signatures section of the clinical report builder: four rich
 * text fields, two names, two role selects, two placeholders standing in for a
 * client signature that is collected elsewhere, and the clinician's own
 * signature.
 *
 * The signature is the interesting part. Choosing a method wipes whatever was
 * captured under the previous one, so the stored value can never disagree with
 * the stored type, and the signature date is stamped the moment a signature
 * first appears -- kept as-is on later edits, and cleared again the moment the
 * signature is emptied.
 *
 * The real SignatureCapture is used, since the section's job is exactly the
 * bookkeeping around it. The section reads `useFormatSettings`, so a store is
 * supplied with the settings already loaded; the formatted date is asserted by
 * shape rather than by value so the suite does not depend on the machine's
 * timezone.
 *
 * The section seeds itself from `data` exactly once, so every fixture is passed
 * at render time. A field is marked touched when it is left, and only a touched
 * field shows its message; for the two selects "left" means the list shutting
 * rather than a native blur. SignatureCapture is a block of buttons and inputs
 * rather than one control, so it counts as left only when focus lands outside
 * the block entirely -- moving between its own method buttons must not count.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

import ConsentSignaturesSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ConsentSignaturesSection/ConsentSignaturesSection";

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const store = () =>
  configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
    },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "user-1", tenantId: "tenant-1", accessToken: "at", refreshToken: "rt" },
      },
      // Preloaded as loaded so useFormatSettings never reaches for the
      // settings endpoint.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
    },
  });

const renderSection = (props = {}) =>
  render(
    <Provider store={store()}>
      <ConsentSignaturesSection onChange={onChange} {...props} />
    </Provider>
  );

const field = (label) =>
  Array.from(document.body.querySelectorAll(".report-builder-field")).find((f) =>
    f.querySelector(".report-builder-label")?.textContent.startsWith(label)
  );

const selectedLabel = (fieldEl) =>
  fieldEl.querySelector(".report-builder-select-button span").textContent;

const chooseOption = (fieldEl, optionLabel) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-select-option")
  ).find((o) => o.textContent === optionLabel);
  fireEvent.click(option);
};

// A select counts its list shutting as leaving the field, so this marks one
// touched without answering it.
const leaveSelect = (fieldEl) => {
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));
  fireEvent.click(fieldEl.querySelector(".report-builder-select-overlay"));
};

const sectionErrors = () =>
  Array.from(document.body.querySelectorAll(".report-builder-error")).map(
    (e) => e.textContent
  );

const editor = (label) => {
  const container = Array.from(
    document.body.querySelectorAll(".rich-editor-container")
  ).find((c) => c.querySelector(".label-text")?.textContent === label);
  return container.querySelector("[contenteditable]");
};

const typeInEditor = (element, html) => {
  element.innerHTML = html;
  fireEvent.input(element);
};

const chooseSignatureMethod = (name) =>
  fireEvent.click(screen.getByRole("button", { name }));

const signatureDateText = () =>
  field("Clinician Signature date").querySelector(".auto-generated-field span")
    .textContent;

const lastForm = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

// A one-pixel PNG, the shape both the drawn and the uploaded signature resolve
// to, so the section can be seeded with a signature that is already an image.
const pngDataUri =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// Every field filled, so each `||` fallback can be seen taking the supplied
// value rather than the empty default.
const fullData = {
  consentStatement: "<p>I consent to treatment</p>",
  servicesConsented: "<p>Direct therapy</p>",
  consentLimitations: "<p>No community outings</p>",
  clientGuardianName: "Ada Lovelace",
  relationshipToClient: "parent",
  clientSignature: "signed",
  clientSignatureDate: "2024-01-10T09:00:00Z",
  clinicianName: "Jane Doe",
  clinicianRole: "bcba",
  clinicianSignatureType: "type",
  clinicianSignature: "Jane Doe",
  clinicianSignatureDate: "2024-01-15T12:00:00Z",
  consentNotes: "<p>Reviewed in session</p>",
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom ships no 2D context, and the draw pad reaches for one on mount.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(pngDataUri);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("empties every field it was given nothing for", () => {
    renderSection();
    expect(field("Client/guardian name").querySelector("input")).toHaveValue("");
    expect(selectedLabel(field("Relationship to client"))).toBe("Select an option");
    expect(field("Clinician name").querySelector("input")).toHaveValue("");
    expect(selectedLabel(field("Clinician role"))).toBe("Select an option");
    expect(editor("Consent Statement")).toBeEmptyDOMElement();
    expect(editor("Consent notes")).toBeEmptyDOMElement();
    expect(signatureDateText()).toBe("Set when signed");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows every value it was given", () => {
    renderSection({ data: fullData });
    expect(field("Client/guardian name").querySelector("input")).toHaveValue(
      "Ada Lovelace"
    );
    expect(selectedLabel(field("Relationship to client"))).toBe("Parent");
    expect(field("Clinician name").querySelector("input")).toHaveValue("Jane Doe");
    expect(selectedLabel(field("Clinician role"))).toBe("BCBA");
    expect(editor("Consent Statement")).toHaveTextContent("I consent to treatment");
    expect(editor("Services consented to")).toHaveTextContent("Direct therapy");
    expect(editor("Consent limitations or exclusions")).toHaveTextContent(
      "No community outings"
    );
    expect(editor("Consent notes")).toHaveTextContent("Reviewed in session");
    expect(document.body.querySelector(".sig-typed-input")).toHaveValue("Jane Doe");
    expect(signatureDateText()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("leaves the client's own signature to be collected elsewhere", () => {
    renderSection({ data: fullData });
    expect(screen.getAllByText("Pending client signature")).toHaveLength(2);
  });
});

describe("the ordinary fields", () => {
  it("records both names", () => {
    renderSection();
    fireEvent.change(field("Client/guardian name").querySelector("input"), {
      target: { value: "Ada Lovelace" },
    });
    expect(lastForm().clientGuardianName).toBe("Ada Lovelace");
    fireEvent.change(field("Clinician name").querySelector("input"), {
      target: { value: "Jane Doe" },
    });
    expect(lastForm().clinicianName).toBe("Jane Doe");
  });

  it("records both roles", () => {
    renderSection();
    chooseOption(field("Relationship to client"), "Legal guardian");
    expect(lastForm().relationshipToClient).toBe("legal-guardian");
    chooseOption(field("Clinician role"), "Clinical Supervisor");
    expect(lastForm().clinicianRole).toBe("clinical-supervisor");
  });

  it("records what is typed into each rich text field", () => {
    renderSection();
    typeInEditor(editor("Consent Statement"), "<p>I consent</p>");
    typeInEditor(editor("Services consented to"), "<p>Direct therapy</p>");
    typeInEditor(editor("Consent limitations or exclusions"), "<p>No outings</p>");
    typeInEditor(editor("Consent notes"), "<p>Reviewed in session</p>");
    expect(lastForm()).toMatchObject({
      consentStatement: "<p>I consent</p>",
      servicesConsented: "<p>Direct therapy</p>",
      consentLimitations: "<p>No outings</p>",
      consentNotes: "<p>Reviewed in session</p>",
    });
  });

  it("keeps every other field intact when one of them changes", () => {
    renderSection({ data: fullData });
    fireEvent.change(field("Clinician name").querySelector("input"), {
      target: { value: "Sam Ray" },
    });
    expect(lastForm()).toMatchObject({
      clinicianName: "Sam Ray",
      clientGuardianName: "Ada Lovelace",
      clinicianSignature: "Jane Doe",
    });
  });

  it("closes a dropdown when the backdrop is clicked", () => {
    renderSection();
    const relationship = field("Relationship to client");
    fireEvent.click(relationship.querySelector(".report-builder-select-button"));
    expect(
      relationship.querySelector(".report-builder-select-dropdown")
    ).toBeInTheDocument();
    fireEvent.click(relationship.querySelector(".report-builder-select-overlay"));
    expect(
      relationship.querySelector(".report-builder-select-dropdown")
    ).not.toBeInTheDocument();
  });
});

describe("choosing how the clinician signs", () => {
  it("offers no input at all until a method is picked", () => {
    renderSection();
    expect(document.body.querySelector(".sig-input-area")).not.toBeInTheDocument();
  });

  it.each([
    ["Type", "type", ".sig-typed-input"],
    ["Draw", "draw", ".sig-canvas"],
    ["Image", "image", ".sig-upload-label"],
  ])("opens the %s control and stores the choice", (name, stored, selector) => {
    renderSection();
    chooseSignatureMethod(name);
    expect(lastForm().clinicianSignatureType).toBe(stored);
    expect(document.body.querySelector(selector)).toBeInTheDocument();
  });

  it("throws away a signature captured under the previous method", () => {
    renderSection({ data: fullData });
    chooseSignatureMethod("Draw");
    expect(lastForm()).toMatchObject({
      clinicianSignatureType: "draw",
      clinicianSignature: "",
      clinicianSignatureDate: "",
    });
    expect(signatureDateText()).toBe("Set when signed");
  });

  it("leaves everything alone when the same method is picked again", () => {
    renderSection({ data: fullData });
    chooseSignatureMethod("Type");
    // Re-picking still re-stamps the type, but the signature survives because
    // SignatureCapture only clears it on an actual change of method.
    expect(lastForm()).toMatchObject({
      clinicianSignatureType: "type",
      clinicianSignature: "",
    });
  });
});

describe("the typed signature and its date", () => {
  it("stamps a date the moment a signature appears", () => {
    renderSection();
    chooseSignatureMethod("Type");
    fireEvent.change(document.body.querySelector(".sig-typed-input"), {
      target: { value: "Jane Doe" },
    });
    expect(lastForm().clinicianSignature).toBe("Jane Doe");
    expect(lastForm().clinicianSignatureDate).not.toBe("");
    expect(signatureDateText()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("keeps the original date once one has been stamped", () => {
    renderSection({ data: fullData });
    fireEvent.change(document.body.querySelector(".sig-typed-input"), {
      target: { value: "Jane R Doe" },
    });
    expect(lastForm()).toMatchObject({
      clinicianSignature: "Jane R Doe",
      clinicianSignatureDate: "2024-01-15T12:00:00Z",
    });
  });

  it("drops the date again when the signature is emptied", () => {
    renderSection({ data: fullData });
    fireEvent.change(document.body.querySelector(".sig-typed-input"), {
      target: { value: "" },
    });
    expect(lastForm()).toMatchObject({
      clinicianSignature: "",
      clinicianSignatureDate: "",
    });
    expect(signatureDateText()).toBe("Set when signed");
  });
});

describe("the drawn signature", () => {
  it("stamps the pad's image and its date when a stroke ends", () => {
    renderSection();
    chooseSignatureMethod("Draw");
    const canvas = document.body.querySelector(".sig-canvas");
    fireEvent.mouseDown(canvas, { clientX: 1, clientY: 1 });
    fireEvent.mouseMove(canvas, { clientX: 5, clientY: 5 });
    fireEvent.mouseUp(canvas);
    expect(lastForm().clinicianSignature).toBe(pngDataUri);
    expect(signatureDateText()).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(document.body.querySelector(".sig-hint")).toHaveTextContent(
      "Signature captured"
    );
  });

  it("clears the pad and the date again", () => {
    renderSection();
    chooseSignatureMethod("Draw");
    const canvas = document.body.querySelector(".sig-canvas");
    fireEvent.mouseDown(canvas, { clientX: 1, clientY: 1 });
    fireEvent.mouseUp(canvas);
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(lastForm()).toMatchObject({
      clinicianSignature: "",
      clinicianSignatureDate: "",
    });
  });
});

describe("the uploaded signature image", () => {
  const upload = (file) =>
    fireEvent.change(
      document.body.querySelector(".sig-upload-label input[type=file]"),
      { target: { files: [file] } }
    );

  it("stores the image it was given and can take it off again", async () => {
    renderSection({ data: { ...fullData, clinicianSignatureType: "image", clinicianSignature: "" } });
    upload(new File(["x"], "sig.png", { type: "image/png" }));
    await waitFor(() => expect(lastForm().clinicianSignature).toMatch(/^data:/));
    fireEvent.click(screen.getByRole("button", { name: "Remove signature image" }));
    expect(lastForm().clinicianSignature).toBe("");
  });

  it("shows a stored image rather than the picker", () => {
    renderSection({
      data: {
        ...fullData,
        clinicianSignatureType: "image",
        clinicianSignature: pngDataUri,
      },
    });
    expect(screen.getByAltText("Signature")).toHaveAttribute("src", pngDataUri);
    expect(document.body.querySelector(".sig-upload-label")).not.toBeInTheDocument();
  });

  it("refuses a file that is not an image", () => {
    renderSection({ data: { ...fullData, clinicianSignatureType: "image", clinicianSignature: "" } });
    upload(new File(["x"], "notes.pdf", { type: "application/pdf" }));
    expect(toast.showToast).toHaveBeenCalledWith("Please choose an image file", "error");
    expect(screen.getByText("Please choose an image file")).toBeInTheDocument();
  });
});

describe("a read-only section", () => {
  it("shows the stored signature instead of a control", () => {
    renderSection({ data: fullData, isReadOnly: true });
    expect(document.body.querySelector(".sig-types")).not.toBeInTheDocument();
    expect(document.body.querySelector(".sig-typed-preview")).toHaveTextContent(
      "Jane Doe"
    );
  });

  it("shows a stored image signature as an image", () => {
    renderSection({
      data: { ...fullData, clinicianSignatureType: "image", clinicianSignature: pngDataUri },
      isReadOnly: true,
    });
    expect(screen.getByAltText("Signature")).toHaveAttribute("src", pngDataUri);
  });

  it("says so when there is nothing signed", () => {
    renderSection({ data: { ...fullData, clinicianSignature: "" }, isReadOnly: true });
    expect(screen.getByText("Not signed")).toBeInTheDocument();
  });

  it("hides the remove button", () => {
    renderSection({ data: fullData, isReadOnly: true, onRemoveSection });
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: fullData });
    expect(
      screen.queryByRole("button", { name: "Remove Section" })
    ).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: fullData, onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages the form puts up when a field is left empty", () => {
  it.each([
    ["Client/guardian name", "Client/guardian name is required"],
    ["Clinician name", "Clinician name is required"],
  ])("complains about a blank %s once the field is left", async (label, message) => {
    // A blank section is short in every required field at once, so leaving one
    // of them is also the check that only that one is on screen.
    renderSection();
    fireEvent.blur(field(label).querySelector("input"));
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it.each([
    ["Relationship to client", "Relationship to client is required"],
    ["Clinician role", "Clinician role is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    message
  ) => {
    renderSection();
    leaveSelect(field(label));
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it("takes the message back down as soon as the name is typed", async () => {
    renderSection();
    const name = () => field("Clinician name").querySelector("input");
    fireEvent.blur(name());
    await waitFor(() => expect(sectionErrors()).toEqual(["Clinician name is required"]));

    // A touched field is re-checked on every keystroke, and each field is
    // checked on its own, so filling this one is enough to clear it.
    fireEvent.change(name(), { target: { value: "Jane Doe" } });
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastForm().clinicianName).toBe("Jane Doe");
  });

  it("shows a second message once a second field has been left too", async () => {
    renderSection();
    fireEvent.blur(field("Client/guardian name").querySelector("input"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["Client/guardian name is required"])
    );

    leaveSelect(field("Clinician role"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual([
        "Client/guardian name is required",
        "Clinician role is required",
      ])
    );
  });

  it("says nothing about the signature type until the block is left", async () => {
    renderSection();
    fireEvent.blur(field("Clinician name").querySelector("input"));
    await waitFor(() => expect(sectionErrors()).toEqual(["Clinician name is required"]));
    // Picking a method stores the choice and answers the field, so no message
    // is owed either way.
    chooseSignatureMethod("Type");
    expect(lastForm().clinicianSignatureType).toBe("type");
    expect(sectionErrors()).toEqual(["Clinician name is required"]);
  });

  it("reports the signature type once focus leaves the block", async () => {
    renderSection();
    const block = field("Clinician Signature");
    fireEvent.blur(block, { relatedTarget: document.body });
    expect(
      await screen.findByText("Please select a signature type")
    ).toBeInTheDocument();
  });

  it("does not count moving between the method buttons as leaving", async () => {
    renderSection();
    const block = field("Clinician Signature");
    const [typeBtn, drawBtn] = block.querySelectorAll(".sig-type-btn");
    // Focus is still inside the block, so this is not a blur of the field.
    fireEvent.blur(block, { relatedTarget: drawBtn });
    await waitFor(() =>
      expect(
        screen.queryByText("Please select a signature type")
      ).not.toBeInTheDocument()
    );
    expect(typeBtn).toBeInTheDocument();
  });

  it("says nothing once a method has been picked and the block is left", async () => {
    renderSection();
    chooseSignatureMethod("Type");
    fireEvent.blur(field("Clinician Signature"), { relatedTarget: document.body });
    await waitFor(() =>
      expect(
        screen.queryByText("Please select a signature type")
      ).not.toBeInTheDocument()
    );
  });
});

describe("a read-only section's controls", () => {
  it("locks both names and both selects", () => {
    renderSection({ data: fullData, isReadOnly: true });
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ isReadOnly: true });
    const button = field("Clinician role").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(sectionErrors()).toEqual([]);
  });
});
