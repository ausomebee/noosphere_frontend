import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The organisation's team modal, which serves three modes off one form: adding
 * a team, editing one, and viewing one read-only. Mode drives the title, the
 * primary button's wording, whether the stored record is loaded into the form,
 * whether an id is sent back, and whether every control is disabled.
 *
 * Only the team name is compulsory — a team may legitimately be created with no
 * members and no lead — so the payload assertions below check that the empty
 * member list and empty lead really do go out rather than being dropped.
 *
 * The option lists are supplied by the caller rather than fetched, and both
 * `initialData` and those lists sit in the reset effect's dependencies, so
 * every render here passes module-level constants; a fresh literal would loop.
 */

const toast = vi.hoisted(() => vi.fn());
vi.mock("../Helper/ShowToast", () => ({ showToast: toast, showApiError: vi.fn() }));

import AddTeamsModal from "../Components/ReusableModal/OrganizationModal/AddTeamsModal";

const MEMBER_OPTIONS = [
  { value: "s-1", label: "Ada Lovelace" },
  { value: "s-2", label: "Grace Hopper" },
  { value: "s-3", label: "Alan Turing" },
];
const LEAD_OPTIONS = [
  { value: "s-1", label: "Ada Lovelace" },
  { value: "s-2", label: "Grace Hopper" },
];

const STORED_TEAM = Object.freeze({
  id: "team-1",
  teamName: "Clinical",
  teamMember: ["s-1", "s-2"],
  teamLead: "s-2",
});

// `initialData` is an effect dependency, so it is never a fresh literal.
const NO_RECORD = undefined;

const renderModal = ({ initialData = NO_RECORD, ...props } = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <AddTeamsModal
      isOpen
      onClose={onClose}
      onSubmit={onSubmit}
      initialData={initialData}
      memberOptions={MEMBER_OPTIONS}
      teamLeadOptions={LEAD_OPTIONS}
      {...props}
    />
  );
  return { ...view, onSubmit, onClose };
};

const selects = () => Array.from(document.body.querySelectorAll(".select-input-wrapper"));
const MEMBERS = 0;
const LEAD = 1;

const openMenu = (index) => {
  const input = selects()[index].querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const lastMenu = () => {
  const menus = document.body.querySelectorAll(".rs__menu");
  return menus[menus.length - 1];
};

const menuLabels = () => {
  const menu = lastMenu();
  const options = menu.querySelectorAll(".rs__option");
  return options.length ? Array.from(options).map((o) => o.textContent) : [menu.textContent];
};

const choose = (index, label) => {
  openMenu(index);
  const option = Array.from(lastMenu().querySelectorAll(".rs__option")).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no option "${label}" in select ${index}`);
  fireEvent.click(option);
};

const leadValue = () =>
  selects()[LEAD].querySelector(".rs__single-value")?.textContent ?? "";
const memberChips = () =>
  Array.from(selects()[MEMBERS].querySelectorAll(".selected-label-item")).map(
    (c) => c.textContent
  );

const nameInput = () => screen.getByPlaceholderText("Enter Team Name");
const title = () => document.body.querySelector(".modal-title-text").textContent;
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const submit = async () => act(async () => { fireEvent.click(primary()); });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("titles itself for a new team", () => {
    renderModal();
    expect(title()).toBe("Add a new Team");
    expect(primary()).toHaveTextContent("Save Team");
  });

  it("titles itself for an edit", () => {
    renderModal({ mode: "edit", initialData: STORED_TEAM });
    expect(title()).toBe("Edit Team");
    expect(primary()).toHaveTextContent("Save Changes");
  });

  it("opens blank for a new team", () => {
    renderModal();
    expect(nameInput()).toHaveValue("");
    expect(memberChips()).toEqual([]);
    expect(leadValue()).toBe("");
  });

  it("clears the form and closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });

  it("clears the form and closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Typed then abandoned" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(nameInput()).toHaveValue("");
  });
});

describe("the option lists", () => {
  it("offers the members the caller supplied", () => {
    renderModal();
    openMenu(MEMBERS);
    expect(menuLabels()).toEqual(["Ada Lovelace", "Grace Hopper", "Alan Turing"]);
  });

  it("offers the leads the caller supplied, which need not be the same list", () => {
    renderModal();
    openMenu(LEAD);
    expect(menuLabels()).toEqual(["Ada Lovelace", "Grace Hopper"]);
  });

  it("points the way to the staff screen when the caller supplied nothing", () => {
    render(
      <AddTeamsModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} initialData={NO_RECORD} />
    );
    openMenu(MEMBERS);
    expect(menuLabels()[0]).toContain("No staff found");
    openMenu(LEAD);
    expect(menuLabels()[0]).toContain("No staff found");
  });
});

describe("opening on an existing team", () => {
  it("loads the stored team into the form", () => {
    renderModal({ mode: "edit", initialData: STORED_TEAM });
    expect(nameInput()).toHaveValue("Clinical");
    expect(memberChips()).toEqual(["Ada Lovelace", "Grace Hopper"]);
    expect(leadValue()).toBe("Grace Hopper");
  });

  it("blanks every part of a stored team that was left unset", () => {
    const SPARSE = Object.freeze({ id: "team-2" });
    renderModal({ mode: "edit", initialData: SPARSE });
    expect(nameInput()).toHaveValue("");
    expect(memberChips()).toEqual([]);
    expect(leadValue()).toBe("");
  });

  // Edit mode with nothing to edit still has to open on the blank defaults
  // rather than throwing on the missing record.
  it("opens blank in edit mode with no record at all", () => {
    renderModal({ mode: "edit" });
    expect(title()).toBe("Edit Team");
    expect(nameInput()).toHaveValue("");
  });

  it("ignores a stored team when the mode is not edit", () => {
    renderModal({ initialData: STORED_TEAM });
    expect(nameInput()).toHaveValue("");
    expect(memberChips()).toEqual([]);
  });
});

describe("view mode", () => {
  it("locks every control", () => {
    renderModal({ mode: "view", initialData: STORED_TEAM });
    expect(nameInput()).toBeDisabled();
    expect(selects()[MEMBERS].querySelector(".rs__control--is-disabled")).not.toBeNull();
    expect(selects()[LEAD].querySelector(".rs__control--is-disabled")).not.toBeNull();
  });

  // View mode is not "edit", so the form opens blank and is labelled as an add.
  it("still calls itself an add and opens blank", () => {
    renderModal({ mode: "view", initialData: STORED_TEAM });
    expect(title()).toBe("Add a new Team");
    expect(nameInput()).toHaveValue("");
  });
});

describe("validation", () => {
  it("refuses a team with no name", async () => {
    const { onSubmit } = renderModal();
    await submit();
    expect(await screen.findByText("Team Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith("Team Name is required", "error");
  });
});

describe("saving", () => {
  it("saves a team that has only a name", async () => {
    const { onSubmit, onClose } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Clinical" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      id: undefined,
      teamName: "Clinical",
      teamMember: [],
      teamLead: "",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("saves the members and the lead that were chosen", async () => {
    const { onSubmit } = renderModal();
    fireEvent.change(nameInput(), { target: { value: "Clinical" } });
    choose(MEMBERS, "Ada Lovelace");
    choose(MEMBERS, "Alan Turing");
    choose(LEAD, "Grace Hopper");
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      id: undefined,
      teamName: "Clinical",
      teamMember: ["s-1", "s-3"],
      teamLead: "s-2",
    });
  });

  it("sends the stored team's id back when editing it", async () => {
    const { onSubmit } = renderModal({ mode: "edit", initialData: STORED_TEAM });
    fireEvent.change(nameInput(), { target: { value: "Clinical (renamed)" } });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual({
      id: "team-1",
      teamName: "Clinical (renamed)",
      teamMember: ["s-1", "s-2"],
      teamLead: "s-2",
    });
  });

  it("sends no id when the record being edited has none", async () => {
    const IDLESS = Object.freeze({ teamName: "Clinical" });
    const { onSubmit } = renderModal({ mode: "edit", initialData: IDLESS });
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].id).toBeUndefined();
  });

  it("clears the form once the save lands", async () => {
    renderModal();
    fireEvent.change(nameInput(), { target: { value: "Clinical" } });
    await submit();
    await waitFor(() => expect(nameInput()).toHaveValue(""));
  });

  it("reports a refused save in the server's own words", async () => {
    const { onSubmit, onClose } = renderModal();
    onSubmit.mockRejectedValue(new Error("A team by that name exists"));
    fireEvent.change(nameInput(), { target: { value: "Clinical" } });
    await submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("A team by that name exists", "error")
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(nameInput()).toHaveValue("Clinical");
  });

  it("falls back to a generic message when the failure says nothing", async () => {
    const { onSubmit } = renderModal();
    onSubmit.mockRejectedValue({});
    fireEvent.change(nameInput(), { target: { value: "Clinical" } });
    await submit();
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Save failed. Please try again.", "error")
    );
  });

  it("locks the Save button while the request is in flight", async () => {
    let release;
    const { onSubmit } = renderModal();
    onSubmit.mockReturnValue(new Promise((r) => { release = r; }));
    fireEvent.change(nameInput(), { target: { value: "Clinical" } });
    await submit();
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => { release(); });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});
