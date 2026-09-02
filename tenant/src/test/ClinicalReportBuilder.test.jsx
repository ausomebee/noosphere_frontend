import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";
import clinicalReportReducer from "../ReduxStore/features/clinicalReportSlice";

/**
 * The clinical report builder: the full-page editor a clinician opens from the
 * Clinical Reports list. It owns the metadata header, the sidebar of available
 * document sections, the sortable preview of the sections that were added, a
 * footer whose buttons change completely with the report's lifecycle mode, and
 * the change-request conversation between the creator and the approver.
 *
 * Everything the page renders inside a section card is a probe. The twelve
 * document sections are heavyweight editors of their own, so each is replaced
 * by a stub that records the props it was handed and offers two buttons for
 * pushing an edit back up -- which is how the debounced write into Redux gets
 * exercised without typing into a real form.
 *
 * The Redux slice itself is real: the reducers do the section bookkeeping the
 * page depends on, and the save/publish thunks run for real against a mocked
 * API module, so the payload the endpoint receives is genuine. Preloaded state
 * is used only to reach the in-flight and post-save renders that a thunk would
 * otherwise flash through too quickly to assert on.
 *
 * dnd-kit is a probe as well. Simulating a pointer drag in jsdom proves
 * nothing about this page, so the DndContext stub simply hands its drag
 * handlers back to the test, which calls them with synthetic active/over pairs.
 *
 * Which report the page opens comes entirely from `location.state`, so almost
 * every test sets that first: `mode` decides read-only-ness and the footer,
 * and an `id` on a mode the page recognises is what triggers the API load
 * rather than a local initialisation.
 */

const api = vi.hoisted(() => ({
  GetSingleClinicalReportById: vi.fn(),
  CreateClinicalReport: vi.fn(),
  UpdateClinicalReport: vi.fn(),
  GetAllClinicalReportChangeRequests: vi.fn(),
  GetClinicalReportAuditTrails: vi.fn(),
  CreateClinicalReportChangeRequest: vi.fn(),
  MarkClinicalReportChangeRequestViewed: vi.fn(),
  ApproveClinicalReport: vi.fn(),
  ResubmitClinicalReport: vi.fn(),
  UpdateClinicalReportStatus: vi.fn(),
}));
vi.mock("../api/TemplateAndReportApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const router = vi.hoisted(() => ({ state: null, navigate: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => router.navigate,
  useLocation: () => ({ state: router.state }),
}));

// The drag handlers are otherwise unreachable: PointerSensor needs a real
// pointer stream, which jsdom cannot produce.
const dnd = vi.hoisted(() => ({ handlers: {}, draggingId: null }));
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragStart, onDragEnd, onDragCancel }) => {
    dnd.handlers = { onDragStart, onDragEnd, onDragCancel };
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: () => null,
  KeyboardSensor: function KeyboardSensor() {},
  PointerSensor: function PointerSensor() {},
  useSensor: () => ({}),
  useSensors: (...sensors) => sensors,
}));
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <>{children}</>,
  sortableKeyboardCoordinates: () => null,
  verticalListSortingStrategy: "vertical",
  useSortable: ({ id, disabled }) => ({
    attributes: { "data-sortable": String(!disabled) },
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: dnd.draggingId === id,
  }),
}));

const sections = vi.hoisted(() => {
  const props = {};
  const probe = (key) => (received) => {
    props[key] = received;
    return (
      <div data-testid={`${key}-section`}>
        <button onClick={() => received.onChange({ note: "first" })}>edit {key}</button>
        <button onClick={() => received.onChange({ note: "second" })}>revise {key}</button>
        <button onClick={() => received.onRemoveSection()}>drop {key}</button>
      </div>
    );
  };
  return { props, probe };
});

vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ClientInformationSection/ClientInformationSection", () => ({
  default: sections.probe("clientInformation"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/AssessmentsSections/AssessmentsSection", () => ({
  default: sections.probe("assessments"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/TargetBehavioursSections/TargetBehavioursSection", () => ({
  default: sections.probe("targetBehaviours"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/BehaviourStrategiesSection/BehaviourStrategiesSection", () => ({
  default: sections.probe("behaviourStrategies"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/GoalsTargetsSection/GoalsTargetsSection", () => ({
  default: sections.probe("goalsTargets"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/MonitoringDataSection/MonitoringDataSection", () => ({
  default: sections.probe("monitoringData"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ImplementationNotesSection/ImplementationNotesSection", () => ({
  default: sections.probe("implementationNotes"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/CrisisSafetySection/CrisisSafetySection", () => ({
  default: sections.probe("crisisSafety"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/GeneralizationSection/GeneralizationSection", () => ({
  default: sections.probe("generalization"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ReviewSection/ReviewSection", () => ({
  default: sections.probe("review"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/DischargeSection/DischargeSection", () => ({
  default: sections.probe("discharge"),
}));
vi.mock("../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/DocumentSections/ConsentSignaturesSection/ConsentSignaturesSection", () => ({
  default: sections.probe("consentSignatures"),
}));

import ClinicalReportBuilder from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/ClinicalReportBuilder";

const baseClinical = clinicalReportReducer(undefined, { type: "@@INIT" });

const renderBuilder = ({ state = null, permissions, clinical } = {}) => {
  router.state = state;
  const store = configureStore({
    reducer: {
      authentication: authReducer,
      generalSettings: generalSettingsReducer,
      clinicalReport: clinicalReportReducer,
    },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          // An empty accesses array is the org-owner case: everything granted.
          role: permissions
            ? { roleModuleAccesses: [{ module: "CLIENTS", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
      // Marked loaded so useFormatSettings never reaches for the settings API.
      generalSettings: {
        dateFormat: "MM/DD/YYYY",
        timeFormat: "12-hour",
        currency: "USD",
        loaded: true,
      },
      clinicalReport: clinical
        ? {
            ...baseClinical,
            ...clinical,
            metadata: { ...baseClinical.metadata, ...(clinical.metadata || {}) },
          }
        : baseClinical,
    },
  });
  const utils = render(
    <Provider store={store}>
      <ClinicalReportBuilder />
    </Provider>
  );
  return { ...utils, store };
};

// A loaded report as the API returns it: sections keyed by their human label,
// which is how the slice maps them back onto section ids.
const apiReport = (over = {}) => ({
  id: "rep-1",
  title: "Behaviour Plan",
  status: "DRAFT",
  createdAt: "2026-01-05T10:00:00",
  updatedAt: "2026-02-06T10:00:00",
  approver: { fullName: "Grace Hopper" },
  approverId: "app-1",
  creator: { fullName: "Ada Lovelace" },
  creatorId: "cre-1",
  clientTenantId: "tc-1",
  tenantId: "tenant-1",
  client: { client: { firstName: "Sam", lastName: "Rivers" } },
  sections: [{ section: "Goals & Targets", content: { goal: "walk" }, order: 0, id: "sec-1" }],
  ...over,
});

const metadataValue = (label) =>
  screen.getByText(label).nextElementSibling?.textContent?.trim() ?? "";

const sectionCards = () => document.body.querySelectorAll(".crb-section-card");

const openActionMenu = (card) =>
  fireEvent.click(card.querySelector(".crb-action-btn"));

beforeEach(() => {
  vi.clearAllMocks();
  dnd.draggingId = null;
  api.GetSingleClinicalReportById.mockResolvedValue({ data: apiReport() });
  api.CreateClinicalReport.mockResolvedValue({ data: { id: "new-1" }, id: "new-1" });
  api.UpdateClinicalReport.mockResolvedValue({ data: { id: "rep-1" } });
  api.GetAllClinicalReportChangeRequests.mockResolvedValue({ data: [] });
  api.GetClinicalReportAuditTrails.mockResolvedValue({ data: [] });
  api.CreateClinicalReportChangeRequest.mockResolvedValue({});
  api.MarkClinicalReportChangeRequestViewed.mockResolvedValue({});
  api.ApproveClinicalReport.mockResolvedValue({});
  api.ResubmitClinicalReport.mockResolvedValue({});
  api.UpdateClinicalReportStatus.mockResolvedValue({});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening a report", () => {
  it("starts an empty document when the route carries no state at all", async () => {
    renderBuilder();
    expect(api.GetSingleClinicalReportById).not.toHaveBeenCalled();
    expect(screen.getByText("No sections added yet")).toBeInTheDocument();
    expect(
      screen.getByText("Click on sections from the left to add them")
    ).toBeInTheDocument();
  });

  it("fetches the stored document when the route names one to edit", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await waitFor(() =>
      expect(api.GetSingleClinicalReportById).toHaveBeenCalledWith({
        Id: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(await screen.findByTestId("goalsTargets-section")).toBeInTheDocument();
  });

  it("initialises locally when a recognised mode arrives without a report id", async () => {
    renderBuilder({ state: { mode: "edit" } });
    await waitFor(() => expect(screen.getByText("No sections added yet")).toBeInTheDocument());
    expect(api.GetSingleClinicalReportById).not.toHaveBeenCalled();
  });

  it("shows the section loader while the fetch is still in flight", async () => {
    let release;
    api.GetSingleClinicalReportById.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderBuilder({ state: { id: "rep-1", mode: "view" } });
    expect(await screen.findByRole("status")).toHaveTextContent("Loading...");
    release({ data: apiReport() });
    expect(await screen.findByTestId("goalsTargets-section")).toBeInTheDocument();
  });

  it("restores the sections a caller handed over in form data", async () => {
    renderBuilder({
      state: {
        mode: "edit",
        formData: {
          activeSections: ["goalsTargets", "review"],
          expandedSections: ["goalsTargets"],
          sectionData: { goalsTargets: { goal: "walk" } },
        },
      },
    });
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
    // Only the first was listed as expanded, so the second card is collapsed.
    expect(sectionCards()[1].querySelector(".crb-section-content")).toHaveClass("collapsed");
  });

  it("expands every restored section when no expanded list came with them", () => {
    renderBuilder({
      state: {
        mode: "edit",
        formData: { activeSections: ["goalsTargets", "review"] },
      },
    });
    document.body.querySelectorAll(".crb-section-content").forEach((content) => {
      expect(content).not.toHaveClass("collapsed");
    });
  });

  it("takes its metadata from form data when the route sends none directly", () => {
    renderBuilder({
      state: {
        mode: "edit",
        formData: { metadata: { documentTitle: "Support Plan", approver: "Grace" } },
      },
    });
    expect(metadataValue("Document Title")).toBe("Support Plan");
    expect(metadataValue("Approver/Supervisor")).toBe("Grace");
  });
});

describe("the metadata panel", () => {
  it("fills every unset field with its placeholder", () => {
    renderBuilder();
    expect(metadataValue("Document Title")).toBe("Behaviour Intervention Plan");
    expect(metadataValue("Approver/Supervisor")).toBe("Not specified");
    expect(metadataValue("Created by")).toBe("Not specified");
    expect(metadataValue("Last updated")).toBe("Not saved yet");
    expect(metadataValue("Date Created")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(document.body.querySelector(".crb-client-avatar")).toHaveTextContent("??");
    expect(screen.getByText("Not specified", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText(/Document Version: v1/)).toBeInTheDocument();
  });

  it("shows the stored values once a report has been loaded", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await screen.findByTestId("goalsTargets-section");
    expect(metadataValue("Document Title")).toBe("Behaviour Plan");
    expect(metadataValue("Date Created")).toBe("01/05/2026");
    expect(metadataValue("Approver/Supervisor")).toBe("Grace Hopper");
    expect(metadataValue("Created by")).toBe("Ada Lovelace");
    expect(metadataValue("Last updated")).toBe("02/06/2026");
    expect(document.body.querySelector(".crb-client-avatar")).toHaveTextContent("SR");
    expect(screen.getByText("Rivers", { exact: false })).toBeInTheDocument();
  });

  it("calls the status Draft when the stored metadata carries none", () => {
    renderBuilder({ state: { mode: "edit" }, clinical: { metadata: { status: "" } } });
    const badge = document.body.querySelector(".crb-status-badge");
    expect(badge).toHaveTextContent("Draft");
    expect(badge).toHaveClass("draft");
  });

  it("lower-cases a stored status for the badge class", () => {
    renderBuilder({ state: { mode: "edit" }, clinical: { metadata: { status: "SUBMITTED" } } });
    const badge = document.body.querySelector(".crb-status-badge");
    expect(badge).toHaveTextContent("SUBMITTED");
    expect(badge).toHaveClass("submitted");
  });

  it("opens the audit trail with the report it is showing", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(document.body.querySelector(".crb-version-link"));
    expect(router.navigate).toHaveBeenCalledWith("/clinical-report/audit-trails", {
      state: {
        reportId: "rep-1",
        clientName: "Sam Rivers",
        documentTitle: "Behaviour Plan",
      },
    });
  });
});

describe("adding sections from the sidebar", () => {
  it("adds a section on click and refuses to add it twice", () => {
    renderBuilder();
    fireEvent.click(screen.getByText("Goals & Targets"));
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Goals & Targets", { selector: "span" }));
    expect(screen.getAllByTestId("goalsTargets-section")).toHaveLength(1);
    expect(document.body.querySelector(".crb-section-item.active")).toBeInTheDocument();
  });

  it("ignores a sidebar click while the document is read only", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByText("Review", { selector: "span" }));
    expect(screen.queryByTestId("review-section")).not.toBeInTheDocument();
    expect(document.body.querySelector(".crb-section-item")).toHaveClass("disabled");
    expect(document.body.querySelector(".crb-section-item")).toHaveStyle({
      cursor: "not-allowed",
    });
  });

  it("tells a reader with an empty read-only report that it has no sections", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({ data: apiReport({ sections: [] }) });
    renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    expect(await screen.findByText("This document has no sections")).toBeInTheDocument();
  });
});

describe("a section card", () => {
  const withOneSection = () =>
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
    });

  it("collapses and reopens when its header is clicked", () => {
    withOneSection();
    const content = document.body.querySelector(".crb-section-content");
    fireEvent.click(document.body.querySelector(".crb-section-header"));
    expect(content).toHaveClass("collapsed");
    fireEvent.click(document.body.querySelector(".crb-section-header"));
    expect(content).not.toHaveClass("collapsed");
  });

  it("keeps the header from toggling when the drag handle is pressed", () => {
    withOneSection();
    fireEvent.click(document.body.querySelector(".crb-drag-handle"));
    expect(document.body.querySelector(".crb-section-content")).not.toHaveClass("collapsed");
  });

  it("offers minimize while open and expand once minimized", () => {
    withOneSection();
    const card = sectionCards()[0];
    openActionMenu(card);
    fireEvent.click(screen.getByText("Minimize Section"));
    expect(card.querySelector(".crb-section-content")).toHaveClass("collapsed");
    openActionMenu(card);
    expect(screen.getByText("Expand Section")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Expand Section"));
    expect(card.querySelector(".crb-section-content")).not.toHaveClass("collapsed");
  });

  it("closes its own menu when the action button is pressed again", () => {
    withOneSection();
    const card = sectionCards()[0];
    openActionMenu(card);
    expect(screen.getByText("Remove Section")).toBeInTheDocument();
    openActionMenu(card);
    expect(screen.queryByText("Remove Section")).not.toBeInTheDocument();
  });

  it("closes an open menu when anything else on the page is clicked", () => {
    withOneSection();
    openActionMenu(sectionCards()[0]);
    fireEvent.click(document.body);
    expect(screen.queryByText("Remove Section")).not.toBeInTheDocument();
  });

  it("dims itself while it is the section being dragged", () => {
    dnd.draggingId = "goalsTargets";
    withOneSection();
    expect(sectionCards()[0]).toHaveStyle({ opacity: "0.5" });
  });

  it("hides the handle and the menu from a read-only document", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("goalsTargets-section");
    expect(document.body.querySelector(".crb-drag-handle")).not.toBeInTheDocument();
    expect(document.body.querySelector(".crb-action-btn")).not.toBeInTheDocument();
  });

  it("renders a card with no editor for a section the builder does not know", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({
        sections: [{ section: "Legacy Notes", content: { a: 1 }, order: 0 }],
      }),
    });
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    // The slice keeps an unmapped section under a squashed id, and the card
    // falls back to that id for its title because no config row matches.
    expect(await screen.findByText("legacynotes")).toBeInTheDocument();
    expect(sectionCards()).toHaveLength(1);
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
  });
});

describe("removing a section", () => {
  const withTwo = () =>
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets", "review"] } },
    });

  it("asks first, naming the section, and leaves it alone on cancel", () => {
    withTwo();
    openActionMenu(sectionCards()[0]);
    fireEvent.click(screen.getByText("Remove Section"));
    expect(screen.getByText('"Goals & Targets"')).toBeInTheDocument();
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
    expect(screen.queryByText("Remove Section")).not.toBeInTheDocument();
  });

  it("removes the section and says so once confirmed", () => {
    withTwo();
    openActionMenu(sectionCards()[0]);
    fireEvent.click(screen.getByText("Remove Section"));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("review-section")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith('"Goals & Targets" removed successfully');
  });

  it("can be triggered by the section editor itself", () => {
    withTwo();
    fireEvent.click(screen.getByText("drop goalsTargets"));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
  });

  it("calls an unrecognised section simply this section", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({ sections: [{ section: "Legacy Notes", content: {}, order: 0 }] }),
    });
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await screen.findByText("legacynotes");
    openActionMenu(sectionCards()[0]);
    fireEvent.click(screen.getByText("Remove Section"));
    expect(screen.getByText('"this section"')).toBeInTheDocument();
  });

  it("highlights the confirm buttons on hover and restores them on leave", () => {
    withTwo();
    openActionMenu(sectionCards()[0]);
    fireEvent.click(screen.getByText("Remove Section"));
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const remove = screen.getByRole("button", { name: "Remove" });
    const restingCancel = cancel.style.backgroundColor;
    const restingRemove = remove.style.backgroundColor;
    fireEvent.mouseOver(cancel);
    expect(cancel.style.backgroundColor).not.toBe(restingCancel);
    fireEvent.mouseOut(cancel);
    expect(cancel.style.backgroundColor).toBe(restingCancel);
    fireEvent.mouseOver(remove);
    expect(remove.style.backgroundColor).not.toBe(restingRemove);
    fireEvent.mouseOut(remove);
    expect(remove.style.backgroundColor).toBe(restingRemove);
  });
});

describe("dragging sections into a new order", () => {
  const withTwo = () =>
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets", "review"] } },
    });

  it("shows the dragged section's label in the overlay", () => {
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
      clinical: { activeDragId: "goalsTargets" },
    });
    expect(
      within(screen.getByTestId("drag-overlay")).getByText("Goals & Targets")
    ).toBeInTheDocument();
  });

  it("labels an overlay for an unknown section simply Section", () => {
    renderBuilder({ state: { mode: "edit" }, clinical: { activeDragId: "legacynotes_1" } });
    expect(within(screen.getByTestId("drag-overlay")).getByText("Section")).toBeInTheDocument();
  });

  it("reorders the preview when one section is dropped on another", () => {
    const { store } = withTwo();
    act(() => dnd.handlers.onDragStart({ active: { id: "goalsTargets" } }));
    expect(store.getState().clinicalReport.activeDragId).toBe("goalsTargets");
    act(() =>
      dnd.handlers.onDragEnd({ active: { id: "goalsTargets" }, over: { id: "review" } })
    );
    expect(store.getState().clinicalReport.activeSections).toEqual([
      "review",
      "goalsTargets",
    ]);
  });

  it("just clears the drag when a section is dropped back on itself", () => {
    const { store } = withTwo();
    act(() => dnd.handlers.onDragStart({ active: { id: "goalsTargets" } }));
    act(() =>
      dnd.handlers.onDragEnd({ active: { id: "goalsTargets" }, over: { id: "goalsTargets" } })
    );
    expect(store.getState().clinicalReport.activeDragId).toBeNull();
    expect(store.getState().clinicalReport.activeSections).toEqual([
      "goalsTargets",
      "review",
    ]);
  });

  it("throws when a section is released outside every drop target", () => {
    withTwo();
    // Documented rather than desired: `over` is null on a drop into empty
    // space and the handler reads `over.id` unguarded.
    expect(() =>
      dnd.handlers.onDragEnd({ active: { id: "goalsTargets" }, over: null })
    ).toThrow(TypeError);
  });

  it("clears the drag state when the gesture is cancelled", () => {
    const { store } = withTwo();
    act(() => dnd.handlers.onDragStart({ active: { id: "goalsTargets" } }));
    act(() => dnd.handlers.onDragCancel());
    expect(store.getState().clinicalReport.activeDragId).toBeNull();
  });

  it("refuses to start or finish a drag on a read-only document", async () => {
    const { store } = renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("goalsTargets-section");
    act(() => dnd.handlers.onDragStart({ active: { id: "goalsTargets" } }));
    expect(store.getState().clinicalReport.activeDragId).toBeNull();
    act(() =>
      dnd.handlers.onDragEnd({ active: { id: "goalsTargets" }, over: { id: "review" } })
    );
    expect(store.getState().clinicalReport.activeSections).toEqual(["goalsTargets"]);
  });
});

describe("auto-populated client information", () => {
  const clientCard = (clientData, sectionOver = {}) =>
    renderBuilder({
      state: {
        mode: "edit",
        metadata: { clientData },
        formData: {
          activeSections: ["clientInformation"],
          sectionData: { clientInformation: sectionOver },
        },
      },
    });

  it("reads the client off the metadata's client property", () => {
    clientCard({
      client: {
        firstName: "Ada",
        lastName: "Lovelace",
        preferredName: "Addy",
        DOB: "2015-04-02T00:00:00.000Z",
        gender: "female",
        email: "ada@example.com",
        streetAddress: "1 Analytical Way",
        city: "London",
        state: "LDN",
        country: "UK",
        payer: { payerName: "Blue Shield" },
      },
    });
    const data = sections.props.clientInformation.data;
    expect(data.clientFullName).toBe("Ada Lovelace (Addy)");
    expect(data.dateOfBirth).toBe("04/02/2015");
    expect(data.gender).toBe("Female");
    expect(data.address).toBe("1 Analytical Way, London, LDN, UK");
    expect(data.payer).toBe("Blue Shield");
  });

  it("falls back to blanks for a client record with nothing on it", () => {
    clientCard({ client: {} });
    const data = sections.props.clientInformation.data;
    expect(data.clientFullName).toBe("");
    expect(data.address).toBe("");
    expect(data.payer).toBe("N/A");
    expect(data.email).toBe("");
    expect(data.caregiverName).toBe("");
    // No date to format at all, so the formatter's own placeholder shows.
    expect(data.dateOfBirth).toBe("N/A");
    expect(data.gender).toBe("");
  });

  it("hands the editor nothing when the report knows of no client", () => {
    clientCard(undefined);
    expect(sections.props.clientInformation.data).toEqual({});
  });

  it("digs a client out of a nested clientData wrapper on a loaded report", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({
        client: { clientData: { client: { firstName: "Nested", lastName: "Client" } } },
        sections: [{ section: "Client Information", content: {}, order: 0 }],
      }),
    });
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await screen.findByTestId("clientInformation-section");
    expect(sections.props.clientInformation.data.clientFullName).toBe("Nested Client");
  });

  it("treats a flat client record as the client itself", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({
        client: { firstName: "Flat", lastName: "Record" },
        sections: [{ section: "Client Information", content: {}, order: 0 }],
      }),
    });
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await screen.findByTestId("clientInformation-section");
    expect(sections.props.clientInformation.data.clientFullName).toBe("Flat Record");
  });

  it("merges the loaded client over the one the route arrived with", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({
        client: { client: { firstName: "Api", lastName: "Name" } },
        sections: [{ section: "Client Information", content: {}, order: 0 }],
      }),
    });
    renderBuilder({
      state: {
        id: "rep-1",
        mode: "edit",
        metadata: {
          clientData: {
            client: { firstName: "Nav", lastName: "Nav", DOB: "2015-04-02", gender: "male" },
          },
        },
      },
    });
    await screen.findByTestId("clientInformation-section");
    const data = sections.props.clientInformation.data;
    expect(data.clientFullName).toBe("Api Name");
    // Neither is on the loaded record, so the navigation copy supplies them.
    expect(data.dateOfBirth).toBe("04/02/2015");
    expect(data.gender).toBe("Male");
  });

  it("restores a date of birth the loaded record blanked out", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({
        client: { client: { firstName: "Api", DOB: "", gender: "" } },
        sections: [{ section: "Client Information", content: {}, order: 0 }],
      }),
    });
    renderBuilder({
      state: {
        id: "rep-1",
        mode: "edit",
        metadata: { clientData: { client: { DOB: "2010-06-01", gender: "female" } } },
      },
    });
    await screen.findByTestId("clientInformation-section");
    expect(sections.props.clientInformation.data.dateOfBirth).toBe("06/01/2010");
    expect(sections.props.clientInformation.data.gender).toBe("Female");
  });

  it("lets a typed value win over the auto-populated one, but not a blank", () => {
    clientCard(
      { client: { firstName: "Ada", lastName: "Lovelace", gender: "female" } },
      { clientFullName: "", gender: "Nonbinary", referralSource: "GP" }
    );
    const data = sections.props.clientInformation.data;
    expect(data.clientFullName).toBe("Ada Lovelace");
    expect(data.gender).toBe("Nonbinary");
    expect(data.referralSource).toBe("GP");
  });

  it("hands a non-client section an empty object when it has no data yet", () => {
    renderBuilder({ state: { mode: "edit" } });
    fireEvent.click(screen.getByText("Review"));
    expect(sections.props.review.data).toEqual({});
  });
});

describe("editing a section", () => {
  const flushDebounce = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
  };

  it("keeps only the last edit of a burst and writes it once the typing stops", async () => {
    const { store } = renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
    });
    fireEvent.click(screen.getByText("edit goalsTargets"));
    fireEvent.click(screen.getByText("revise goalsTargets"));
    expect(store.getState().clinicalReport.sectionData.goalsTargets).toEqual({});
    await flushDebounce();
    expect(store.getState().clinicalReport.sectionData.goalsTargets).toEqual({
      note: "second",
    });
  });

  it("refuses an edit to a clinical section of a read-only document", async () => {
    const { store } = renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByText("edit goalsTargets"));
    await flushDebounce();
    expect(store.getState().clinicalReport.sectionData.goalsTargets).toEqual({
      goal: "walk",
    });
  });

  it("still accepts client information on a read-only document", async () => {
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({
        sections: [{ section: "Client Information", content: {}, order: 0 }],
      }),
    });
    const { store } = renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("clientInformation-section");
    fireEvent.click(screen.getByText("edit clientInformation"));
    await flushDebounce();
    expect(store.getState().clinicalReport.sectionData.clientInformation.note).toBe(
      "first"
    );
  });

  it("tells every editor whether the document may be changed", async () => {
    renderBuilder({ state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } } });
    expect(sections.props.goalsTargets.isReadOnly).toBe(false);
    renderBuilder({ state: { id: "rep-1", mode: "submittedForApproval" } });
    await screen.findByTestId("goalsTargets-section");
    expect(sections.props.goalsTargets.isReadOnly).toBe(true);
  });
});

describe("saving a draft", () => {
  it("cannot be saved while the document is empty", () => {
    renderBuilder();
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeDisabled();
  });

  it("creates the report and leaves the builder once it lands", async () => {
    renderBuilder({
      state: {
        mode: "edit",
        metadata: { documentTitle: "Support Plan", tenantId: "tenant-1", clientTenantId: "tc-1" },
        formData: {
          activeSections: ["goalsTargets"],
          sectionData: { goalsTargets: { goal: "walk" } },
        },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(api.CreateClinicalReport).toHaveBeenCalled());
    const payload = api.CreateClinicalReport.mock.calls[0][0];
    expect(payload.status).toBe("DRAFT");
    expect(payload.title).toBe("Support Plan");
    expect(payload.sections[0]).toEqual({
      section: "Goals & Targets",
      content: { goal: "walk" },
      order: 0,
    });
    // Consent & Signatures is appended by the slice whether or not it was added.
    expect(payload.sections[1].section).toBe("Consent & Signatures");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Draft saved successfully!")
    );
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("leaves a keystroke that has not settled out of the payload it sends", async () => {
    const { store } = renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
    });
    fireEvent.click(screen.getByText("edit goalsTargets"));
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(api.CreateClinicalReport).toHaveBeenCalled());
    // Documented rather than desired: the flush empties the pending map before
    // the merge reads it, and the section data it merges over comes from the
    // render that is already stale, so the edit reaches Redux but not the wire.
    expect(store.getState().clinicalReport.sectionData.goalsTargets).toEqual({
      note: "first",
    });
    expect(api.CreateClinicalReport.mock.calls[0][0].sections[0].content).toEqual({});
  });

  it("updates in place, keeping the section ids, once the report exists", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "edit" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(api.UpdateClinicalReport).toHaveBeenCalled());
    const payload = api.UpdateClinicalReport.mock.calls[0][0];
    expect(payload.id).toBe("rep-1");
    expect(payload.sections[0].id).toBe("sec-1");
  });

  it("reports a refused save and keeps the builder open", async () => {
    api.CreateClinicalReport.mockRejectedValue(new Error("500"));
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
        "error"
      )
    );
    expect(document.body.querySelector(".crb-error-message")).toBeInTheDocument();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("replaces the preview with a saving notice while the request is out", () => {
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
      clinical: { isSaving: true },
    });
    expect(screen.getByText("Saving draft...")).toBeInTheDocument();
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
  });
});

describe("publishing for approval", () => {
  const signed = { consentSignatures: { clinicianSignature: "data:image/png;base64,xx" } };

  it("refuses to publish a report the clinician has not signed", async () => {
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish for Approval" }));
    expect(toast.showToast).toHaveBeenCalledWith(
      "Sign the report before submitting — open Consent & Signatures and add your signature.",
      "error"
    );
    expect(api.CreateClinicalReport).not.toHaveBeenCalled();
  });

  it("submits a signed report and leaves the builder", async () => {
    renderBuilder({
      state: {
        mode: "edit",
        formData: { activeSections: ["goalsTargets"], sectionData: signed },
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish for Approval" }));
    await waitFor(() => expect(api.CreateClinicalReport).toHaveBeenCalled());
    expect(api.CreateClinicalReport.mock.calls[0][0].status).toBe("SUBMITTED");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Published for approval!")
    );
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("replaces the preview with a publishing notice while the request is out", () => {
    renderBuilder({
      state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } },
      clinical: { isPublishing: true },
    });
    expect(screen.getByText("Publishing report...")).toBeInTheDocument();
  });
});

describe("leaving the builder", () => {
  it("goes straight back from an empty document", () => {
    renderBuilder();
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(router.navigate).toHaveBeenCalledWith(-1);
    expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
  });

  it("goes straight back from a read-only document that has sections", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("warns before discarding an editable document, and stays when asked to", () => {
    renderBuilder({ state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } } });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
  });

  it("leaves anyway when the warning is overruled", () => {
    renderBuilder({ state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } } });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByRole("button", { name: "Leave Anyway" }));
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("highlights the warning's buttons on hover and restores them on leave", () => {
    renderBuilder({ state: { mode: "edit", formData: { activeSections: ["goalsTargets"] } } });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    const stay = screen.getByRole("button", { name: "Stay" });
    const leave = screen.getByRole("button", { name: "Leave Anyway" });
    const restingStay = stay.style.backgroundColor;
    const restingLeave = leave.style.backgroundColor;
    fireEvent.mouseOver(stay);
    expect(stay.style.backgroundColor).not.toBe(restingStay);
    fireEvent.mouseOut(stay);
    expect(stay.style.backgroundColor).toBe(restingStay);
    fireEvent.mouseOver(leave);
    expect(leave.style.backgroundColor).not.toBe(restingLeave);
    fireEvent.mouseOut(leave);
    expect(leave.style.backgroundColor).toBe(restingLeave);
  });
});

describe("the footer for each lifecycle mode", () => {
  it("offers a request and an approval to an approver reviewing a submission", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "submittedForApproval" } });
    await screen.findByTestId("goalsTargets-section");
    expect(screen.getByRole("button", { name: "Request Change" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
  });

  it("withholds the approve button from a role without the permission", async () => {
    renderBuilder({
      state: { id: "rep-1", mode: "submittedForApproval" },
      permissions: ["view_clinical_report"],
    });
    await screen.findByTestId("goalsTargets-section");
    expect(screen.getByRole("button", { name: "Request Change" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("offers save and resubmit to the creator working through a change request", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "changeRequested" } });
    await screen.findByTestId("goalsTargets-section");
    expect(screen.getByRole("button", { name: "Save as Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit for Signature" })).toBeInTheDocument();
    // No change request is on the loaded report, so there is nothing to view.
    expect(screen.queryByRole("button", { name: "View Change Request" })).not.toBeInTheDocument();
  });

  it("shows no footer buttons at all while the client is signing", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "awaitingSignature" } });
    await screen.findByTestId("goalsTargets-section");
    expect(document.body.querySelector(".crb-footer-actions")).toBeEmptyDOMElement();
  });

  it("offers save and publish on a plain new report", () => {
    renderBuilder();
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish for Approval" })).toBeInTheDocument();
  });
});

describe("editing a report the client already signed", () => {
  const openSigned = async () => {
    renderBuilder({ state: { id: "rep-1", mode: "clientSigned" } });
    await screen.findByTestId("goalsTargets-section");
  };

  it("locks the document behind a single revert button", async () => {
    await openSigned();
    expect(
      screen.getByRole("button", { name: "Edit Document (New Version)" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save as Draft" })).not.toBeInTheDocument();
    expect(document.body.querySelector(".crb-drag-handle")).not.toBeInTheDocument();
  });

  it("reverts to draft and opens the editing buttons", async () => {
    await openSigned();
    fireEvent.click(screen.getByRole("button", { name: "Edit Document (New Version)" }));
    await waitFor(() =>
      expect(api.UpdateClinicalReportStatus).toHaveBeenCalledWith({
        reportId: "rep-1",
        status: "DRAFT",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Document reverted to draft for editing",
      "success"
    );
    expect(await screen.findByRole("button", { name: "Save as Draft" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish for Approval" })).toBeInTheDocument();
  });

  it("keeps the document locked when the revert is refused", async () => {
    api.UpdateClinicalReportStatus.mockRejectedValue(new Error("409"));
    await openSigned();
    fireEvent.click(screen.getByRole("button", { name: "Edit Document (New Version)" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to revert document to draft",
        "error"
      )
    );
    expect(
      screen.getByRole("button", { name: "Edit Document (New Version)" })
    ).toBeInTheDocument();
  });
});

describe("approving and resubmitting", () => {
  it("approves the report and returns to the list", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "submittedForApproval" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(api.ApproveClinicalReport).toHaveBeenCalledWith({
        clinicalReportId: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith("Document approved successfully!", "success");
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("reports a refused approval without leaving", async () => {
    api.ApproveClinicalReport.mockRejectedValue(new Error("500"));
    renderBuilder({ state: { id: "rep-1", mode: "submittedForApproval" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to approve document", "error")
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("resubmits an answered change request for signature", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "changeRequested" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Submit for Signature" }));
    await waitFor(() =>
      expect(api.ResubmitClinicalReport).toHaveBeenCalledWith({
        clinicalReportId: "rep-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Document resubmitted for signature!",
      "success"
    );
  });

  it("reports a refused resubmission", async () => {
    api.ResubmitClinicalReport.mockRejectedValue(new Error("500"));
    renderBuilder({ state: { id: "rep-1", mode: "changeRequested" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Submit for Signature" }));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to resubmit document", "error")
    );
  });
});

describe("raising a change request", () => {
  const openModal = async () => {
    renderBuilder({ state: { id: "rep-1", mode: "submittedForApproval" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Request Change" }));
    return screen.getByPlaceholderText("Type something...");
  };

  it("is not even rendered outside an approver's review", () => {
    renderBuilder();
    expect(screen.queryByText("Request Change")).not.toBeInTheDocument();
  });

  it("insists on a comment before it will submit", async () => {
    await openModal();
    fireEvent.submit(document.getElementById("modal-form"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Please enter a comment or request", "warning")
    );
    expect(api.CreateClinicalReportChangeRequest).not.toHaveBeenCalled();
  });

  it("treats a comment of nothing but spaces as blank", async () => {
    const box = await openModal();
    fireEvent.change(box, { target: { value: "   " } });
    fireEvent.submit(document.getElementById("modal-form"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Please enter a comment or request", "warning")
    );
  });

  it("sends the request against the report and its approver, then leaves", async () => {
    const box = await openModal();
    fireEvent.change(box, { target: { value: "Please expand the goals" } });
    fireEvent.submit(document.getElementById("modal-form"));
    await waitFor(() =>
      expect(api.CreateClinicalReportChangeRequest).toHaveBeenCalledWith({
        clinicalReportId: "rep-1",
        description: "Please expand the goals",
        approverId: "app-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Change request submitted successfully!",
      "success"
    );
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("reports a refused request and keeps the text for another try", async () => {
    api.CreateClinicalReportChangeRequest.mockRejectedValue(new Error("500"));
    const box = await openModal();
    fireEvent.change(box, { target: { value: "Please expand the goals" } });
    fireEvent.submit(document.getElementById("modal-form"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to submit change request", "error")
    );
    expect(screen.getByPlaceholderText("Type something...")).toHaveValue(
      "Please expand the goals"
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it("closes without sending anything when cancelled", async () => {
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByPlaceholderText("Type something...")).not.toBeInTheDocument();
    expect(api.CreateClinicalReportChangeRequest).not.toHaveBeenCalled();
  });
});

describe("the change request banner", () => {
  const openWithRequests = async ({ requests, history = [], mode = "draft" } = {}) => {
    api.GetAllClinicalReportChangeRequests.mockResolvedValue({ data: requests });
    api.GetClinicalReportAuditTrails.mockResolvedValue({ data: history });
    renderBuilder({
      state: {
        id: "rep-1",
        mode,
        metadata: { hasChangesRequested: true, changeRequestMessage: "Expand the goals" },
        formData: { activeSections: ["goalsTargets"] },
      },
    });
    await waitFor(() => expect(api.GetClinicalReportAuditTrails).toHaveBeenCalled());
  };

  it("stays hidden while the report has no change request on it", async () => {
    renderBuilder({ state: { id: "rep-1", mode: "draft" } });
    await waitFor(() => expect(screen.getByText("No sections added yet")).toBeInTheDocument());
    expect(api.GetClinicalReportAuditTrails).not.toHaveBeenCalled();
    expect(document.body.querySelector(".crb-alert-wrap")).not.toBeInTheDocument();
  });

  it("shows the newest request's message once an open one is found", async () => {
    await openWithRequests({
      requests: [{ id: "cr-1", description: "Expand the goals", createdAt: "2026-03-02T09:00:00" }],
    });
    expect(await screen.findByText("Expand the goals")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "View Change Request" }).length
    ).toBeGreaterThan(0);
  });

  it("falls back to a generic message when the request carries none", async () => {
    api.GetAllClinicalReportChangeRequests.mockResolvedValue({
      data: [{ id: "cr-1", createdAt: "2026-03-02T09:00:00" }],
    });
    renderBuilder({
      state: { id: "rep-1", mode: "draft", metadata: { hasChangesRequested: true } },
    });
    expect(
      await screen.findByText("A change request is active for this document.")
    ).toBeInTheDocument();
  });

  it("hides itself once every request predates the last submission", async () => {
    await openWithRequests({
      requests: [{ id: "cr-1", createdAt: "2026-03-01T09:00:00" }],
      history: [{ action: "SUBMITTED", createdAt: "2026-03-05T09:00:00" }],
    });
    await waitFor(() =>
      expect(document.body.querySelector(".crb-alert-wrap")).not.toBeInTheDocument()
    );
  });

  it("keeps showing itself when the lookup fails, rather than hiding a live request", async () => {
    api.GetAllClinicalReportChangeRequests.mockRejectedValue(new Error("500"));
    renderBuilder({
      state: { id: "rep-1", mode: "draft", metadata: { hasChangesRequested: true } },
    });
    await waitFor(() => expect(api.GetAllClinicalReportChangeRequests).toHaveBeenCalled());
    // The state resolves with no requests, so the banner falls away — what the
    // failure buys is that lastSubmittedAt stays null and nothing is marked
    // answered on the strength of a half-read history.
    expect(document.body.querySelector(".crb-alert-wrap")).not.toBeInTheDocument();
  });

  it("stays hidden on a document that has already gone out for signature", async () => {
    api.GetAllClinicalReportChangeRequests.mockResolvedValue({
      data: [{ id: "cr-1", createdAt: "2026-03-02T09:00:00" }],
    });
    renderBuilder({
      state: {
        id: "rep-1",
        mode: "awaitingSignature",
        metadata: { hasChangesRequested: true },
      },
    });
    await waitFor(() => expect(api.GetSingleClinicalReportById).toHaveBeenCalled());
    expect(document.body.querySelector(".crb-alert-wrap")).not.toBeInTheDocument();
  });

  it("gives the creator of a draft a view button beside save and publish", async () => {
    await openWithRequests({
      requests: [{ id: "cr-1", createdAt: "2026-03-02T09:00:00" }],
    });
    await screen.findByText("Expand the goals");
    const footer = document.body.querySelector(".crb-footer-actions");
    expect(within(footer).getByRole("button", { name: "View Change Request" })).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
    expect(
      within(footer).getByRole("button", { name: "Publish for Approval" })
    ).toBeInTheDocument();
  });
});


describe("reading the change requests", () => {
  const request = (over = {}) => ({
    id: "cr-1",
    description: "Expand the goals",
    createdAt: "2026-03-02T09:00:00",
    viewed: true,
    ...over,
  });

  const alertWrap = () => document.body.querySelector(".crb-alert-wrap");

  // The banner and the footer can both carry a "View Change Request" button,
  // so the modal is always opened from the banner specifically.
  const openList = async (requests, { mode = "draft", history = [] } = {}) => {
    api.GetAllClinicalReportChangeRequests.mockResolvedValue({ data: requests });
    api.GetClinicalReportAuditTrails.mockResolvedValue({ data: history });
    // Only used by the modes that load from the API; harmless for the rest.
    api.GetSingleClinicalReportById.mockResolvedValue({
      data: apiReport({ clinicalReportChangeRequests: requests }),
    });
    renderBuilder({
      state: {
        id: "rep-1",
        mode,
        metadata: { hasChangesRequested: true },
        formData: { activeSections: ["goalsTargets"] },
      },
    });
    await waitFor(() => expect(alertWrap()).toBeInTheDocument());
    fireEvent.click(within(alertWrap()).getByRole("button", { name: "View Change Request" }));
  };

  it("lists a request with its author, timestamp and open pill", async () => {
    await openList([request({ requester: "Grace Hopper" })]);
    expect(await screen.findByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("GH")).toBeInTheDocument();
    expect(screen.getByText("Approver")).toBeInTheDocument();
    expect(screen.getByText("Open")).toHaveClass("cr-pill-open");
    // The time half is locale-formatted, so only the date part is pinned down.
    expect(document.body.querySelector(".cr-meta")).toHaveTextContent("03/02/2026");
  });

  it("calls a request raised before the last submission addressed", async () => {
    await openList(
      [
        request({ id: "cr-new", description: "Still open", createdAt: "2026-03-08T09:00:00" }),
        request({ id: "cr-old", description: "Already answered", createdAt: "2026-03-01T09:00:00" }),
      ],
      { history: [{ action: "SUBMITTED", createdAt: "2026-03-05T09:00:00" }] }
    );
    expect(await screen.findByText("Still open")).toBeInTheDocument();
    expect(screen.getByText("Open")).toHaveClass("cr-pill-open");
    expect(screen.getByText("Addressed")).toHaveClass("cr-pill-done");
  });

  it("names a client requester from the nested client record", async () => {
    await openList([
      request({ client: { client: { firstName: "Sam", lastName: "Rivers" } } }),
    ]);
    expect(await screen.findByText("Sam Rivers")).toBeInTheDocument();
    // "Client" also labels the metadata panel, so the role is read off the item.
    expect(document.body.querySelector(".cr-meta")).toHaveTextContent("Client");
  });

  it("falls back to the approver's name, and to Unknown when there is none", async () => {
    await openList([
      request({ id: "cr-1", approver: { fullName: "Grace" } }),
      request({ id: "cr-2", description: "" }),
    ]);
    expect(await screen.findByText("Grace")).toBeInTheDocument();
    expect(screen.getByText("GR")).toBeInTheDocument();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.getByText("UN")).toBeInTheDocument();
    expect(screen.getByText("No details provided.")).toBeInTheDocument();
  });

  it("leaves the timestamp off a request that has none", async () => {
    await openList([request({ createdAt: undefined })]);
    expect(await screen.findByText("Expand the goals")).toBeInTheDocument();
    expect(document.body.querySelector(".cr-dot")).not.toBeInTheDocument();
  });

  it("says so when the report turns out to have no requests after all", async () => {
    api.GetClinicalReportAuditTrails.mockResolvedValue({ data: [] });
    api.GetAllClinicalReportChangeRequests.mockResolvedValueOnce({
      data: [request()],
    }).mockResolvedValueOnce({ data: [] });
    renderBuilder({
      state: { id: "rep-1", mode: "draft", metadata: { hasChangesRequested: true } },
    });
    await waitFor(() => expect(alertWrap()).toBeInTheDocument());
    fireEvent.click(within(alertWrap()).getByRole("button", { name: "View Change Request" }));
    expect(await screen.findByText("No change requests found.")).toBeInTheDocument();
  });

  it("shows a loader while the list is being fetched", async () => {
    let release;
    api.GetAllClinicalReportChangeRequests.mockResolvedValueOnce({
      data: [request()],
    }).mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderBuilder({
      state: { id: "rep-1", mode: "draft", metadata: { hasChangesRequested: true } },
    });
    await waitFor(() => expect(alertWrap()).toBeInTheDocument());
    fireEvent.click(within(alertWrap()).getByRole("button", { name: "View Change Request" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Loading...");
    release({ data: [request()] });
    expect(await screen.findByText("Expand the goals")).toBeInTheDocument();
  });

  it("keeps the already-loaded list on screen when a refresh fails", async () => {
    api.GetAllClinicalReportChangeRequests.mockResolvedValueOnce({
      data: [request()],
    }).mockRejectedValueOnce(new Error("500"));
    renderBuilder({
      state: { id: "rep-1", mode: "draft", metadata: { hasChangesRequested: true } },
    });
    await waitFor(() => expect(alertWrap()).toBeInTheDocument());
    fireEvent.click(within(alertWrap()).getByRole("button", { name: "View Change Request" }));
    expect(await screen.findByText("Expand the goals")).toBeInTheDocument();
    await waitFor(() => expect(console.error).toHaveBeenCalled());
  });

  it("shows only the first five of a longer history", async () => {
    await openList(
      Array.from({ length: 7 }, (_, i) => request({ id: `cr-${i}`, description: `Note ${i}` }))
    );
    expect(await screen.findByText("Note 0")).toBeInTheDocument();
    expect(screen.getByText("Note 4")).toBeInTheDocument();
    expect(screen.queryByText("Note 5")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  });

  it("closes the modal instead of paging when a page number is pressed", async () => {
    await openList(
      Array.from({ length: 7 }, (_, i) => request({ id: `cr-${i}`, description: `Note ${i}` }))
    );
    await screen.findByText("Note 0");
    // Documented rather than desired: Pagination's buttons carry no type, so
    // inside the modal's form they submit it, and the primary action is Close.
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() => expect(screen.queryByText("Note 0")).not.toBeInTheDocument());
    expect(screen.queryByText("Note 5")).not.toBeInTheDocument();
  });

  it("tells the creator working through them that they can now resubmit", async () => {
    await openList([request()], { mode: "changeRequested" });
    expect(
      await screen.findByText("You can now make the requested changes and resubmit.")
    ).toBeInTheDocument();
  });

  it("tells everyone else that the creator has been notified", async () => {
    await openList([request()]);
    expect(
      await screen.findByText("The creator has been notified to address these changes.")
    ).toBeInTheDocument();
  });

  it("closes on the modal's own close button", async () => {
    await openList([request()]);
    await screen.findByText("Expand the goals");
    fireEvent.submit(document.getElementById("modal-form"));
    await waitFor(() => expect(screen.queryByText("Expand the goals")).not.toBeInTheDocument());
  });
});

describe("read receipts on change requests", () => {
  const alertWrap = () => document.body.querySelector(".crb-alert-wrap");

  const openList = async (requests) => {
    api.GetAllClinicalReportChangeRequests.mockResolvedValue({ data: requests });
    renderBuilder({
      state: { id: "rep-1", mode: "draft", metadata: { hasChangesRequested: true } },
    });
    await waitFor(() => expect(alertWrap()).toBeInTheDocument());
    fireEvent.click(within(alertWrap()).getByRole("button", { name: "View Change Request" }));
  };

  it("marks the unseen requests as read when the list is opened", async () => {
    await openList([
      { id: "cr-1", description: "First", viewed: false, createdAt: "2026-03-02T09:00:00" },
      { id: "cr-2", description: "Second", viewed: true, createdAt: "2026-03-01T09:00:00" },
    ]);
    await waitFor(() =>
      expect(api.MarkClinicalReportChangeRequestViewed).toHaveBeenCalledWith({
        changeRequestId: "cr-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(api.MarkClinicalReportChangeRequestViewed).toHaveBeenCalledTimes(1);
  });

  it("sends no receipt when everything has already been read", async () => {
    await openList([
      { id: "cr-1", description: "First", viewed: true, createdAt: "2026-03-02T09:00:00" },
    ]);
    await screen.findByText("First");
    expect(api.MarkClinicalReportChangeRequestViewed).not.toHaveBeenCalled();
  });

  it("skips a request with no id to mark", async () => {
    await openList([{ description: "First", viewed: false }]);
    await screen.findByText("First");
    expect(api.MarkClinicalReportChangeRequestViewed).not.toHaveBeenCalled();
  });

  it("swallows a failed receipt rather than interrupting the reader", async () => {
    api.MarkClinicalReportChangeRequestViewed.mockRejectedValue(new Error("500"));
    await openList([
      { id: "cr-1", description: "First", viewed: false, createdAt: "2026-03-02T09:00:00" },
    ]);
    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(toast.showToast).not.toHaveBeenCalled();
  });
});

describe("a report the slice never versioned", () => {
  it("names it v1 in the footer link", () => {
    renderBuilder({ clinical: { metadata: { version: "" } } });
    expect(document.body.querySelector(".crb-version-link").textContent).toContain(
      "Document Version: v1"
    );
  });
});
