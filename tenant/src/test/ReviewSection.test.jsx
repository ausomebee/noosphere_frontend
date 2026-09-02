import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/**
 * The Review section of the clinical report builder: a block of review
 * metadata plus a repeatable list of service recommendation cards, each with
 * its own multi-select of locations and a conditional "Please specify" field.
 *
 * Everything the section owns is lifted -- it holds its own useState copy and
 * re-emits the whole object through `onChange` on every keystroke -- so most
 * assertions read the last object handed to that spy rather than the DOM.
 *
 * The pickers are the report builder's own button/dropdown pair rather than
 * react-select or a native <select>, so an option is taken by opening the
 * button and clicking the option div (or its checkbox, for the multi-select).
 * The rich text editor is contentEditable and reaches for execCommand, which
 * jsdom does not implement, so it is replaced by a plain input probe that
 * still calls the same onChange.
 */

const toastMock = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toastMock.showToast(...a),
  showApiError: vi.fn(),
}));

vi.mock("../Components/Input/RichTextEditor/RichTextEditorInput", () => ({
  default: ({ label, value, onChange }) => (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import ReviewSection from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ReviewSection/ReviewSection";

const onChange = vi.fn();
const onRemoveSection = vi.fn();

const renderSection = (props = {}) =>
  render(<ReviewSection onChange={onChange} {...props} />);

const lastEmitted = () => onChange.mock.calls[onChange.mock.calls.length - 1][0];

const cards = () => Array.from(document.body.querySelectorAll(".service-recommendation-card"));

/** The report builder's fields are label + control siblings, not label/for pairs. */
const field = (root, labelText) =>
  Array.from(root.querySelectorAll(".report-builder-field")).find(
    (f) => f.querySelector(".report-builder-label")?.textContent.replace(/\*$/, "").trim() === labelText
  );

const textIn = (root, labelText, value) =>
  fireEvent.change(field(root, labelText).querySelector("input"), { target: { value } });

/** Opens a single-select and takes the option with the given label. */
const pick = (root, labelText, optionLabel) => {
  const wrapper = field(root, labelText);
  fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
  fireEvent.click(within(wrapper).getByText(optionLabel));
};

/** Toggles one checkbox inside an open multi-select. */
const toggleLocation = (card, optionLabel) => {
  const wrapper = field(card, "Location");
  const button = wrapper.querySelector(".report-builder-select-button");
  if (button.getAttribute("aria-expanded") === "false") fireEvent.click(button);
  // Scoped to the dropdown: the collapsed button echoes the chosen labels, so
  // a selected option's text also appears outside the list.
  const list = wrapper.querySelector(".report-builder-multi-select-dropdown");
  fireEvent.click(within(list).getByText(optionLabel).parentElement.querySelector("input"));
};

/**
 * Leaving a field is what marks it touched, and for both pickers that means the
 * list shutting rather than a native blur.
 */
const leaveSelect = (root, labelText) => {
  const wrapper = field(root, labelText);
  fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
  fireEvent.click(wrapper.querySelector(".report-builder-select-overlay"));
};

const errorsIn = (root) =>
  Array.from(root.querySelectorAll(".report-builder-error")).map((e) => e.textContent);

const filledData = {
  reviewType: "annual-review",
  reviewDate: "2024-05-01",
  reviewedBy: "Dr Chen",
  summaryOfProgress: "<p>Doing well</p>",
  progressDetermination: "minimal-progress",
  decisionOutcome: "modify-treatment-plan",
  rationaleForDecision: "<p>Because</p>",
  changesRecommended: "<p>More hours</p>",
  nextReviewTimeline: "quarterly",
  serviceRecommendations: [
    {
      id: 1,
      serviceRecommendation: "ABA therapy",
      descriptionOfServices: "<p>Direct</p>",
      numberOfHoursRequested: "20",
      durationOfService: "6 months",
      location: ["home", "clinic"],
      locationOther: "",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the initial state", () => {
  it("starts every field blank with one empty recommendation card", () => {
    renderSection();
    expect(field(document.body, "Review Type")).toHaveTextContent("Select an option");
    expect(field(document.body, "Reviewed by").querySelector("input")).toHaveValue("");
    expect(cards()).toHaveLength(1);
    expect(screen.getByText("Service Recommendation 1")).toBeInTheDocument();
    expect(field(cards()[0], "Location")).toHaveTextContent("Select an option");
  });

  it("seeds itself from a saved review", () => {
    renderSection({ data: filledData });
    expect(field(document.body, "Review Type")).toHaveTextContent("Annual review");
    expect(field(document.body, "Review Date").querySelector("input")).toHaveValue("2024-05-01");
    expect(field(document.body, "Reviewed by").querySelector("input")).toHaveValue("Dr Chen");
    expect(screen.getByLabelText("Summary of progress")).toHaveValue("<p>Doing well</p>");
    expect(field(document.body, "Progress determination")).toHaveTextContent("Minimal progress");
    expect(field(document.body, "Decision outcome")).toHaveTextContent("Modify treatment plan");
    expect(field(document.body, "Next review timeline")).toHaveTextContent("Quarterly");
    expect(field(cards()[0], "Service Recommendation").querySelector("input")).toHaveValue(
      "ABA therapy"
    );
    expect(field(cards()[0], "Location")).toHaveTextContent("Home, Clinic");
  });

  it("keeps the saved recommendation list instead of adding a blank one", () => {
    renderSection({
      data: {
        serviceRecommendations: [
          { id: 1, serviceRecommendation: "One", location: [] },
          { id: 2, serviceRecommendation: "Two", location: [] },
        ],
      },
    });
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("Service Recommendation 2")).toBeInTheDocument();
  });
});

describe("editing the review fields", () => {
  it("emits the whole review whenever a picker is used", () => {
    renderSection();
    pick(document.body, "Review Type", "Quarterly review");
    expect(lastEmitted().reviewType).toBe("quarterly-review");

    pick(document.body, "Progress determination", "Regression observed");
    expect(lastEmitted().progressDetermination).toBe("regression-observed");

    pick(document.body, "Decision outcome", "Discontinue services");
    expect(lastEmitted().decisionOutcome).toBe("discontinue-services");

    pick(document.body, "Next review timeline", "Semi-annually");
    expect(lastEmitted().nextReviewTimeline).toBe("semi-annually");
    // Each emission carries the previously chosen values too.
    expect(lastEmitted().reviewType).toBe("quarterly-review");
  });

  it("emits typed and rich-text edits", () => {
    renderSection();
    textIn(document.body, "Review Date", "2024-06-30");
    textIn(document.body, "Reviewed by", "Dr Patel");
    fireEvent.change(screen.getByLabelText("Summary of progress"), {
      target: { value: "<p>Steady</p>" },
    });
    fireEvent.change(screen.getByLabelText("Rationale for decision"), {
      target: { value: "<p>Rationale</p>" },
    });
    fireEvent.change(screen.getByLabelText("Changes recommended"), {
      target: { value: "<p>Changes</p>" },
    });
    expect(lastEmitted()).toMatchObject({
      reviewDate: "2024-06-30",
      reviewedBy: "Dr Patel",
      summaryOfProgress: "<p>Steady</p>",
      rationaleForDecision: "<p>Rationale</p>",
      changesRecommended: "<p>Changes</p>",
    });
  });

  it("closes a dropdown again when its backdrop is clicked", () => {
    renderSection();
    const wrapper = field(document.body, "Review Type");
    fireEvent.click(wrapper.querySelector(".report-builder-select-button"));
    expect(wrapper.querySelector(".report-builder-select-dropdown")).toBeInTheDocument();
    fireEvent.click(wrapper.querySelector(".report-builder-select-overlay"));
    expect(wrapper.querySelector(".report-builder-select-dropdown")).not.toBeInTheDocument();
  });
});

describe("the service recommendation cards", () => {
  it("appends a fresh blank card", () => {
    renderSection({ data: filledData });
    fireEvent.click(screen.getByRole("button", { name: "Add Service recommendation" }));
    expect(cards()).toHaveLength(2);
    expect(lastEmitted().serviceRecommendations[1]).toMatchObject({
      serviceRecommendation: "",
      location: [],
      locationOther: "",
    });
    // The original card is untouched.
    expect(lastEmitted().serviceRecommendations[0].serviceRecommendation).toBe("ABA therapy");
  });

  it("removes the card that was asked for and leaves the rest", () => {
    renderSection({
      data: {
        serviceRecommendations: [
          { id: 1, serviceRecommendation: "One", location: [] },
          { id: 2, serviceRecommendation: "Two", location: [] },
        ],
      },
    });
    fireEvent.click(
      within(cards()[0]).getByRole("button", { name: /Delete Service Recommendation/ })
    );
    expect(cards()).toHaveLength(1);
    expect(lastEmitted().serviceRecommendations).toEqual([
      { id: 2, serviceRecommendation: "Two", location: [] },
    ]);
  });

  it("refuses to remove the only card", () => {
    renderSection({ data: filledData });
    fireEvent.click(screen.getByRole("button", { name: /Delete Service Recommendation/ }));
    expect(toastMock.showToast).toHaveBeenCalledWith(
      "At least one service recommendation is required."
    );
    expect(cards()).toHaveLength(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("edits only the card that was touched", () => {
    renderSection({
      data: {
        serviceRecommendations: [
          { id: 1, serviceRecommendation: "One", location: [] },
          { id: 2, serviceRecommendation: "Two", location: [] },
        ],
      },
    });
    textIn(cards()[1], "Service Recommendation", "Two edited");
    textIn(cards()[1], "Number of hours requested", "12");
    textIn(cards()[1], "Duration of service", "3 months");
    fireEvent.change(within(cards()[1]).getByLabelText("Description of Services"), {
      target: { value: "<p>Detail</p>" },
    });

    const [first, second] = lastEmitted().serviceRecommendations;
    expect(first.serviceRecommendation).toBe("One");
    expect(second).toMatchObject({
      serviceRecommendation: "Two edited",
      numberOfHoursRequested: "12",
      durationOfService: "3 months",
      descriptionOfServices: "<p>Detail</p>",
    });
  });
});

describe("the location multi-select", () => {
  it("accumulates ordinary locations and drops one on a second click", () => {
    renderSection({ data: { serviceRecommendations: [{ id: 1, location: [] }] } });
    toggleLocation(cards()[0], "Home");
    expect(lastEmitted().serviceRecommendations[0].location).toEqual(["home"]);
    toggleLocation(cards()[0], "School");
    expect(lastEmitted().serviceRecommendations[0].location).toEqual(["home", "school"]);
    toggleLocation(cards()[0], "Home");
    expect(lastEmitted().serviceRecommendations[0].location).toEqual(["school"]);
  });

  it("collapses the selection to Other alone once Other is picked", () => {
    renderSection({
      data: { serviceRecommendations: [{ id: 1, location: ["home", "clinic"] }] },
    });
    toggleLocation(cards()[0], "Other");
    expect(lastEmitted().serviceRecommendations[0].location).toEqual(["other"]);
  });

  it("drops Other again as soon as a real location is added", () => {
    renderSection({ data: { serviceRecommendations: [{ id: 1, location: ["other"] }] } });
    toggleLocation(cards()[0], "Telehealth");
    expect(lastEmitted().serviceRecommendations[0].location).toEqual(["telehealth"]);
  });

  it("clears the selection when Other is unticked", () => {
    renderSection({ data: { serviceRecommendations: [{ id: 1, location: ["other"] }] } });
    toggleLocation(cards()[0], "Other");
    expect(lastEmitted().serviceRecommendations[0].location).toEqual([]);
  });

  it("reveals the specify field only while Other is selected", () => {
    renderSection({ data: { serviceRecommendations: [{ id: 1, location: [] }] } });
    expect(field(cards()[0], "Please specify")).toBeUndefined();

    toggleLocation(cards()[0], "Other");
    expect(field(cards()[0], "Please specify")).toBeDefined();
    textIn(cards()[0], "Please specify", "Grandparent's house");
    expect(lastEmitted().serviceRecommendations[0].locationOther).toBe("Grandparent's house");

    toggleLocation(cards()[0], "Other");
    expect(field(cards()[0], "Please specify")).toBeUndefined();
  });

  it("shows the specify field straight away for a saved Other location", () => {
    renderSection({
      data: { serviceRecommendations: [{ id: 1, location: ["other"], locationOther: "Park" }] },
    });
    expect(field(cards()[0], "Please specify").querySelector("input")).toHaveValue("Park");
  });
});

describe("read-only mode", () => {
  it("hides every control that would change the section", () => {
    renderSection({ data: filledData, isReadOnly: true, onRemoveSection });
    expect(
      screen.queryByRole("button", { name: /Delete Service Recommendation/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add Service recommendation" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
    // The values themselves are still on screen.
    expect(field(document.body, "Reviewed by").querySelector("input")).toHaveValue("Dr Chen");
  });
});

describe("removing the whole section", () => {
  it("offers the remove button only when the parent supplied a handler", () => {
    const { unmount } = renderSection({ data: filledData });
    expect(screen.queryByRole("button", { name: "Remove Section" })).not.toBeInTheDocument();
    unmount();

    renderSection({ data: filledData, onRemoveSection });
    fireEvent.click(screen.getByRole("button", { name: "Remove Section" }));
    expect(onRemoveSection).toHaveBeenCalledTimes(1);
  });
});

describe("the messages the review itself puts up", () => {
  it.each([
    ["Review Type", "Review type is required"],
    ["Progress determination", "Progress determination is required"],
    ["Decision outcome", "Decision outcome is required"],
    ["Next review timeline", "Next review timeline is required"],
  ])("complains about %s once its list has been opened and shut", async (
    label,
    message
  ) => {
    // A blank review is short in all four at once, so leaving one of them is
    // also the check that only the field that was left says anything.
    renderSection();
    leaveSelect(document.body, label);
    await waitFor(() => expect(errorsIn(document.body)).toEqual([message]));
  });

  it("shows a second message once a second field has been left too", async () => {
    renderSection();
    leaveSelect(document.body, "Review Type");
    await waitFor(() => expect(errorsIn(document.body)).toEqual(["Review type is required"]));

    leaveSelect(document.body, "Decision outcome");
    await waitFor(() =>
      expect(errorsIn(document.body)).toEqual([
        "Review type is required",
        "Decision outcome is required",
      ])
    );
  });

  it("asks for a service recommendation when the list is empty", async () => {
    // An empty array is kept as given, so the section renders no cards at all
    // and the array's own message is the only thing on screen. It is not gated
    // on anything being touched, so any blur is enough to raise it.
    renderSection({ data: { ...filledData, serviceRecommendations: [] } });
    expect(cards()).toHaveLength(0);
    leaveSelect(document.body, "Review Type");
    await waitFor(() =>
      expect(errorsIn(document.body)).toEqual([
        "At least one service recommendation is required",
      ])
    );
  });

  it("leaves the old message up when a touched picker is answered, until it is left again", async () => {
    renderSection();
    leaveSelect(document.body, "Review Type");
    await waitFor(() => expect(errorsIn(document.body)).toEqual(["Review type is required"]));

    // Taking an option shuts the list, which counts as leaving the field, and
    // the blur re-checks the review captured in the current render -- so it
    // re-raises the message the change had just cleared.
    pick(document.body, "Review Type", "Annual review");
    await waitFor(() => expect(lastEmitted().reviewType).toBe("annual-review"));
    expect(errorsIn(document.body)).toEqual(["Review type is required"]);

    leaveSelect(document.body, "Review Type");
    await waitFor(() => expect(errorsIn(document.body)).toEqual([]));
  });
});

describe("the messages a service recommendation card puts up", () => {
  const card = (over) => ({ ...filledData.serviceRecommendations[0], ...over });

  it("complains about a blank service recommendation once the field is left", async () => {
    renderSection({
      data: { ...filledData, serviceRecommendations: [card({ serviceRecommendation: "" })] },
    });
    fireEvent.blur(field(cards()[0], "Service Recommendation").querySelector("input"));
    await waitFor(() =>
      expect(errorsIn(cards()[0])).toEqual(["Service recommendation is required"])
    );
  });

  it("complains about an empty location once its list has been opened and shut", async () => {
    renderSection({ data: { ...filledData, serviceRecommendations: [card({ location: [] })] } });
    leaveSelect(cards()[0], "Location");
    await waitFor(() =>
      expect(errorsIn(cards()[0])).toEqual(["At least one location is required"])
    );
  });

  it("asks for the location to be spelled out when Other is left blank", async () => {
    renderSection({
      data: {
        ...filledData,
        serviceRecommendations: [card({ location: ["other"], locationOther: "" })],
      },
    });
    fireEvent.blur(screen.getByPlaceholderText("Enter other location"));
    await waitFor(() => expect(errorsIn(cards()[0])).toEqual(["Please specify the location"]));
  });

  it("shows every short field on a card as soon as any of them is left", async () => {
    // Unlike the review's own fields, a card's messages are not gated on which
    // field was touched: one blur validates the whole card and every failure it
    // finds goes on screen.
    renderSection({
      data: {
        ...filledData,
        serviceRecommendations: [card({ serviceRecommendation: "", location: [] })],
      },
    });
    leaveSelect(cards()[0], "Location");
    await waitFor(() =>
      expect(errorsIn(cards()[0])).toEqual([
        "Service recommendation is required",
        "At least one location is required",
      ])
    );
  });

  it("clears one card's messages while leaving another card's alone", async () => {
    renderSection({
      data: {
        ...filledData,
        serviceRecommendations: [
          card({ location: [] }),
          card({ id: 2, serviceRecommendation: "" }),
        ],
      },
    });
    leaveSelect(cards()[0], "Location");
    await waitFor(() =>
      expect(errorsIn(cards()[0])).toEqual(["At least one location is required"])
    );

    const name = () => field(cards()[1], "Service Recommendation").querySelector("input");
    fireEvent.blur(name());
    await waitFor(() =>
      expect(errorsIn(cards()[1])).toEqual(["Service recommendation is required"])
    );

    // A card that already has a message is re-checked on every keystroke, and
    // the clear-up only drops the keys belonging to that card.
    fireEvent.change(name(), { target: { value: "Speech therapy" } });
    await waitFor(() => expect(errorsIn(cards()[1])).toEqual([]));
    expect(errorsIn(cards()[0])).toEqual(["At least one location is required"]);
  });
});

describe("a read-only review's controls", () => {
  it("locks every picker and text field", () => {
    renderSection({
      data: {
        ...filledData,
        serviceRecommendations: [
          { ...filledData.serviceRecommendations[0], location: ["other"] },
        ],
      },
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
    const button = field(document.body, "Review Type").querySelector(
      ".report-builder-select-button"
    );
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(errorsIn(document.body)).toEqual([]);
  });
});
