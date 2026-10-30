import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The pipeline board's column strip: it lays the stages out left to right, puts
 * a hover-revealed "+" between every pair of them, and shows chevrons when the
 * strip is wider than its viewport.
 *
 * Two things need faking. Every "+" is gated on `create_pipeline`, which comes
 * from the real permissions hook, so the store below seeds a role whose module
 * accesses either grant it or don't. And the chevrons are decided by comparing
 * `scrollLeft`, `clientWidth` and `scrollWidth`, all of which jsdom reports as
 * zero — they are spied on Element.prototype per test so a board can be made to
 * overflow in either direction, and `scrollBy` is stubbed because jsdom has no
 * smooth scrolling.
 *
 * Column is replaced by a probe: it records the props it was handed and renders
 * its title, which is enough to check the ordering and the flattened column
 * list the board derives for the "move to" menus.
 */

const column = vi.hoisted(() => ({ calls: [] }));
vi.mock("../Components/JiraBoard/Column", () => ({
  default: (received) => {
    column.calls.push(received);
    return <div data-testid={`column-${received.column.id}`}>{received.column.title}</div>;
  },
}));

import Board from "../Components/JiraBoard/Board";

// A user with no explicit module access is treated as the org owner and gets
// everything, so restricting the board means granting a role that deliberately
// leaves `create_pipeline` out.
const makeStore = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        user: {
          id: "u-1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          role: permissions
            ? { roleModuleAccesses: [{ module: "PIPELINE", permissions }] }
            : undefined,
        },
      },
    },
  });

const boardData = {
  tasks: { "task-1": { id: "task-1", title: "Ada Obi" } },
  columns: {
    "col-1": { id: "col-1", title: "Enquiry", taskIds: ["task-1"] },
    "col-2": { id: "col-2", title: "Assessment", taskIds: [] },
  },
  columnOrder: ["col-1", "col-2"],
};

const renderBoard = ({ data = boardData, permissions, ...props } = {}) => {
  const handlers = {
    onAddTask: vi.fn(),
    onRemoveTask: vi.fn(),
    onEditTask: vi.fn(),
    onMoveTask: vi.fn(),
    onAssignStaff: vi.fn(),
    onViewCandidate: vi.fn(),
    onEditCandidate: vi.fn(),
    onAddColumn: vi.fn(),
    onDeleteColumn: vi.fn(),
    setSelectedTaskIds: vi.fn(),
    setShowAssignCandidateModal: vi.fn(),
  };
  const view = render(
    <Provider store={makeStore(permissions)}>
      <Board
        data={data}
        pipelineId="pipeline-1"
        staffList={[{ staffId: "s-1", name: "Dr Bello" }]}
        stages={[{ stageId: "col-1", name: "Enquiry" }]}
        selectedTaskIds={[]}
        {...handlers}
        {...props}
      />
    </Provider>
  );
  return { ...view, ...handlers };
};

const insertionPoints = () => [...document.querySelectorAll(".column-insertion-point")];
const addButtons = () => screen.queryAllByLabelText("Add column");

// jsdom reports every box as zero-sized, so the board's overflow has to be
// described to it directly.
const measureBoard = ({ scrollLeft = 0, clientWidth = 0, scrollWidth = 0 }) => {
  vi.spyOn(Element.prototype, "scrollLeft", "get").mockReturnValue(scrollLeft);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
  vi.spyOn(Element.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
};

beforeEach(() => {
  vi.clearAllMocks();
  column.calls = [];
  Element.prototype.scrollBy = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the columns it lays out", () => {
  it("renders one column per entry in the order it is given", () => {
    renderBoard();
    expect(column.calls.map((c) => c.column.title)).toEqual(["Enquiry", "Assessment"]);
    expect(screen.getByTestId("column-col-1")).toBeInTheDocument();
  });

  it("hands each column the flattened list of every stage on the board", () => {
    renderBoard();
    expect(column.calls[0].columns).toEqual([
      { id: "col-1", title: "Enquiry" },
      { id: "col-2", title: "Assessment" },
    ]);
  });

  it("passes the board's tasks, staff and callbacks straight down", () => {
    const { onAddTask, onDeleteColumn, setShowAssignCandidateModal } = renderBoard();
    const first = column.calls[0];
    expect(first.tasks).toBe(boardData.tasks);
    expect(first.pipelineId).toBe("pipeline-1");
    expect(first.staffList).toEqual([{ staffId: "s-1", name: "Dr Bello" }]);
    expect(first.stages).toEqual([{ stageId: "col-1", name: "Enquiry" }]);
    expect(first.selectedTaskIds).toEqual([]);
    expect(first.onAddTask).toBe(onAddTask);
    expect(first.onDeleteColumn).toBe(onDeleteColumn);
    expect(first.setShowAssignCandidateModal).toBe(setShowAssignCandidateModal);
  });

  it("draws no columns at all for an empty pipeline", () => {
    renderBoard({ data: { tasks: {}, columns: {}, columnOrder: [] } });
    expect(column.calls).toHaveLength(0);
    expect(insertionPoints()).toHaveLength(0);
  });
});

describe("the hover-revealed insertion points", () => {
  it("puts one before the first column and one after every column", () => {
    renderBoard();
    // Two columns yield a leading point plus one trailing each.
    expect(insertionPoints()).toHaveLength(3);
  });

  it("shows nothing until a point is hovered", () => {
    renderBoard();
    expect(addButtons()).toHaveLength(0);
  });

  it("adds a stage at the very front from the leading point", () => {
    const { onAddColumn } = renderBoard();
    fireEvent.mouseEnter(insertionPoints()[0]);
    expect(addButtons()).toHaveLength(1);
    fireEvent.click(addButtons()[0]);
    expect(onAddColumn).toHaveBeenCalledWith(0);
  });

  it("adds a stage between two columns from the point that separates them", () => {
    const { onAddColumn } = renderBoard();
    fireEvent.mouseEnter(insertionPoints()[1]);
    fireEvent.click(addButtons()[0]);
    expect(onAddColumn).toHaveBeenCalledWith(1);
  });

  it("adds a stage at the end from the trailing point", () => {
    const { onAddColumn } = renderBoard();
    fireEvent.mouseEnter(insertionPoints()[2]);
    fireEvent.click(addButtons()[0]);
    expect(onAddColumn).toHaveBeenCalledWith(2);
  });

  it("hides the button again when the pointer leaves", () => {
    renderBoard();
    fireEvent.mouseEnter(insertionPoints()[1]);
    expect(addButtons()).toHaveLength(1);
    fireEvent.mouseLeave(insertionPoints()[1]);
    expect(addButtons()).toHaveLength(0);
  });

  it("shows only the point being hovered", () => {
    renderBoard();
    fireEvent.mouseEnter(insertionPoints()[0]);
    fireEvent.mouseEnter(insertionPoints()[2]);
    expect(addButtons()).toHaveLength(1);
  });
});

describe("the permission gate", () => {
  it("offers the always-visible card to someone who may create stages", () => {
    const { onAddColumn } = renderBoard({ permissions: ["create_pipeline"] });
    fireEvent.click(screen.getByLabelText("Add pipeline stage"));
    expect(onAddColumn).toHaveBeenCalledWith(2);
  });

  it("hides every way of adding a stage from someone who may not", () => {
    renderBoard({ permissions: ["view_pipeline"] });
    expect(screen.queryByLabelText("Add pipeline stage")).not.toBeInTheDocument();
    fireEvent.mouseEnter(insertionPoints()[0]);
    expect(addButtons()).toHaveLength(0);
  });

  it("still renders the columns themselves to a read-only viewer", () => {
    renderBoard({ permissions: ["view_pipeline"] });
    expect(column.calls).toHaveLength(2);
  });
});

describe("the horizontal scroll chevrons", () => {
  it("shows neither when the whole board fits", () => {
    measureBoard({ scrollLeft: 0, clientWidth: 1000, scrollWidth: 1000 });
    renderBoard();
    expect(screen.queryByLabelText("Scroll left")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Scroll right")).not.toBeInTheDocument();
  });

  it("shows only the right chevron at the start of an overflowing board", () => {
    measureBoard({ scrollLeft: 0, clientWidth: 500, scrollWidth: 2000 });
    renderBoard();
    expect(screen.queryByLabelText("Scroll left")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Scroll right")).toBeInTheDocument();
  });

  it("shows both once the board has been scrolled into the middle", () => {
    measureBoard({ scrollLeft: 600, clientWidth: 500, scrollWidth: 2000 });
    renderBoard();
    expect(screen.getByLabelText("Scroll left")).toBeInTheDocument();
    expect(screen.getByLabelText("Scroll right")).toBeInTheDocument();
  });

  it("shows only the left chevron once the end is reached", () => {
    measureBoard({ scrollLeft: 1500, clientWidth: 500, scrollWidth: 2000 });
    renderBoard();
    expect(screen.getByLabelText("Scroll left")).toBeInTheDocument();
    expect(screen.queryByLabelText("Scroll right")).not.toBeInTheDocument();
  });

  it("scrolls four fifths of a viewport to the right", () => {
    measureBoard({ scrollLeft: 0, clientWidth: 1000, scrollWidth: 3000 });
    renderBoard();
    fireEvent.click(screen.getByLabelText("Scroll right"));
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: 800,
      behavior: "smooth",
    });
  });

  it("never scrolls less than a card's width on a narrow board", () => {
    // Four fifths of a 300px viewport is under the 320px floor, so the floor is
    // what a click actually moves.
    measureBoard({ scrollLeft: 600, clientWidth: 300, scrollWidth: 2000 });
    renderBoard();
    fireEvent.click(screen.getByLabelText("Scroll left"));
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith({
      left: -320,
      behavior: "smooth",
    });
  });

  it("re-reads the board's width when the window is resized", () => {
    measureBoard({ scrollLeft: 0, clientWidth: 1000, scrollWidth: 1000 });
    renderBoard();
    expect(screen.queryByLabelText("Scroll right")).not.toBeInTheDocument();
    vi.restoreAllMocks();
    measureBoard({ scrollLeft: 0, clientWidth: 500, scrollWidth: 2000 });
    fireEvent(window, new Event("resize"));
    expect(screen.getByLabelText("Scroll right")).toBeInTheDocument();
  });

  it("re-reads the position when the board is scrolled", () => {
    measureBoard({ scrollLeft: 0, clientWidth: 500, scrollWidth: 2000 });
    renderBoard();
    expect(screen.queryByLabelText("Scroll left")).not.toBeInTheDocument();
    vi.restoreAllMocks();
    measureBoard({ scrollLeft: 800, clientWidth: 500, scrollWidth: 2000 });
    fireEvent.scroll(document.querySelector(".board"));
    expect(screen.getByLabelText("Scroll left")).toBeInTheDocument();
  });
});
