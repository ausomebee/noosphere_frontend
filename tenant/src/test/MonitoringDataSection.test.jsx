import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Monitoring & Data Collection section of the clinical report builder: one
 * flat form rather than a list of cards, with four multi-selects, two selects,
 * five rich text fields and a file field.
 *
 * Three of the multi-selects treat "Other" as exclusive -- choosing it drops
 * everything else, and adding anything beside it drops "Other" again -- and
 * each reveals a "Please specify" box while it is set. That bookkeeping, and
 * the fallback the section applies to every field it is handed, is what these
 * tests are about, so the real inputs are used rather than probes.
 *
 * The file field reads the auth slice and the document viewer, so the tests
 * supply a store and mock the viewer hook (the real one throws outside its
 * provider) and the upload endpoint.
 *
 * The section seeds itself from `data` exactly once, so every fixture is
 * passed at render time. A field is marked touched when it is left, and only a
 * touched field shows its message; for the dropdowns "left" means the list
 * shutting rather than a native blur, so a message is provoked by opening a
 * list and clicking the overlay away. The validator runs over the whole form at
 * once, so a single blur fills `errors` for every short field and only the
 * blurred one is on screen.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

const upload = vi.hoisted(() => ({ UploadImage: vi.fn() }));
vi.mock("../api/ImageUpload", () => ({ default: upload }));

import MonitoringDataSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/MonitoringDataSection/MonitoringDataSection";

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const store = () =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: { id: "user-1", accessToken: "at", refreshToken: "rt" },
      },
    },
  });

const renderSection = (props = {}) =>
  render(
    <Provider store={store()}>
      <MonitoringDataSection onChange={onChange} {...props} />
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

const openMulti = (fieldEl) =>
  fireEvent.click(fieldEl.querySelector(".report-builder-select-button"));

const toggleMulti = (fieldEl, optionLabel) => {
  const option = Array.from(
    fieldEl.querySelectorAll(".report-builder-multi-select-option")
  ).find((o) => o.textContent.trim() === optionLabel);
  fireEvent.click(option.querySelector("input[type=checkbox]"));
};

// Both dropdowns count their list shutting as leaving the field, so this marks
// a select touched without answering it.
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

const lastForm = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

// Every field filled, so the fallback each one applies can be seen taking the
// supplied value rather than the empty default.
const fullData = {
  dataCollectionOverview: "<p>Session by session</p>",
  behaviorsTargetsMonitored: "<p>Hitting</p>",
  measurementMethods: ["frequency"],
  measurementMethodsOther: "",
  dataCollectionFrequency: "daily",
  whoCollectsData: ["rbt"],
  dataRecordingTools: ["paper-sheets"],
  dataRecordingToolsOther: "",
  dataReviewFrequency: "weekly",
  dataStorageLocation: ["cloud-storage"],
  dataStorageLocationOther: "",
  progressReportingMethods: ["team-meetings"],
  supportingDataAttachments: [{ filename: "graph.png", url: "https://files/graph.png" }],
  supportingDataDescription: "<p>Weekly graph</p>",
  dataInterpretation: "<p>Downward trend</p>",
  dataLimitationsNotes: "<p>Two sessions missed</p>",
};

beforeEach(() => {
  vi.clearAllMocks();
  upload.UploadImage.mockResolvedValue({
    success: true,
    data: [{ filename: "graph.png", url: "https://files/graph.png" }],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shape a fresh section starts in", () => {
  it("empties every field it was given nothing for", () => {
    renderSection();
    expect(selectedLabel(field("Measurement methods"))).toBe("Select an option");
    expect(selectedLabel(field("Data collection frequency"))).toBe("Select an option");
    expect(selectedLabel(field("Who collects data"))).toBe("Select an option");
    expect(selectedLabel(field("Data recording tools"))).toBe("Select an option");
    expect(selectedLabel(field("Data review frequency"))).toBe("Select an option");
    expect(selectedLabel(field("Data Storage location"))).toBe("Select an option");
    expect(selectedLabel(field("Progress reporting methods"))).toBe("Select an option");
    expect(editor("Data collection overview")).toBeEmptyDOMElement();
    expect(editor("Data interpretation")).toBeEmptyDOMElement();
    expect(
      field("Supporting data attachments").querySelector(".report-builder-uploaded-list")
    ).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows every value it was given", () => {
    renderSection({ data: fullData });
    expect(selectedLabel(field("Measurement methods"))).toBe("Frequency");
    expect(selectedLabel(field("Data collection frequency"))).toBe("Daily");
    expect(selectedLabel(field("Who collects data"))).toBe("RBT");
    expect(selectedLabel(field("Data recording tools"))).toBe("Paper data sheets");
    expect(selectedLabel(field("Data review frequency"))).toBe("Weekly");
    expect(selectedLabel(field("Data Storage location"))).toBe("Secure cloud storage");
    expect(selectedLabel(field("Progress reporting methods"))).toBe("Team meetings");
    expect(editor("Data collection overview")).toHaveTextContent("Session by session");
    expect(editor("Data limitations or notes")).toHaveTextContent("Two sessions missed");
    expect(screen.getByRole("button", { name: "graph.png" })).toBeInTheDocument();
  });

  it("leaves the specify boxes hidden until an Other is chosen", () => {
    renderSection({ data: fullData });
    expect(
      screen.queryByPlaceholderText("Enter other measurement method")
    ).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter other recording tool")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Enter other storage location")
    ).not.toBeInTheDocument();
  });

  it("shows the specify boxes for the Others it was given", () => {
    renderSection({
      data: {
        ...fullData,
        measurementMethods: ["other"],
        measurementMethodsOther: "Momentary sampling",
        dataRecordingTools: ["other"],
        dataRecordingToolsOther: "Whiteboard",
        dataStorageLocation: ["other"],
        dataStorageLocationOther: "Locked cabinet",
      },
    });
    expect(screen.getByPlaceholderText("Enter other measurement method")).toHaveValue(
      "Momentary sampling"
    );
    expect(screen.getByPlaceholderText("Enter other recording tool")).toHaveValue(
      "Whiteboard"
    );
    expect(screen.getByPlaceholderText("Enter other storage location")).toHaveValue(
      "Locked cabinet"
    );
  });
});

describe("the multi-selects where Other stands alone", () => {
  it.each([
    ["Measurement methods", "measurementMethods", "Duration", "duration", "Enter other measurement method"],
    ["Data recording tools", "dataRecordingTools", "Session notes", "session-notes", "Enter other recording tool"],
    ["Data Storage location", "dataStorageLocation", "Paper file", "paper-file", "Enter other storage location"],
  ])(
    "drops everything else when Other is chosen for %s",
    (label, key, otherOptionLabel, otherOptionValue, placeholder) => {
      renderSection({ data: fullData });
      const target = field(label);
      openMulti(target);
      toggleMulti(target, otherOptionLabel);
      expect(lastForm()[key]).toHaveLength(2);
      toggleMulti(field(label), "Other");
      expect(lastForm()[key]).toEqual(["other"]);
      expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
      // And adding a real option beside "Other" drops "Other" again.
      toggleMulti(field(label), otherOptionLabel);
      expect(lastForm()[key]).toEqual([otherOptionValue]);
      expect(screen.queryByPlaceholderText(placeholder)).not.toBeInTheDocument();
    }
  );

  it("empties the field when Other is unticked on its own", () => {
    renderSection({ data: { ...fullData, measurementMethods: ["other"] } });
    const methods = field("Measurement methods");
    openMulti(methods);
    toggleMulti(methods, "Other");
    expect(lastForm().measurementMethods).toEqual([]);
  });

  it("records what the specify boxes are filled in with", () => {
    renderSection({
      data: {
        ...fullData,
        measurementMethods: ["other"],
        dataRecordingTools: ["other"],
        dataStorageLocation: ["other"],
      },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter other measurement method"), {
      target: { value: "Momentary sampling" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter other recording tool"), {
      target: { value: "Whiteboard" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter other storage location"), {
      target: { value: "Locked cabinet" },
    });
    expect(lastForm()).toMatchObject({
      measurementMethodsOther: "Momentary sampling",
      dataRecordingToolsOther: "Whiteboard",
      dataStorageLocationOther: "Locked cabinet",
    });
  });
});

describe("the multi-selects with no Other to worry about", () => {
  it("adds and removes data collectors freely", () => {
    renderSection({ data: fullData });
    const who = field("Who collects data");
    openMulti(who);
    toggleMulti(who, "BCBA");
    expect(lastForm().whoCollectsData).toEqual(["rbt", "bcba"]);
    toggleMulti(field("Who collects data"), "RBT");
    expect(lastForm().whoCollectsData).toEqual(["bcba"]);
  });

  it("adds a reporting method without any Other bookkeeping", () => {
    renderSection({ data: fullData });
    const reporting = field("Progress reporting methods");
    openMulti(reporting);
    toggleMulti(reporting, "Session notes");
    expect(lastForm().progressReportingMethods).toEqual(["team-meetings", "session-notes"]);
  });
});

describe("the single selects and the free text", () => {
  it("records the two frequencies", () => {
    renderSection();
    chooseOption(field("Data collection frequency"), "Every session");
    expect(lastForm().dataCollectionFrequency).toBe("every-session");
    chooseOption(field("Data review frequency"), "Quarterly");
    expect(lastForm().dataReviewFrequency).toBe("quarterly");
  });

  it("records what is typed into each rich text field", () => {
    renderSection();
    typeInEditor(editor("Data collection overview"), "<p>Every session</p>");
    typeInEditor(editor("Behaviors/Targets monitored"), "<p>Hitting</p>");
    typeInEditor(editor("Supporting data description"), "<p>Weekly graph</p>");
    typeInEditor(editor("Data interpretation"), "<p>Downward trend</p>");
    typeInEditor(editor("Data limitations or notes"), "<p>Two sessions missed</p>");
    expect(lastForm()).toMatchObject({
      dataCollectionOverview: "<p>Every session</p>",
      behaviorsTargetsMonitored: "<p>Hitting</p>",
      supportingDataDescription: "<p>Weekly graph</p>",
      dataInterpretation: "<p>Downward trend</p>",
      dataLimitationsNotes: "<p>Two sessions missed</p>",
    });
  });

  it("closes a single select when the backdrop is clicked", () => {
    renderSection();
    const frequency = field("Data collection frequency");
    openMulti(frequency);
    expect(frequency.querySelector(".report-builder-select-dropdown")).toBeInTheDocument();
    fireEvent.click(frequency.querySelector(".report-builder-select-overlay"));
    expect(
      frequency.querySelector(".report-builder-select-dropdown")
    ).not.toBeInTheDocument();
  });
});

describe("the supporting data attachments", () => {
  const pickFile = () => {
    fireEvent.change(
      field("Supporting data attachments").querySelector("input[type=file]"),
      { target: { files: [new File(["x"], "graph.png", { type: "image/png" })] } }
    );
  };

  it("attaches an uploaded file to the section", async () => {
    renderSection();
    pickFile();
    await waitFor(() =>
      expect(lastForm().supportingDataAttachments).toEqual([
        { filename: "graph.png", url: "https://files/graph.png" },
      ])
    );
  });

  it("says so when the upload is refused, and attaches nothing", async () => {
    upload.UploadImage.mockRejectedValue(new Error("network"));
    renderSection();
    pickFile();
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("File upload failed", "error")
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it("opens an attached file in the viewer and can take it off again", () => {
    renderSection({ data: fullData });
    fireEvent.click(screen.getByRole("button", { name: "graph.png" }));
    expect(viewer.openDocument).toHaveBeenCalledWith("https://files/graph.png", "graph.png");
    fireEvent.click(
      field("Supporting data attachments").querySelector(".report-builder-file-remove")
    );
    expect(lastForm().supportingDataAttachments).toEqual([]);
  });
});

describe("a read-only section", () => {
  it("hides the file picker and the remove button", () => {
    renderSection({ data: fullData, isReadOnly: true, onRemoveSection });
    expect(
      field("Supporting data attachments").querySelector("input[type=file]")
    ).not.toBeInTheDocument();
    expect(
      field("Supporting data attachments").querySelector(".report-builder-file-remove")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("still shows the stored content", () => {
    renderSection({ data: fullData, isReadOnly: true });
    expect(selectedLabel(field("Data collection frequency"))).toBe("Daily");
    expect(screen.getByRole("button", { name: "graph.png" })).toBeInTheDocument();
  });
});

describe("removing the whole section", () => {
  it("offers the button only when the parent gave it something to call", () => {
    renderSection({ data: fullData });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
  });

  it("hands the removal back to the parent", () => {
    renderSection({ data: fullData, onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalled();
  });
});

describe("the messages the form puts up when a field is left empty", () => {
  it.each([
    [
      "Measurement methods",
      "At least one measurement method is required",
    ],
    ["Data collection frequency", "Data collection frequency is required"],
    ["Who collects data", "At least one data collector is required"],
    ["Data recording tools", "At least one recording tool is required"],
    ["Data review frequency", "Data review frequency is required"],
    ["Data Storage location", "At least one storage location is required"],
    ["Progress reporting methods", "At least one reporting method is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    message
  ) => {
    // A blank section is short in every required field at once, so leaving one
    // of them is also the check that only that one is on screen.
    renderSection();
    leaveSelect(field(label));
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it.each([
    [
      "measurement method",
      { measurementMethods: ["other"], measurementMethodsOther: "" },
      "Enter other measurement method",
      "Please specify the measurement method",
    ],
    [
      "recording tool",
      { dataRecordingTools: ["other"], dataRecordingToolsOther: "" },
      "Enter other recording tool",
      "Please specify the recording tool",
    ],
    [
      "storage location",
      { dataStorageLocation: ["other"], dataStorageLocationOther: "" },
      "Enter other storage location",
      "Please specify the storage location",
    ],
  ])("asks for the %s to be spelled out when Other is left blank", async (
    _name,
    over,
    placeholder,
    message
  ) => {
    renderSection({ data: { ...fullData, ...over } });
    fireEvent.blur(screen.getByPlaceholderText(placeholder));
    await waitFor(() => expect(sectionErrors()).toEqual([message]));
  });

  it("takes the message back down as soon as the field is filled in", async () => {
    renderSection({
      data: { ...fullData, measurementMethods: ["other"], measurementMethodsOther: "" },
    });
    const specify = () => screen.getByPlaceholderText("Enter other measurement method");
    fireEvent.blur(specify());
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["Please specify the measurement method"])
    );

    // A touched field is re-checked on every keystroke, and the rest of this
    // fixture is complete, so the whole form validates and every message goes.
    fireEvent.change(specify(), { target: { value: "Video review" } });
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastForm().measurementMethodsOther).toBe("Video review");
  });

  it("shows a second message once a second field has been left too", async () => {
    renderSection();
    leaveSelect(field("Data collection frequency"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["Data collection frequency is required"])
    );

    leaveSelect(field("Data review frequency"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual([
        "Data collection frequency is required",
        "Data review frequency is required",
      ])
    );
  });

  it("keeps a touched field's message up while another field is still short", async () => {
    renderSection({ data: { ...fullData, whoCollectsData: [], dataReviewFrequency: "" } });
    leaveSelect(field("Who collects data"));
    await waitFor(() =>
      expect(sectionErrors()).toEqual(["At least one data collector is required"])
    );

    // Answering the collector question re-checks the form, which still fails on
    // the review frequency -- but that field was never left, so nothing new
    // appears and the answered field's message goes.
    const collectors = field("Who collects data");
    openMulti(collectors);
    toggleMulti(collectors, "RBT");
    await waitFor(() => expect(sectionErrors()).toEqual([]));
    expect(lastForm().whoCollectsData).toEqual(["rbt"]);
  });
});

describe("a read-only section's controls", () => {
  it("locks every select and text field", () => {
    renderSection({
      data: { ...fullData, measurementMethods: ["other"] },
      isReadOnly: true,
    });
    const buttons = document.body.querySelectorAll(".report-builder-select-button");
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((b) => expect(b).toBeDisabled());
    document.body
      .querySelectorAll(".report-builder-input")
      .forEach((i) => expect(i).toHaveAttribute("readonly"));
  });

  it("cannot be made to put a message up, because nothing can be left", () => {
    renderSection({ isReadOnly: true });
    const button = field("Data collection frequency").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(sectionErrors()).toEqual([]);
  });
});
