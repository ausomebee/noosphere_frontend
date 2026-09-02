import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import Column from "../Components/JiraBoard/Column";
import authReducer from "../ReduxStore/features/authentication";

/**
 * Cover for the client pipeline board's column, written ahead of moving its
 * `if (!column || !column.id) return null` guard below the hooks.
 *
 * dnd-kit, the router, and the permission hook are all real. The last one is
 * what makes the early return a fault rather than only a lint violation:
 * `usePermissions` runs above the guard and calls hooks of its own, so a column
 * that disappears while mounted ends the render with fewer hooks than the
 * previous one and React throws.
 */

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

const makeStore = (permissions = []) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "r",
        user: {
          id: "u1",
          role: { roleModuleAccesses: [{ module: "CLIENTS", permissions }] },
        },
      },
    },
  });

const column = { id: "c1", title: "Intake", taskIds: ["t1"], colorCode: "#123456" };
const tasks = { t1: { fullName: "Ada Lovelace", email: "ada@example.com", clientId: "cl1" } };

const handlers = () => ({
  onAddTask: vi.fn(),
  onRemoveTask: vi.fn(),
  onEditTask: vi.fn(),
  onMoveTask: vi.fn(),
  onAssignStaff: vi.fn(),
  onViewCandidate: vi.fn(),
  onEditCandidate: vi.fn(),
  onDeleteColumn: vi.fn(),
});

const renderColumn = ({ permissions = [], ...props } = {}) => {
  const h = handlers();
  const view = render(
    <Provider store={makeStore(permissions)}>
      <MemoryRouter>
        <DndContext>
          <SortableContext items={["c1"]}>
            <Column column={column} tasks={tasks} columns={{ c1: column }} {...h} {...props} />
          </SortableContext>
        </DndContext>
      </MemoryRouter>
    </Provider>
  );
  return { ...view, handlers: h };
};

const col = () => document.body.querySelector(".column");
// Unlike control, tenant's Menu.Button carries no aria-label, so there is no
// accessible name to query by -- select it by class. Headless UI 2.2.4 opens on
// a pointer sequence rather than a bare click, so fire the whole thing.
const openMenu = () => {
  const btn = document.body.querySelector(".dropdown-icon");
  fireEvent.pointerDown(btn);
  fireEvent.pointerUp(btn);
  fireEvent.click(btn);
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("Column rendering", () => {
  it("renders the title and the candidate count", () => {
    renderColumn();
    expect(screen.getByText(/Intake/)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("falls back to a placeholder title", () => {
    renderColumn({ column: { id: "c1", taskIds: [] } });
    expect(screen.getByText(/Unnamed Column/)).toBeInTheDocument();
  });

  it("renders nothing for a missing column or one with no id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = renderColumn({ column: null });
    expect(col()).toBeNull();
    unmount();

    renderColumn({ column: { title: "No id" } });
    expect(col()).toBeNull();
    warn.mockRestore();
  });

  it("renders a card per task", () => {
    renderColumn();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("skips a task id with no matching task", () => {
    renderColumn({ column: { ...column, taskIds: ["t1", "ghost"] } });
    expect(document.body.querySelectorAll(".task")).toHaveLength(1);
  });

  it("ignores task ids that are not strings", () => {
    renderColumn({ column: { ...column, taskIds: ["t1", null, 7, undefined] } });
    expect(document.body.querySelectorAll(".task")).toHaveLength(1);
  });

  it("treats a non-array taskIds as empty", () => {
    renderColumn({
      column: { ...column, taskIds: "nope" },
      permissions: ["create_candidate_in_pipeline"],
    });
    expect(screen.getByText(/Add a candidate/)).toBeInTheDocument();
  });
});

describe("Column menu permissions", () => {
  it("hides every action from a role with none of the permissions", () => {
    renderColumn();
    openMenu();
    expect(screen.queryByText(/Add new candidate/)).not.toBeInTheDocument();
    expect(screen.queryByText("Edit Column Setup")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete column")).not.toBeInTheDocument();
  });

  it("offers to add a candidate with the create permission", () => {
    renderColumn({ permissions: ["create_candidate_in_pipeline"] });
    openMenu();
    expect(screen.getByText(/Add new candidate/)).toBeInTheDocument();
  });

  it("offers setup and delete with the manage permission", () => {
    renderColumn({ permissions: ["manage_pipeline_setup"] });
    openMenu();
    expect(screen.getByText("Edit Column Setup")).toBeInTheDocument();
    expect(screen.getByText("Delete column")).toBeInTheDocument();
  });

  it("navigates to the column setup page", () => {
    renderColumn({ permissions: ["manage_pipeline_setup"] });
    openMenu();
    fireEvent.click(screen.getByText("Edit Column Setup"));
    expect(navigate).toHaveBeenCalledWith("/pipeline/column-single/c1");
  });

  it("reports the column id when deleting", () => {
    const { handlers: h } = renderColumn({ permissions: ["manage_pipeline_setup"] });
    openMenu();
    fireEvent.click(screen.getByText("Delete column"));
    expect(h.onDeleteColumn).toHaveBeenCalledWith("c1");
  });

  it("defers to the parent's add-client handler when one is supplied", () => {
    const onOpenAddClientModal = vi.fn();
    renderColumn({
      permissions: ["create_candidate_in_pipeline"],
      onOpenAddClientModal,
    });
    openMenu();
    fireEvent.click(screen.getByText(/Add new candidate/));
    expect(onOpenAddClientModal).toHaveBeenCalledWith("c1");
  });
});

describe("Column hook stability", () => {
  it("survives its column going away while mounted", () => {
    // `usePermissions` runs above the `if (!column) return null` guard, so this
    // transition drops the render from many hooks to a few. React throws
    // "Rendered fewer hooks than expected" unless the guard sits below them.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = makeStore();
    const h = handlers();
    const view = (c) => (
      <Provider store={store}>
        <MemoryRouter>
          <DndContext>
            <SortableContext items={["c1"]}>
              <Column column={c} tasks={tasks} columns={{ c1: column }} {...h} />
            </SortableContext>
          </DndContext>
        </MemoryRouter>
      </Provider>
    );
    const { rerender } = render(view(column));
    expect(screen.getByText(/Intake/)).toBeInTheDocument();

    expect(() => rerender(view(undefined))).not.toThrow();
    expect(col()).toBeNull();
    warn.mockRestore();
  });
});
