import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The Profile tab of a single staff member: the basic-information card, the
 * licence section (a card grid or a table, the reader's choice) and the document
 * table. It holds no state of its own -- every button reports back up to
 * SingleStaffByAdmin -- so the tests assert on the callbacks it was handed and
 * on which controls a given permission set leaves on screen.
 *
 * `CustomTable` is a probe collecting the props of each table it renders, keyed
 * by the first column header, because the licence list and the document list are
 * both tables and the row action menus are what the tests need to reach.
 *
 * The two view-toggle icons are mocked into buttons: they are clickable SVGs
 * with no accessible name, and their `color` prop is the only thing marking
 * which view is active.
 */

const viewer = vi.hoisted(() => ({ openDocument: vi.fn(), downloadDocument: vi.fn() }));
vi.mock("../hooks/useDocumentViewer", () => ({ default: () => viewer }));

const tables = vi.hoisted(() => ({ byHeader: {} }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (props) => {
    tables.byHeader[props.columns[0].header] = props;
    return <div data-testid={`table-${props.columns[0].key}`} />;
  },
}));

vi.mock("react-icons/rx", () => ({
  RxDashboard: (p) => (
    <button data-testid="card-view" data-color={p.color} onClick={p.onClick} />
  ),
}));
vi.mock("react-icons/pi", () => ({
  PiListDashesBold: (p) => (
    <button data-testid="list-view" data-color={p.color} onClick={p.onClick} />
  ),
}));

import Profile from "../Pages/Organisation/StaffAndTeams/StaffSingleTabs/StaffProfile";

const staff = {
  id: "s-1",
  name: "Grace Hopper",
  gender: "Female",
  DOB: "1980-12-09",
  staffRoleName: "Clinician",
  practiceNPI: "123",
  email: "grace@example.com",
  address: "1 Navy Way",
  dateJoined: "01/05/2026",
};

const licence = (over = {}) => ({
  id: "l-1",
  licenseName: "RBT",
  licenseNumber: "R-1",
  expirationDate: "01/31/2027",
  state: "VA",
  ...over,
});

const document_ = (over = {}) => ({
  id: "d-1",
  documentName: "CV.pdf",
  date: "02/02/2026",
  documentsUrl: { filename: "cv.pdf", url: "https://files/cv.pdf" },
  ...over,
});

const store = (permissions) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          // An empty accesses array is the org-owner case: every permission.
          role: permissions
            ? { roleModuleAccesses: [{ module: "MY_ORGANIZATION", permissions }] }
            : { roleModuleAccesses: [] },
        },
      },
    },
  });

const handlers = () => ({
  setLicenseView: vi.fn(),
  setShowLicenseModal: vi.fn(),
  setShowFileModal: vi.fn(),
  setLicenseToEdit: vi.fn(),
  setFileToEdit: vi.fn(),
  openDelete: vi.fn(),
  deleteLicense: vi.fn(),
  deleteFile: vi.fn(),
  openBasicInfoModal: vi.fn(),
  onResetStaffLogin: vi.fn(),
});

let props;

const renderProfile = ({ permissions, ...over } = {}) => {
  props = {
    staff,
    licenses: [licence()],
    files: [document_()],
    licenseView: "card",
    ...handlers(),
    ...over,
  };
  return render(
    <Provider store={store(permissions)}>
      <Profile {...props} />
    </Provider>
  );
};

const licenceTable = () => tables.byHeader["License Name"];
const fileTable = () => tables.byHeader["File Name"];
const menuItems = (table) => table.actions[0].items;
const cards = () => document.body.querySelectorAll(".org-license-grid > div");

beforeEach(() => {
  vi.clearAllMocks();
  tables.byHeader = {};
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the basic information card", () => {
  it("shows the staff member's initials and fields", () => {
    renderProfile();
    expect(screen.getByText("GH")).toBeInTheDocument();
    expect(screen.getByText("Female")).toBeInTheDocument();
    expect(screen.getByText("Clinician")).toBeInTheDocument();
    expect(screen.getByText("01/05/2026")).toBeInTheDocument();
  });

  it("keeps only the first two initials of a longer name", () => {
    renderProfile({ staff: { ...staff, name: "Anna Marie Van Der Berg" } });
    expect(screen.getByText("AM")).toBeInTheDocument();
  });

  it("stands in for a staff record that has not loaded yet", () => {
    renderProfile({ staff: null });
    expect(screen.getByText("NA")).toBeInTheDocument();
    // Every field falls back too, so N/A appears once per empty field plus the name.
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(1);
  });

  it("opens the edit modal from the pencil", () => {
    const { container } = renderProfile();
    fireEvent.click(container.querySelector(".staff-info-card-main .cursor-pointer"));
    expect(props.openBasicInfoModal).toHaveBeenCalled();
  });

  it("hides the pencil from a role that may not edit", () => {
    const { container } = renderProfile({
      permissions: ["view_staff_profile_information"],
    });
    expect(container.querySelector(".staff-info-card-main .cursor-pointer")).toBeNull();
  });
});

describe("resetting the staff login", () => {
  it("asks for confirmation before resetting", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: /Reset staff login/ }));
    expect(props.openDelete).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Reset staff login",
        confirmLabel: "Reset login",
        onConfirm: props.onResetStaffLogin,
      })
    );
  });

  it("omits the button when the page passes no reset handler", () => {
    renderProfile({ onResetStaffLogin: undefined });
    expect(
      screen.queryByRole("button", { name: /Reset staff login/ })
    ).not.toBeInTheDocument();
  });
});

describe("the licence section", () => {
  it("invites the first licence when there are none", () => {
    renderProfile({ licenses: [] });
    expect(screen.getByText("No licenses added yet")).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  it("renders one card per licence in card view", () => {
    renderProfile({ licenses: [licence(), licence({ id: "l-2", licenseName: "BCBA" })] });
    expect(cards()).toHaveLength(2);
    expect(screen.getByText("RBT")).toBeInTheDocument();
    expect(screen.getByText("BCBA")).toBeInTheDocument();
    // Both fixtures share a number and an expiry, so each appears twice.
    expect(screen.getAllByText("R-1")).toHaveLength(2);
    expect(screen.getAllByText("01/31/2027")).toHaveLength(2);
  });

  it("shortens a licence name that would not fit the card", () => {
    renderProfile({
      licenses: [licence({ licenseName: "Board Certified Behaviour Analyst" })],
    });
    expect(screen.getByText("Board Certified Beha...")).toBeInTheDocument();
  });

  it("falls back to N/A for a licence with no name or details", () => {
    renderProfile({ licenses: [{ id: "l-3" }] });
    // One for the card title and one for each of the three detail rows.
    expect(screen.getAllByText("N/A")).toHaveLength(4);
  });

  it("edits and deletes a licence from its card", () => {
    renderProfile();
    const [edit, remove] = cards()[0].querySelectorAll(".cursor-pointer");
    fireEvent.click(edit);
    expect(props.setLicenseToEdit).toHaveBeenCalledWith(licence());
    expect(props.setShowLicenseModal).toHaveBeenCalledWith(true);

    fireEvent.click(remove);
    const cfg = props.openDelete.mock.calls[0][0];
    expect(cfg.title).toBe("Delete License");
    cfg.onConfirm();
    expect(props.deleteLicense).toHaveBeenCalledWith("l-1");
  });

  it("leaves a card with no controls for a read-only role", () => {
    renderProfile({ permissions: ["view_staff_licenses_list"] });
    expect(cards()[0].querySelectorAll(".cursor-pointer")).toHaveLength(0);
  });

  it("marks whichever view is showing", () => {
    renderProfile();
    expect(screen.getByTestId("card-view")).toHaveAttribute("data-color", "#004ABA");
    expect(screen.getByTestId("list-view")).toHaveAttribute("data-color", "#000");
  });

  it("switches between the card grid and the table", () => {
    renderProfile();
    fireEvent.click(screen.getByTestId("list-view"));
    expect(props.setLicenseView).toHaveBeenCalledWith("list");
    fireEvent.click(screen.getByTestId("card-view"));
    expect(props.setLicenseView).toHaveBeenCalledWith("card");
  });

  it("renders the licences as a table in list view", () => {
    renderProfile({ licenseView: "list" });
    expect(screen.getByTestId("card-view")).toHaveAttribute("data-color", "#000");
    expect(screen.getByTestId("list-view")).toHaveAttribute("data-color", "#004ABA");
    expect(licenceTable().data).toEqual([licence()]);
    expect(cards()).toHaveLength(0);
  });

  it("still shows the empty state in list view", () => {
    renderProfile({ licenseView: "list", licenses: [] });
    expect(screen.getByText("No licenses added yet")).toBeInTheDocument();
    expect(licenceTable()).toBeUndefined();
  });

  it("starts a blank licence from the New button", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: /New$/ }));
    expect(props.setLicenseToEdit).toHaveBeenCalledWith(null);
    expect(props.setShowLicenseModal).toHaveBeenCalledWith(true);
  });

  it("hides the whole section from a role that may not see licences", () => {
    renderProfile({ permissions: ["view_staff_profile_information"] });
    expect(screen.queryByText("Staff Licenses")).not.toBeInTheDocument();
  });

  it("hides the New button from a role that may not add one", () => {
    renderProfile({ permissions: ["view_staff_licenses_list"] });
    expect(screen.getByText("Staff Licenses")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New$/ })).not.toBeInTheDocument();
  });
});

describe("the licence table's row menu", () => {
  it("offers edit and delete to a role holding both permissions", () => {
    renderProfile({ licenseView: "list" });
    expect(menuItems(licenceTable()).map((i) => i.label)).toEqual(["Edit", "Delete"]);
  });

  it("edits the row it was opened on", () => {
    renderProfile({ licenseView: "list" });
    menuItems(licenceTable())[0].onClick(licence({ id: "l-7" }));
    expect(props.setLicenseToEdit).toHaveBeenCalledWith(licence({ id: "l-7" }));
    expect(props.setShowLicenseModal).toHaveBeenCalledWith(true);
  });

  it("confirms before deleting the row it was opened on", () => {
    renderProfile({ licenseView: "list" });
    menuItems(licenceTable())[1].onClick(licence({ id: "l-7" }));
    props.openDelete.mock.calls[0][0].onConfirm();
    expect(props.deleteLicense).toHaveBeenCalledWith("l-7");
  });

  it("drops the entries whose permissions the role lacks", () => {
    renderProfile({ licenseView: "list", permissions: ["view_staff_licenses_list"] });
    expect(menuItems(licenceTable())).toEqual([]);
  });
});

describe("the document section", () => {
  it("invites the first document when there are none", () => {
    renderProfile({ files: [] });
    expect(screen.getByText("No documents added")).toBeInTheDocument();
    expect(fileTable()).toBeUndefined();
  });

  it("lists the documents it was given", () => {
    renderProfile();
    expect(fileTable().data).toEqual([document_()]);
  });

  it("starts a blank upload from the New upload button", () => {
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: /New upload/ }));
    expect(props.setFileToEdit).toHaveBeenCalledWith(null);
    expect(props.setShowFileModal).toHaveBeenCalledWith(true);
  });

  it("hides the whole section from a role that may not see documents", () => {
    renderProfile({ permissions: ["view_staff_profile_information"] });
    expect(screen.queryByText("Staff Documents")).not.toBeInTheDocument();
  });

  it("hides the upload button from a role that may only read", () => {
    renderProfile({ permissions: ["view_staff_document_list"] });
    expect(screen.getByText("Staff Documents")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New upload/ })).not.toBeInTheDocument();
  });
});

describe("the document table's row menu", () => {
  const items = () => menuItems(fileTable());

  it("offers all four entries to a role holding every permission", () => {
    renderProfile();
    expect(items().map((i) => i.label)).toEqual([
      "View",
      "Download",
      "Edit",
      "Delete",
    ]);
  });

  it("opens a stored document in the viewer", () => {
    renderProfile();
    items()[0].onClick(document_());
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files/cv.pdf",
      "CV.pdf"
    );
  });

  it("names an unnamed document generically when opening it", () => {
    renderProfile();
    items()[0].onClick(document_({ documentName: null }));
    expect(viewer.openDocument).toHaveBeenCalledWith(
      "https://files/cv.pdf",
      "Document"
    );
  });

  it("does nothing for a row with no stored file", () => {
    renderProfile();
    items()[0].onClick({ id: "d-2" });
    items()[1].onClick({ id: "d-2" });
    expect(viewer.openDocument).not.toHaveBeenCalled();
    expect(viewer.downloadDocument).not.toHaveBeenCalled();
  });

  it("downloads under the document's own name", () => {
    renderProfile();
    items()[1].onClick(document_());
    expect(viewer.downloadDocument).toHaveBeenCalledWith(
      "https://files/cv.pdf",
      "CV.pdf"
    );
  });

  it("falls back to the stored filename, then to a generic name", () => {
    renderProfile();
    items()[1].onClick(document_({ documentName: null }));
    expect(viewer.downloadDocument).toHaveBeenCalledWith(
      "https://files/cv.pdf",
      "cv.pdf"
    );
    items()[1].onClick({
      id: "d-3",
      documentsUrl: { url: "https://files/x" },
    });
    expect(viewer.downloadDocument).toHaveBeenLastCalledWith(
      "https://files/x",
      "document"
    );
  });

  it("edits the row it was opened on", () => {
    renderProfile();
    items()[2].onClick(document_());
    expect(props.setFileToEdit).toHaveBeenCalledWith(document_());
    expect(props.setShowFileModal).toHaveBeenCalledWith(true);
  });

  it("confirms before deleting the row it was opened on", () => {
    renderProfile();
    items()[3].onClick(document_());
    const cfg = props.openDelete.mock.calls[0][0];
    expect(cfg.title).toBe("Delete File");
    cfg.onConfirm();
    expect(props.deleteFile).toHaveBeenCalledWith("d-1");
  });

  it("keeps only the entries a limited role is granted", () => {
    renderProfile({
      permissions: ["view_staff_document_list", "delete_staff_document"],
    });
    expect(items().map((i) => i.label)).toEqual(["Delete"]);
  });

  it("leaves the menu empty for a role granted none of them", () => {
    renderProfile({ permissions: ["view_staff_document_list"] });
    expect(items()).toEqual([]);
  });
});
