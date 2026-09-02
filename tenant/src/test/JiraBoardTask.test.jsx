import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";

import Task from "../Components/JiraBoard/Task";
import authReducer from "../ReduxStore/features/authentication";

/**
 * Cover for the pipeline board's task card, written ahead of moving its
 * `if (!task) return null` guard below the hooks.
 *
 * Both dnd-kit and the permission hook are used for real — the latter matters,
 * because `usePermissions` runs *above* the guard and calls React hooks of its
 * own. That is what makes the early return a genuine fault rather than only a
 * lint violation: when a mounted card's task goes away, React finishes the
 * render with fewer hooks than the last one and throws.
 */

const makeStore = (permissions) =>
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
          role: {
            roleModuleAccesses: permissions
              ? [{ module: "CLIENTS", permissions }]
              : [],
          },
        },
      },
    },
  });

const task = { fullName: "Ada Lovelace", email: "ada@example.com", clientId: "cl1", tenantClientId: "tc1" };

const renderTask = ({ permissions, ...props } = {}) =>
  render(
    <Provider store={makeStore(permissions)}>
      <DndContext>
        <SortableContext items={["t1"]}>
          <Task
            task={task}
            id="t1"
            onViewCandidate={vi.fn()}
            toggleSelection={vi.fn()}
            {...props}
          />
        </SortableContext>
      </DndContext>
    </Provider>
  );

const card = () => document.body.querySelector(".task");

const pointerClick = (el, { dx = 0, dy = 0, ...rest } = {}) => {
  fireEvent.pointerDown(el, { clientX: 100, clientY: 100 });
  fireEvent.click(el, { clientX: 100 + dx, clientY: 100 + dy, ...rest });
};

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("Task rendering", () => {
  it("renders the client's name and email", () => {
    renderTask();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });

  it("falls back to placeholders for a sparse record", () => {
    renderTask({ task: { clientId: "cl1" } });
    expect(screen.getByText("Unnamed Candidate")).toBeInTheDocument();
    expect(screen.getByText("No email")).toBeInTheDocument();
  });

  it("renders nothing at all without a task", () => {
    renderTask({ task: null });
    expect(card()).toBeNull();
  });

  it("marks itself selected only when told to", () => {
    const { unmount } = renderTask({ selected: true });
    expect(card().className).toContain("selected");
    unmount();
    renderTask({ selected: false });
    expect(card().className).not.toContain("selected");
  });
});

describe("Task interaction", () => {
  it("opens the client profile on a plain click", () => {
    const onViewCandidate = vi.fn();
    renderTask({ onViewCandidate });
    pointerClick(card());
    expect(onViewCandidate).toHaveBeenCalledWith("cl1", "tc1");
  });

  it("does not open the profile when the pointer travelled — that was a drag", () => {
    const onViewCandidate = vi.fn();
    renderTask({ onViewCandidate });
    pointerClick(card(), { dx: 20 });
    expect(onViewCandidate).not.toHaveBeenCalled();
  });

  it("still opens the profile for a click that barely moved", () => {
    const onViewCandidate = vi.fn();
    renderTask({ onViewCandidate });
    pointerClick(card(), { dx: 3, dy: 3 });
    expect(onViewCandidate).toHaveBeenCalledTimes(1);
  });

  it("toggles selection on ctrl-click and meta-click instead of opening", () => {
    const onViewCandidate = vi.fn();
    const toggleSelection = vi.fn();
    const { unmount } = renderTask({ onViewCandidate, toggleSelection });
    pointerClick(card(), { ctrlKey: true });
    expect(toggleSelection).toHaveBeenCalledTimes(1);
    unmount();

    renderTask({ onViewCandidate, toggleSelection });
    pointerClick(card(), { metaKey: true });
    expect(toggleSelection).toHaveBeenCalledTimes(2);
    expect(onViewCandidate).not.toHaveBeenCalled();
  });

  it("tolerates a ctrl-click with no selection handler wired", () => {
    renderTask({ toggleSelection: undefined });
    expect(() => pointerClick(card(), { ctrlKey: true })).not.toThrow();
  });

  it("warns rather than throwing when there is no view handler", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderTask({ onViewCandidate: undefined });
    pointerClick(card());
    expect(warn).toHaveBeenCalledWith("onViewCandidate function is not available");
    warn.mockRestore();
  });
});

describe("Task hook stability", () => {
  it("survives its task going away while mounted", () => {
    // `usePermissions` runs above the `if (!task) return null` guard, so this
    // transition drops the render from many hooks to one. React throws
    // "Rendered fewer hooks than expected" unless the guard sits below them.
    const store = makeStore();
    const view = (t) => (
      <Provider store={store}>
        <DndContext>
          <SortableContext items={["t1"]}>
            <Task task={t} id="t1" onViewCandidate={vi.fn()} toggleSelection={vi.fn()} />
          </SortableContext>
        </DndContext>
      </Provider>
    );
    const { rerender } = render(view(task));
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    expect(() => rerender(view(null))).not.toThrow();
    expect(card()).toBeNull();
  });
});
