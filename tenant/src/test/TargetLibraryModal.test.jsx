import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

import TargetLibraryModal from "../Components/ReusableModal/ClientModal/TargetLibraryModal";

/**
 * The "import from target library" picker: a client-side search over whatever
 * target list it is handed, paged eight to a view, with one import button per
 * row that hands the chosen id and name back to the caller.
 *
 * It ships with a ten-item demo list as the default for `targets`, so a render
 * that passes nothing is a real case rather than an empty screen -- and ten
 * items across a page size of eight is exactly what makes the pager appear.
 *
 * The import buttons come from the shared Button, which swaps its accessible
 * name to "Loading" while busy, so the in-flight row is addressed by that name
 * rather than by its label. Everything else is driven off the row text.
 */

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const targetList = (count, over = () => ({})) =>
  Array.from({ length: count }, (_, i) => ({
    id: `t-${i + 1}`,
    name: `Target ${i + 1}`,
    ...over(i),
  }));

const renderModal = (props = {}) => {
  const onSelectTarget = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <TargetLibraryModal
      isOpen
      onClose={onClose}
      onSelectTarget={onSelectTarget}
      {...props}
    />
  );
  return { ...view, onSelectTarget, onClose };
};

const search = () => screen.getByPlaceholderText("Type to search...");
const rows = () => Array.from(document.body.querySelectorAll("h4")).map((h) => h.textContent);
const importButtons = () => screen.getAllByRole("button", { name: "Use Target" });
const summary = () => document.body.querySelector(".ReuseableModal-body > div > div:last-child");
const cancel = () => document.body.querySelector(".modal-btn-secondary");

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the picker shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself and offers only a cancel", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Import from Target Library"
    );
    expect(cancel()).toHaveTextContent("Cancel");
    // The picker imports from a row button, so there is no footer submit.
    expect(document.body.querySelector(".modal-btn:not(.modal-btn-secondary)")).toBeNull();
  });

  it("closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.click(cancel());
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a loading notice instead of the list", () => {
    renderModal({ loading: true, targets: targetList(3) });
    expect(screen.getByText("Loading targets...")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use Target" })).toBeNull();
  });

  it("falls back to the built-in demo library when handed no targets", () => {
    renderModal();
    expect(screen.getByText("Mand Training - 50 independent mands")).toBeInTheDocument();
    expect(importButtons()).toHaveLength(8);
  });
});

describe("the list", () => {
  it("describes a target that carries no description", () => {
    renderModal({ targets: [{ id: "t-1", name: "Solo target" }] });
    expect(screen.getByText("No description available.")).toBeInTheDocument();
  });

  it("shows a target's own description when it has one", () => {
    renderModal({
      targets: [{ id: "t-1", name: "Solo target", description: "Ten trials daily" }],
    });
    expect(screen.getByText("Ten trials daily")).toBeInTheDocument();
    expect(screen.queryByText("No description available.")).toBeNull();
  });

  it("counts a single target in the singular", () => {
    renderModal({ targets: targetList(1) });
    expect(summary()).toHaveTextContent("Showing 1–1 of 1 target");
    expect(summary().textContent).not.toContain("targets");
  });

  it("counts several targets in the plural", () => {
    renderModal({ targets: targetList(3) });
    expect(summary()).toHaveTextContent("Showing 1–3 of 3 targets");
  });

  it("says the library is empty when it was handed nothing", () => {
    renderModal({ targets: [] });
    expect(screen.getByText("No targets in library")).toBeInTheDocument();
  });
});

describe("searching", () => {
  it("keeps only the matching targets, ignoring case", () => {
    renderModal({
      targets: [
        { id: "t-1", name: "Mand Training" },
        { id: "t-2", name: "Tact nouns" },
      ],
    });
    fireEvent.change(search(), { target: { value: "mand" } });
    expect(rows()).toEqual(["Mand Training"]);
    expect(summary()).toHaveTextContent("of 1 target");
  });

  it("says nothing was found when the search matches no target", () => {
    renderModal({ targets: targetList(3) });
    fireEvent.change(search(), { target: { value: "zzz" } });
    expect(screen.getByText("No targets found")).toBeInTheDocument();
    expect(screen.queryByText("No targets in library")).toBeNull();
  });

  it("restores the whole list when the search is cleared", () => {
    renderModal({ targets: targetList(3) });
    fireEvent.change(search(), { target: { value: "Target 2" } });
    expect(rows()).toEqual(["Target 2"]);
    fireEvent.change(search(), { target: { value: "" } });
    expect(rows()).toHaveLength(3);
  });
});

describe("paging", () => {
  it("hides the pager when everything fits on one page", () => {
    renderModal({ targets: targetList(8) });
    expect(document.body.querySelector(".pagination")).toBeNull();
    expect(summary()).toHaveTextContent("Showing 1–8 of 8 targets");
  });

  it("pages a list that overflows and re-counts the tail", () => {
    renderModal({ targets: targetList(10) });
    expect(document.body.querySelector(".pagination")).not.toBeNull();
    expect(rows()).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(rows()).toEqual(["Target 9", "Target 10"]);
    // The tail is short, so the upper bound comes from the list length.
    expect(summary()).toHaveTextContent("Showing 9–10 of 10 targets");
  });

  it("drops back to the first page of results as the search narrows", () => {
    renderModal({ targets: targetList(10) });
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(rows()).toEqual(["Target 9", "Target 10"]);
    fireEvent.change(search(), { target: { value: "Target 1" } });
    // Page 2 of a two-item result is empty; the picker keeps the page index,
    // so the search has to be paged back by hand.
    expect(screen.getByText("No targets found")).toBeInTheDocument();
    fireEvent.change(search(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "1" }));
    expect(rows()).toHaveLength(8);
  });
});

describe("importing a target", () => {
  it("hands the caller the id and name, then closes", async () => {
    const { onSelectTarget, onClose } = renderModal({ targets: targetList(2) });
    await act(async () => {
      fireEvent.click(importButtons()[1]);
    });
    expect(onSelectTarget).toHaveBeenCalledWith("t-2", "Target 2");
    expect(onClose).toHaveBeenCalled();
  });

  it("marks the chosen row busy and locks every other row", async () => {
    let release;
    const onSelectTarget = vi.fn(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );
    renderModal({ targets: targetList(2), onSelectTarget });
    fireEvent.click(screen.getAllByRole("button", { name: "Use Target" })[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Loading" })).toBeDisabled()
    );
    expect(screen.getByRole("button", { name: "Use Target" })).toBeDisabled();
    await act(async () => {
      release();
    });
    await waitFor(() => expect(importButtons()).toHaveLength(2));
  });

  it("reports the caller's own complaint and stays open", async () => {
    const onSelectTarget = vi.fn().mockRejectedValue(new Error("Target already added"));
    const { onClose } = renderModal({ targets: targetList(2), onSelectTarget });
    await act(async () => {
      fireEvent.click(importButtons()[0]);
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Target already added", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
    // The row is released so a second attempt is possible.
    expect(importButtons()[0]).toBeEnabled();
  });

  it("falls back to a generic complaint when the failure has no message", async () => {
    const onSelectTarget = vi.fn().mockRejectedValue({});
    renderModal({ targets: targetList(2), onSelectTarget });
    await act(async () => {
      fireEvent.click(importButtons()[0]);
    });
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith("Failed to import target", "error")
    );
  });
});

describe("reopening", () => {
  it("clears the search and the page on the next open", () => {
    const { rerender, onClose, onSelectTarget } = renderModal({ targets: targetList(10) });
    // Paged first, then narrowed: both bits of view state have to be dropped.
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.change(search(), { target: { value: "Target 1" } });
    const props = { onClose, onSelectTarget, targets: targetList(10) };
    rerender(<TargetLibraryModal isOpen={false} {...props} />);
    rerender(<TargetLibraryModal isOpen {...props} />);
    expect(search()).toHaveValue("");
    expect(rows()).toHaveLength(8);
    expect(summary()).toHaveTextContent("Showing 1–8 of 10 targets");
  });
});
