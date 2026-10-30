import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";
import templateReducer from "../ReduxStore/features/clinicalReportTemplateSlice";

/**
 * The clinical report TEMPLATE builder: the same sidebar-and-preview layout as
 * the report builder, but building the reusable skeleton rather than a filled
 * report. It has three modes -- newTemplate, editTemplate and viewTemplate --
 * and each one changes who may edit what: the name field, the sidebar, the
 * section menus and the Save button are all gated differently.
 *
 * The twelve section editors are probes that record their props and push an
 * edit back on demand; the Redux slice is real, so the section bookkeeping and
 * the save payload are genuinely exercised against a mocked API module.
 *
 * The one thing here with no counterpart in the report builder is the
 * sessionStorage snapshot of the route state, which is what keeps a refresh on
 * the same template. Those tests drive it by rendering with no router state at
 * all and seeding the key directly, so `sessionStorage` is cleared between
 * tests rather than left to leak from one to the next.
 *
 * dnd-kit is a probe as well: the drag handlers are called with synthetic
 * active/over pairs instead of a pointer stream jsdom cannot produce.
 */

const api = vi.hoisted(() => ({
  GetSingleClinicalReportTemplateById: vi.fn(),
  CreateClinicalReportTemplate: vi.fn(),
  UpdateClinicalReportTemplate: vi.fn(),
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
  useSortable: ({ id }) => ({
    attributes: {},
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
        <button onClick={() => received.onChange({ note: "typed" })}>edit {key}</button>
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

import TemplateBuilder from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/TemplateBuilder";

const NAV_KEY = "clinical-template-builder:nav";
const baseTemplate = templateReducer(undefined, { type: "@@INIT" });

const renderBuilder = ({ state = null, permissions, template } = {}) => {
  router.state = state;
  const store = configureStore({
    reducer: {
      authentication: authReducer,
      clinicalReportTemplate: templateReducer,
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
      clinicalReportTemplate: template
        ? { ...baseTemplate, ...template }
        : baseTemplate,
    },
  });
  const utils = render(
    <Provider store={store}>
      <TemplateBuilder />
    </Provider>
  );
  return { ...utils, store };
};

const apiTemplate = (over = {}) => ({
  id: "tpl-1",
  title: "Standard BIP",
  sections: [{ section: "Goals & Targets", content: { goal: "walk" }, order: 0, id: "sec-1" }],
  ...over,
});

const nameField = () => screen.getByPlaceholderText("Enter template name");
const sectionCards = () => document.body.querySelectorAll(".crb-section-card");
const sidebarItem = (label) =>
  Array.from(document.body.querySelectorAll(".crb-section-item")).find((el) =>
    el.textContent.startsWith(label)
  );

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  dnd.draggingId = null;
  api.GetSingleClinicalReportTemplateById.mockResolvedValue({ data: apiTemplate() });
  api.CreateClinicalReportTemplate.mockResolvedValue({ data: { id: "tpl-new" } });
  api.UpdateClinicalReportTemplate.mockResolvedValue({ data: { id: "tpl-1" } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("where the builder gets its context", () => {
  it("starts a blank template when the route says nothing at all", () => {
    renderBuilder();
    expect(screen.getByText("No sections added yet")).toBeInTheDocument();
    expect(
      screen.getByText("Click on sections from the left to add them to your template")
    ).toBeInTheDocument();
    expect(api.GetSingleClinicalReportTemplateById).not.toHaveBeenCalled();
  });

  it("remembers the route state so a refresh stays on the same template", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    await waitFor(() =>
      expect(JSON.parse(sessionStorage.getItem(NAV_KEY))).toEqual({
        id: "tpl-1",
        mode: "editTemplate",
      })
    );
  });

  it("reads the remembered context back when the route state is gone", async () => {
    sessionStorage.setItem(NAV_KEY, JSON.stringify({ id: "tpl-1", mode: "editTemplate" }));
    renderBuilder();
    await waitFor(() =>
      expect(api.GetSingleClinicalReportTemplateById).toHaveBeenCalledWith({
        Id: "tpl-1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("falls back to a new template when the remembered context is unreadable", () => {
    sessionStorage.setItem(NAV_KEY, "{not json");
    renderBuilder();
    expect(screen.getByText("No sections added yet")).toBeInTheDocument();
    expect(api.GetSingleClinicalReportTemplateById).not.toHaveBeenCalled();
  });

  it("loads a stored template for editing", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    expect(await screen.findByTestId("goalsTargets-section")).toBeInTheDocument();
    expect(nameField()).toHaveValue("Standard BIP");
  });

  it("shows the loader while the template is being fetched", async () => {
    let release;
    api.GetSingleClinicalReportTemplateById.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    expect(await screen.findByRole("status")).toHaveTextContent("Loading...");
    release({ data: apiTemplate() });
    expect(await screen.findByTestId("goalsTargets-section")).toBeInTheDocument();
  });

  it("does nothing at all for an edit mode with no template to load", () => {
    renderBuilder({ state: { mode: "editTemplate" } });
    expect(api.GetSingleClinicalReportTemplateById).not.toHaveBeenCalled();
    expect(screen.getByText("No sections added yet")).toBeInTheDocument();
  });

  it("seeds the preview from sections handed over on a non-new mode", () => {
    renderBuilder({
      state: {
        mode: "editTemplate",
        sections: [
          { sectionId: "goalsTargets", data: { goal: "walk" } },
          { sectionId: "review" },
        ],
      },
    });
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
    expect(sections.props.goalsTargets.data).toEqual({ goal: "walk" });
    // The second section came with no data, so the slice's own default stands.
    expect(sections.props.review.data).toEqual({});
  });

  it("seeds a new template from the sections the creation modal chose", () => {
    renderBuilder({
      state: { mode: "newTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
  });
});

describe("the template name", () => {
  it("takes the name the creation modal set and locks the field", () => {
    renderBuilder({ state: { mode: "newTemplate", initialTitle: "  Intake Plan  " } });
    expect(nameField()).toHaveValue("Intake Plan");
    expect(nameField()).toBeDisabled();
    expect(
      screen.getByText("Name set from creation modal. You can edit it later.")
    ).toBeInTheDocument();
  });

  it("leaves a whitespace-only name from the creation modal unset", () => {
    renderBuilder({ state: { mode: "newTemplate", initialTitle: "   " } });
    expect(nameField()).toHaveValue("");
    expect(
      screen.queryByText("Name set from creation modal. You can edit it later.")
    ).not.toBeInTheDocument();
  });

  it("can be retyped while editing an existing template", async () => {
    const { store } = renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.change(nameField(), { target: { value: "Renamed Plan" } });
    expect(nameField()).toHaveValue("Renamed Plan");
    expect(store.getState().clinicalReportTemplate.templateMetadata.title).toBe(
      "Renamed Plan"
    );
  });

  it("is locked while a template is only being viewed", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    expect(nameField()).toBeDisabled();
    expect(nameField()).toHaveValue("Standard BIP");
  });
});

describe("permission gates", () => {
  it("greys the whole builder out for a role that may not build templates", () => {
    const { container } = renderBuilder({ state: { mode: "newTemplate" }, permissions: ["view_clinical_report_templates"] });
    expect(container.firstChild).toHaveAttribute("aria-disabled", "true");
    expect(container.firstChild).toHaveStyle({ pointerEvents: "none" });
  });

  it("leaves the builder live for a role that may create templates", () => {
    const { container } = renderBuilder({
      state: { mode: "newTemplate" },
      permissions: ["create_clinical_report_template"],
    });
    expect(container.firstChild).toHaveAttribute("aria-disabled", "false");
    expect(container.firstChild).not.toHaveStyle({ pointerEvents: "none" });
  });

  it("withholds Save from a role that may edit but not create", () => {
    renderBuilder({
      state: { mode: "newTemplate", initialTitle: "Intake Plan" },
      permissions: ["edit_clinical_report_templates"],
    });
    fireEvent.click(screen.getByText("Goals & Targets"));
    expect(screen.queryByRole("button", { name: "Save Template" })).not.toBeInTheDocument();
  });

  it("withholds Save from a role that may create but not edit", async () => {
    renderBuilder({
      state: { id: "tpl-1", mode: "editTemplate" },
      permissions: ["create_clinical_report_template"],
    });
    await screen.findByTestId("goalsTargets-section");
    expect(screen.queryByRole("button", { name: "Save Template" })).not.toBeInTheDocument();
  });

  it("shows Save to a role that may edit, on an edit", async () => {
    renderBuilder({
      state: { id: "tpl-1", mode: "editTemplate" },
      permissions: ["edit_clinical_report_templates"],
    });
    await screen.findByTestId("goalsTargets-section");
    expect(screen.getByRole("button", { name: "Save Template" })).toBeInTheDocument();
  });

  it("never shows Save while a template is only being viewed", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    expect(screen.queryByRole("button", { name: "Save Template" })).not.toBeInTheDocument();
  });
});

describe("the section sidebar", () => {
  it("adds a section and then marks it as added", () => {
    renderBuilder({ state: { mode: "newTemplate" } });
    fireEvent.click(sidebarItem("Goals & Targets"));
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
    const item = sidebarItem("Goals & Targets");
    expect(item).toHaveClass("active");
    expect(item).toHaveClass("disabled");
    expect(within(item).getByText("Added")).toBeInTheDocument();
    expect(item).toHaveStyle({ cursor: "not-allowed" });
  });

  it("says so rather than adding the same section twice", () => {
    renderBuilder({ state: { mode: "newTemplate" } });
    fireEvent.click(sidebarItem("Goals & Targets"));
    fireEvent.click(sidebarItem("Goals & Targets"));
    expect(toast.showToast).toHaveBeenCalledWith(
      "This section is already added to the template",
      "info"
    );
    expect(screen.getAllByTestId("goalsTargets-section")).toHaveLength(1);
  });

  it("ignores every sidebar click while a template is only being viewed", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(sidebarItem("Review"));
    expect(screen.queryByTestId("review-section")).not.toBeInTheDocument();
    expect(toast.showToast).not.toHaveBeenCalled();
    expect(sidebarItem("Review")).toHaveClass("disabled");
  });

  it("tells a viewer of an empty template that it has no sections", async () => {
    api.GetSingleClinicalReportTemplateById.mockResolvedValue({
      data: apiTemplate({ sections: [] }),
    });
    renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    expect(await screen.findByText("This template has no sections")).toBeInTheDocument();
  });
});

describe("a section card", () => {
  const withOne = () =>
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });

  it("collapses and reopens from its header", () => {
    withOne();
    const content = document.body.querySelector(".crb-section-content");
    fireEvent.click(document.body.querySelector(".crb-section-header"));
    expect(content).toHaveClass("collapsed");
    fireEvent.click(document.body.querySelector(".crb-section-header"));
    expect(content).not.toHaveClass("collapsed");
  });

  it("keeps the header from toggling when the drag handle is pressed", () => {
    withOne();
    fireEvent.click(document.body.querySelector(".crb-drag-handle"));
    expect(document.body.querySelector(".crb-section-content")).not.toHaveClass("collapsed");
  });

  it("minimizes and re-expands from its own menu", () => {
    withOne();
    const card = sectionCards()[0];
    fireEvent.click(card.querySelector(".crb-action-btn"));
    fireEvent.click(screen.getByText("Minimize Section"));
    expect(card.querySelector(".crb-section-content")).toHaveClass("collapsed");
    fireEvent.click(card.querySelector(".crb-action-btn"));
    fireEvent.click(screen.getByText("Expand Section"));
    expect(card.querySelector(".crb-section-content")).not.toHaveClass("collapsed");
  });

  it("closes the menu on a second press of the action button", () => {
    withOne();
    const card = sectionCards()[0];
    fireEvent.click(card.querySelector(".crb-action-btn"));
    expect(screen.getByText("Remove Section")).toBeInTheDocument();
    fireEvent.click(card.querySelector(".crb-action-btn"));
    expect(screen.queryByText("Remove Section")).not.toBeInTheDocument();
  });

  it("closes an open menu when anything else is clicked", () => {
    withOne();
    fireEvent.click(sectionCards()[0].querySelector(".crb-action-btn"));
    fireEvent.click(document.body);
    expect(screen.queryByText("Remove Section")).not.toBeInTheDocument();
  });

  it("dims itself while it is the card being dragged", () => {
    dnd.draggingId = "goalsTargets";
    withOne();
    expect(sectionCards()[0]).toHaveStyle({ opacity: "0.5" });
  });

  it("ignores its menu entirely on a view-only template", async () => {
    const { store } = renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    const card = sectionCards()[0];
    fireEvent.click(card.querySelector(".crb-action-btn"));
    fireEvent.click(screen.getByText("Minimize Section"));
    expect(card.querySelector(".crb-section-content")).not.toHaveClass("collapsed");
    expect(store.getState().clinicalReportTemplate.activeSections).toEqual([
      "goalsTargets",
    ]);
  });

  it("renders a card with no editor for a section the builder does not know", async () => {
    api.GetSingleClinicalReportTemplateById.mockResolvedValue({
      data: apiTemplate({ sections: [{ section: "Legacy Notes", content: {}, order: 0 }] }),
    });
    renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    expect(await screen.findByText("legacynotes")).toBeInTheDocument();
    expect(sectionCards()).toHaveLength(1);
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
  });
});

describe("removing a section", () => {
  const withTwo = () =>
    renderBuilder({
      state: {
        mode: "editTemplate",
        sections: [{ sectionId: "goalsTargets" }, { sectionId: "review" }],
      },
    });

  const openRemove = () => {
    fireEvent.click(sectionCards()[0].querySelector(".crb-action-btn"));
    fireEvent.click(screen.getByText("Remove Section"));
  };

  it("asks first, naming the section, and leaves it alone on cancel", () => {
    withTwo();
    openRemove();
    expect(screen.getByText('"Goals & Targets"')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("goalsTargets-section")).toBeInTheDocument();
  });

  it("removes the section and says so once confirmed", () => {
    withTwo();
    openRemove();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("review-section")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith('"Goals & Targets" removed successfully');
    // The sidebar offers it again now that it is gone.
    expect(sidebarItem("Goals & Targets")).not.toHaveClass("active");
  });

  it("calls an unrecognised section simply this section", async () => {
    api.GetSingleClinicalReportTemplateById.mockResolvedValue({
      data: apiTemplate({ sections: [{ section: "Legacy Notes", content: {}, order: 0 }] }),
    });
    renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    await screen.findByText("legacynotes");
    openRemove();
    expect(screen.getByText('"this section"')).toBeInTheDocument();
  });

  it("highlights the confirmation buttons on hover and restores them on leave", () => {
    withTwo();
    openRemove();
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

describe("editing a section's content", () => {
  it("writes an edit straight into the template", () => {
    const { store } = renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    fireEvent.click(screen.getByText("edit goalsTargets"));
    expect(store.getState().clinicalReportTemplate.sectionData.goalsTargets).toEqual({
      note: "typed",
    });
  });

  it("refuses an edit on a view-only template", async () => {
    const { store } = renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByText("edit goalsTargets"));
    expect(store.getState().clinicalReportTemplate.sectionData.goalsTargets).toEqual({
      goal: "walk",
    });
  });

  it("tells each editor whether the template may be changed", async () => {
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    expect(sections.props.goalsTargets.isReadOnly).toBe(false);
    renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    expect(sections.props.goalsTargets.isReadOnly).toBe(true);
  });
});

describe("dragging sections into a new order", () => {
  const withTwo = () =>
    renderBuilder({
      state: {
        mode: "editTemplate",
        sections: [{ sectionId: "goalsTargets" }, { sectionId: "review" }],
      },
    });

  it("shows the dragged section's label in the overlay", () => {
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
      template: { activeDragId: "goalsTargets" },
    });
    expect(
      within(screen.getByTestId("drag-overlay")).getByText("Goals & Targets")
    ).toBeInTheDocument();
  });

  it("labels an overlay for an unknown section simply Section", () => {
    renderBuilder({
      state: { mode: "editTemplate" },
      template: { activeDragId: "legacynotes_1" },
    });
    expect(within(screen.getByTestId("drag-overlay")).getByText("Section")).toBeInTheDocument();
  });

  it("reorders the preview when one section is dropped on another", () => {
    const { store } = withTwo();
    act(() => dnd.handlers.onDragStart({ active: { id: "goalsTargets" } }));
    expect(store.getState().clinicalReportTemplate.activeDragId).toBe("goalsTargets");
    act(() =>
      dnd.handlers.onDragEnd({ active: { id: "goalsTargets" }, over: { id: "review" } })
    );
    expect(store.getState().clinicalReportTemplate.activeSections).toEqual([
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
    expect(store.getState().clinicalReportTemplate.activeDragId).toBeNull();
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
    expect(store.getState().clinicalReportTemplate.activeDragId).toBeNull();
  });

  it("refuses to start or finish a drag on a view-only template", async () => {
    const { store } = renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    act(() => dnd.handlers.onDragStart({ active: { id: "goalsTargets" } }));
    expect(store.getState().clinicalReportTemplate.activeDragId).toBeNull();
    act(() =>
      dnd.handlers.onDragEnd({ active: { id: "goalsTargets" }, over: { id: "review" } })
    );
    expect(store.getState().clinicalReportTemplate.activeSections).toEqual([
      "goalsTargets",
    ]);
  });
});

describe("saving the template", () => {
  it("stays disabled until the template has both a name and a section", () => {
    renderBuilder({ state: { mode: "editTemplate" } });
    expect(screen.getByRole("button", { name: "Save Template" })).toBeDisabled();
    fireEvent.click(sidebarItem("Goals & Targets"));
    // A section is there now, but the name is still empty.
    expect(screen.getByRole("button", { name: "Save Template" })).toBeDisabled();
    fireEvent.change(nameField(), { target: { value: "Standard BIP" } });
    expect(screen.getByRole("button", { name: "Save Template" })).toBeEnabled();
  });

  it("creates a template that has never been stored", async () => {
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    fireEvent.change(nameField(), { target: { value: "Standard BIP" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));
    await waitFor(() => expect(api.CreateClinicalReportTemplate).toHaveBeenCalled());
    const payload = api.CreateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.title).toBe("Standard BIP");
    expect(payload.tenantId).toBe("tenant-1");
    expect(payload.sections[0]).toEqual({
      section: "Goals & Targets",
      content: {},
      order: 0,
    });
    // Consent & Signatures is appended by the slice whether or not it was added.
    expect(payload.sections[1].section).toBe("Consent & Signatures");
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Template saved successfully!")
    );
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("updates a stored template in place, keeping its section ids", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "editTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));
    await waitFor(() => expect(api.UpdateClinicalReportTemplate).toHaveBeenCalled());
    const payload = api.UpdateClinicalReportTemplate.mock.calls[0][0];
    expect(payload.id).toBe("tpl-1");
    expect(payload.title).toBe("Standard BIP");
    expect(payload.sections[0].id).toBe("sec-1");
  });

  it("reports a refused save and stays on the builder", async () => {
    api.CreateClinicalReportTemplate.mockRejectedValue(new Error("500"));
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    fireEvent.change(nameField(), { target: { value: "Standard BIP" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Template" }));
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
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
      template: { isSaving: true },
    });
    expect(screen.getByText("Saving template...")).toBeInTheDocument();
    expect(screen.queryByTestId("goalsTargets-section")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled();
  });
});

describe("leaving the builder", () => {
  it("goes straight back from an empty template", () => {
    renderBuilder({ state: { mode: "editTemplate" } });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(router.navigate).toHaveBeenCalledWith(-1);
    expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
  });

  it("goes straight back from a template that is only being viewed", async () => {
    renderBuilder({ state: { id: "tpl-1", mode: "viewTemplate" } });
    await screen.findByTestId("goalsTargets-section");
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("warns before discarding an edited template, and stays when asked to", () => {
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByText("Unsaved Changes")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(screen.queryByText("Unsaved Changes")).not.toBeInTheDocument();
  });

  it("leaves anyway when the warning is overruled", () => {
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    fireEvent.click(screen.getByRole("button", { name: "Leave Anyway" }));
    expect(router.navigate).toHaveBeenCalledWith(-1);
  });

  it("highlights the warning's buttons on hover and restores them on leave", () => {
    renderBuilder({
      state: { mode: "editTemplate", sections: [{ sectionId: "goalsTargets" }] },
    });
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
