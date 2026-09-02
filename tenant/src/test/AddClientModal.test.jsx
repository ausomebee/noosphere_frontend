import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

/**
 * AddClientModal is the three-tab client form: basic information, caregiver
 * ("Other Information") and a document upload. It doubles as the edit form --
 * `initialData` fills every default and changes the title -- and it walks the
 * tabs with its own Next/Previous buttons rather than submitting from any tab.
 *
 * ReusableModal renders every tab at once and merely hides the inactive ones,
 * so the whole form is in the DOM the entire time and the same labels ("City",
 * "Country", "State") appear twice. Fields are therefore reached by the `name`
 * react-hook-form registers, and the react-select pickers by the label inside
 * their own tab panel.
 *
 * The redux draft hook is mocked away: the real one defers a `reset` through a
 * timer, which would fight the values a test has just typed. The upload area is
 * a probe exposing its two callbacks, since the real one is covered elsewhere.
 */

const auth = vi.hoisted(() => ({
  tenantId: "tenant-1",
  accessToken: "at",
  refreshToken: "rt",
}));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

const dispatch = vi.hoisted(() => vi.fn());
vi.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) => selector({ formDrafts: {}, authentication: {} }),
}));

const clearDraft = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useReduxFormDraft", () => ({ default: () => clearDraft }));

vi.mock("../ReduxStore/features/clientDraftSlice", () => ({
  setDraftField: (values) => ({ type: "clientDraft/setDraftField", payload: values }),
  resetDraft: () => ({ type: "clientDraft/resetDraft" }),
}));

const staffApi = vi.hoisted(() => ({ GetTenantStaffByTenantId: vi.fn() }));
vi.mock("../api/AppointmentApi", () => ({ default: staffApi }));

const billingApi = vi.hoisted(() => ({ GetPayerByTenantId: vi.fn() }));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: billingApi }));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

const upload = vi.hoisted(() => ({ props: {} }));
vi.mock("../Components/FileUpload/FileUploadArea", () => ({
  default: (received) => {
    upload.props = received;
    // Every button here is explicitly type="button": the probe renders inside
    // the modal's <form>, where a typeless button submits it.
    return (
      <div data-testid="upload-area">
        <span data-testid="upload-initial">{JSON.stringify(received.initialFiles)}</span>
        <button
          type="button"
          onClick={() =>
            received.onUploadComplete([
              { filename: "passport_scan.pdf", url: "https://cdn/passport_scan.pdf" },
            ])
          }
        >
          upload-pdf
        </button>
        <button
          type="button"
          onClick={() =>
            received.onUploadComplete([
              { filename: "id-card.png", url: "https://cdn/id-card.png" },
            ])
          }
        >
          upload-image
        </button>
        <button type="button" onClick={() => received.onUploadComplete([])}>
          upload-nothing
        </button>
        <button type="button" onClick={() => received.onRemove()}>
          remove-doc
        </button>
      </div>
    );
  },
}));

import AddClientModal from "../Components/ReusableModal/ClientModal/AddClientModal";

const staff = (over = []) => ({
  data: {
    data: [
      { id: "11111111-1111-4111-8111-111111111111", fullName: "Grace Hopper" },
      ...over,
    ],
  },
});

const renderModal = (props = {}) =>
  render(
    <AddClientModal isOpen onClose={vi.fn()} onSubmit={vi.fn().mockResolvedValue({})} {...props} />
  );

const TAB_NAMES = ["Basic Information", "Other Information", "Documents"];

const panel = (tab) =>
  document.body.querySelectorAll(".ReuseableModal-body > div")[TAB_NAMES.indexOf(tab)];

const field = (name) => document.body.querySelector(`[name="${name}"]`);

// A label carries no htmlFor, so a picker is found by the label sitting above
// it inside its own tab panel.
const picker = (tab, label) =>
  Array.from(panel(tab).querySelectorAll(".input-group")).find(
    (group) => group.querySelector("label")?.textContent.replace("*", "").trim() === label
  );

const openMenu = (group) => {
  const input = group.querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
};

const optionLabels = () =>
  Array.from(document.body.querySelectorAll(".rs__option")).map((o) => o.textContent);

const choose = (group, label) => {
  openMenu(group);
  const option = Array.from(document.body.querySelectorAll(".rs__option")).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no option "${label}" among ${optionLabels().join(", ")}`);
  fireEvent.click(option);
};

const type = (name, value) => fireEvent.change(field(name), { target: { value } });

const goToTab = (name) => fireEvent.click(screen.getByRole("tab", { name }));

const clickPrimary = async () => {
  await act(async () => {
    fireEvent.click(document.body.querySelector('button[type="submit"]'));
  });
};

const clickSecondary = () =>
  fireEvent.click(document.body.querySelector(".modal-btn-secondary"));

// Everything the schema insists on, so a test that cares about a later tab can
// get there in one call.
const fillRequired = async () => {
  type("firstName", "Ada");
  type("lastName", "Lovelace");
  type("email", "ada@example.com");
  type("phone", "+1 555 010 0000");
  choose(picker("Basic Information", "Gender"), "Female");
};

const settle = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  auth.tenantId = "tenant-1";
  auth.accessToken = "at";
  staffApi.GetTenantStaffByTenantId.mockResolvedValue(staff());
  billingApi.GetPayerByTenantId.mockResolvedValue({
    data: [{ id: "payer-1", payerName: "Blue Cross" }],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening the modal", () => {
  it("shows the create title and starts on the first tab", async () => {
    renderModal();
    await settle();
    expect(screen.getByText("Add New Client")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(document.body.querySelector('button[type="submit"]')).toHaveTextContent("Next");
    expect(document.body.querySelector(".modal-btn-secondary")).toHaveTextContent("Cancel");
  });

  it("shows the edit title when it was handed a client", async () => {
    renderModal({ initialData: EXISTING });
    await settle();
    expect(screen.getByText("Edit Client")).toBeInTheDocument();
  });

  it("renders nothing at all while closed, and fetches nothing", () => {
    render(<AddClientModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(document.body.querySelector(".modal-overlay")).toBeNull();
    expect(staffApi.GetTenantStaffByTenantId).not.toHaveBeenCalled();
  });

  it("defaults the country to the United States and leaves the rest blank", async () => {
    renderModal();
    await settle();
    expect(field("firstName")).toHaveValue("");
    expect(picker("Basic Information", "Country").textContent).toContain("United States");
  });
});

describe("the clinician and payer lookups", () => {
  it("offers the tenant's active clinicians", async () => {
    staffApi.GetTenantStaffByTenantId.mockResolvedValue(
      staff([
        { id: "22222222-2222-4222-8222-222222222222", fullName: "Alan Turing", active: true },
        { id: "33333333-3333-4333-8333-333333333333", fullName: "Retired", active: false },
        { id: "44444444-4444-4444-8444-444444444444" },
      ])
    );
    renderModal();
    await settle();
    openMenu(picker("Basic Information", "Assign To Clinician(s)"));
    expect(optionLabels()).toEqual(["Grace Hopper", "Alan Turing", "Unnamed"]);
  });

  it("offers the tenant's payers", async () => {
    renderModal();
    await settle();
    openMenu(picker("Basic Information", "Primary Payer"));
    expect(optionLabels()).toEqual(["Blue Cross"]);
  });

  it("hints at where to create clinicians when the tenant has none", async () => {
    staffApi.GetTenantStaffByTenantId.mockResolvedValue({ data: {} });
    renderModal();
    await settle();
    openMenu(picker("Basic Information", "Assign To Clinician(s)"));
    expect(
      screen.getByText("No clinicians found. Create one in Organisation → Staff & Teams.")
    ).toBeInTheDocument();
  });

  it("hints at where to create payers when the tenant has none", async () => {
    billingApi.GetPayerByTenantId.mockResolvedValue({});
    renderModal();
    await settle();
    openMenu(picker("Basic Information", "Primary Payer"));
    expect(
      screen.getByText(
        "No payers found. Create one in Billing & Payments → Settings → Payers & Insurance."
      )
    ).toBeInTheDocument();
  });

  it("logs a clinician lookup failure and leaves the picker empty", async () => {
    staffApi.GetTenantStaffByTenantId.mockRejectedValue(new Error("boom"));
    renderModal();
    await settle();
    expect(console.error).toHaveBeenCalledWith("Failed to load clinicians:", expect.any(Error));
    openMenu(picker("Basic Information", "Assign To Clinician(s)"));
    expect(optionLabels()).toEqual([]);
  });

  it("logs a payer lookup failure and leaves the picker empty", async () => {
    billingApi.GetPayerByTenantId.mockRejectedValue(new Error("boom"));
    renderModal();
    await settle();
    expect(console.error).toHaveBeenCalledWith("Failed to load payers:", expect.any(Error));
  });

  it("asks for nothing at all until the tenant is known", async () => {
    auth.tenantId = "";
    renderModal();
    await settle();
    expect(staffApi.GetTenantStaffByTenantId).not.toHaveBeenCalled();
    expect(billingApi.GetPayerByTenantId).not.toHaveBeenCalled();
  });

  it("asks for nothing at all without an access token", async () => {
    auth.accessToken = "";
    renderModal();
    await settle();
    expect(staffApi.GetTenantStaffByTenantId).not.toHaveBeenCalled();
  });
});

describe("walking the tabs", () => {
  it("refuses to move on while required fields are empty", async () => {
    renderModal();
    await settle();
    await clickPrimary();

    expect(toast.showToast).toHaveBeenCalledWith(
      "Please fill in all required fields before proceeding",
      "error"
    );
    expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("First Name is required")).toBeInTheDocument();
    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  it("moves to the caregiver tab once the basics are valid, saving a draft", async () => {
    renderModal();
    await settle();
    await fillRequired();
    await clickPrimary();

    expect(screen.getByRole("tab", { name: "Other Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "clientDraft/setDraftField" })
    );
    expect(document.body.querySelector(".modal-btn-secondary")).toHaveTextContent("Previous");
  });

  it("walks forward to the documents tab and swaps the primary button", async () => {
    renderModal();
    await settle();
    await fillRequired();
    await clickPrimary();
    await clickPrimary();

    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(document.body.querySelector('button[type="submit"]')).toHaveTextContent(
      "Save Client"
    );
  });

  it("walks back one tab at a time with Previous", async () => {
    renderModal();
    await settle();
    await fillRequired();
    await clickPrimary();
    clickSecondary();
    expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("closes rather than going back from the first tab", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await settle();
    clickSecondary();
    expect(onClose).toHaveBeenCalled();
  });

  it("jumps straight to a tab from the tab strip", async () => {
    renderModal();
    await settle();
    goToTab("Documents");
    expect(screen.getByRole("tab", { name: "Documents" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("rejects a gender the schema does not recognise", async () => {
    // The picker offers "Prefer not to say" but the schema's oneOf does not
    // list it, so choosing it blocks the form. Asserted as it behaves today.
    renderModal();
    await settle();
    type("firstName", "Ada");
    type("lastName", "Lovelace");
    type("email", "ada@example.com");
    type("phone", "+1 555 010 0000");
    choose(picker("Basic Information", "Gender"), "Prefer not to say");
    await clickPrimary();

    expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("goes nowhere at all when the email is malformed", async () => {
    // The field is `type="email"` and the form is not novalidate, so jsdom --
    // like a browser -- refuses to fire submit while the value is malformed.
    // The schema's own "Invalid email" therefore never gets a chance to run,
    // and the click looks like nothing happened.
    renderModal();
    await settle();
    await fillRequired();
    type("email", "not-an-email");
    await clickPrimary();

    expect(toast.showToast).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("names the invalid field when only the phone is malformed", async () => {
    renderModal();
    await settle();
    await fillRequired();
    type("phone", "123");
    await clickPrimary();
    expect(screen.getByText("Invalid phone")).toBeInTheDocument();
  });
});

describe("the country and state cascade", () => {
  it("keeps the state picker shut until a country is chosen", async () => {
    renderModal();
    await settle();
    const country = picker("Basic Information", "Country");
    choose(country, "Canada");
    openMenu(picker("Basic Information", "State"));
    expect(optionLabels()).toContain("Ontario");
  });

  it("clears the chosen state when the country changes under it", async () => {
    renderModal();
    await settle();
    choose(picker("Basic Information", "State"), "California");
    expect(picker("Basic Information", "State").textContent).toContain("California");

    choose(picker("Basic Information", "Country"), "Canada");
    expect(picker("Basic Information", "State").textContent).not.toContain("California");
  });

  it("explains an empty caregiver state list once a country is set", async () => {
    renderModal();
    await settle();
    goToTab("Other Information");
    openMenu(picker("Other Information", "State"));
    expect(optionLabels()).toContain("Alaska");
  });

  it("clears the caregiver state when its country changes", async () => {
    renderModal();
    await settle();
    goToTab("Other Information");
    choose(picker("Other Information", "State"), "Texas");
    choose(picker("Other Information", "Country"), "Canada");
    expect(picker("Other Information", "State").textContent).not.toContain("Texas");
  });
});

describe("mirroring the client address onto the caregiver", () => {
  const mirrorBox = () => panel("Other Information").querySelector('input[type="checkbox"]');

  it("copies the client address across while the box is ticked", async () => {
    renderModal();
    await settle();
    type("streetAddress", "1 Main St");
    type("city", "Boston");
    type("zipCode", "02101");
    choose(picker("Basic Information", "State"), "Massachusetts");

    goToTab("Other Information");
    await act(async () => {
      fireEvent.click(mirrorBox());
    });

    expect(field("caregiverStreetAddress")).toHaveValue("1 Main St");
    expect(field("caregiverCity")).toHaveValue("Boston");
    expect(field("caregiverzipCode")).toHaveValue("02101");
    expect(field("caregiverStreetAddress")).toBeDisabled();
  });

  it("keeps mirroring while the client address is still being edited", async () => {
    renderModal();
    await settle();
    goToTab("Other Information");
    await act(async () => {
      fireEvent.click(mirrorBox());
    });

    goToTab("Basic Information");
    await act(async () => {
      type("city", "Cambridge");
    });
    expect(field("caregiverCity")).toHaveValue("Cambridge");
  });

  it("empties the caregiver address again when the box is unticked", async () => {
    renderModal();
    await settle();
    type("streetAddress", "1 Main St");
    goToTab("Other Information");
    await act(async () => {
      fireEvent.click(mirrorBox());
    });
    expect(field("caregiverStreetAddress")).toHaveValue("1 Main St");

    await act(async () => {
      fireEvent.click(mirrorBox());
    });
    expect(field("caregiverStreetAddress")).toHaveValue("");
    expect(field("caregiverStreetAddress")).not.toBeDisabled();
  });

  it("starts ticked for a client whose two addresses already match", async () => {
    renderModal({ initialData: MIRRORED });
    await settle();
    goToTab("Other Information");
    expect(mirrorBox()).toBeChecked();
  });

  it("starts unticked when only the caregiver address is filled in", async () => {
    renderModal({ initialData: EXISTING });
    await settle();
    goToTab("Other Information");
    expect(mirrorBox()).not.toBeChecked();
  });
});

describe("the document tab", () => {
  const openDocuments = async (props = {}) => {
    renderModal(props);
    await settle();
    goToTab("Documents");
  };

  it("starts with no file staged", async () => {
    await openDocuments();
    expect(screen.getByTestId("upload-initial")).toHaveTextContent("[]");
    expect(field("documentName")).toHaveValue("");
  });

  it("stages an uploaded pdf and names it from the filename", async () => {
    await openDocuments();
    await act(async () => {
      fireEvent.click(screen.getByText("upload-pdf"));
    });

    expect(field("documentName")).toHaveValue("Passport Scan");
    expect(JSON.parse(screen.getByTestId("upload-initial").textContent)).toEqual([
      { filename: "passport_scan.pdf", url: "https://cdn/passport_scan.pdf" },
    ]);
  });

  it("keeps a name the user already typed", async () => {
    await openDocuments();
    type("documentName", "My own name");
    await act(async () => {
      fireEvent.click(screen.getByText("upload-pdf"));
    });
    expect(field("documentName")).toHaveValue("My own name");
  });

  it("ignores an upload callback that carries no file", async () => {
    await openDocuments();
    await act(async () => {
      fireEvent.click(screen.getByText("upload-nothing"));
    });
    expect(field("documentName")).toHaveValue("");
    expect(screen.getByTestId("upload-initial")).toHaveTextContent("[]");
  });

  it("unstages the file when the upload area drops it", async () => {
    await openDocuments();
    await act(async () => {
      fireEvent.click(screen.getByText("upload-pdf"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("remove-doc"));
    });
    expect(screen.getByTestId("upload-initial")).toHaveTextContent("[]");
  });

  it("shows the client's existing document", async () => {
    await openDocuments({ initialData: WITH_DOCUMENT });
    expect(JSON.parse(screen.getByTestId("upload-initial").textContent)).toEqual([
      { filename: "Insurance Card", url: "https://cdn/insurance.pdf" },
    ]);
    expect(field("documentName")).toHaveValue("Insurance Card");
  });

  it("names an existing document that has no name of its own", async () => {
    await openDocuments({ initialData: UNNAMED_DOCUMENT });
    expect(JSON.parse(screen.getByTestId("upload-initial").textContent)[0].filename).toBe(
      "Document"
    );
  });

  it("insists on a document name once a file is staged", async () => {
    await openDocuments();
    await act(async () => {
      fireEvent.click(screen.getByText("upload-pdf"));
    });
    type("documentName", "");
    await clickPrimary();

    expect(screen.getByText("Document name is required")).toBeInTheDocument();
    expect(toast.showToast).toHaveBeenCalledWith(
      "Please fill in all required fields before proceeding",
      "error"
    );
  });
});

describe("saving the client", () => {
  const reachDocuments = async (props = {}) => {
    renderModal(props);
    await settle();
    await fillRequired();
    goToTab("Documents");
  };

  it("submits only the fields that were filled in, then closes", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    const onClose = vi.fn();
    await reachDocuments({ onSubmit, onClose });
    await clickPrimary();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      gender: "female",
      country: "United States",
    });
    // Empty strings and empty arrays are stripped before the request goes out.
    expect(payload).not.toHaveProperty("preferredName");
    // An empty `documents` array is dropped by the same cleaner.
    expect(payload).not.toHaveProperty("documents");
    expect(payload).not.toHaveProperty("assignToClinicians");
    expect(payload).not.toHaveProperty("documentName");
    expect(payload).not.toHaveProperty("hasDocument");
    expect(payload).not.toHaveProperty("assignToClinician");

    expect(clearDraft).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("turns the chosen clinicians into a list of ids", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    renderModal({ onSubmit });
    await settle();
    await fillRequired();
    choose(picker("Basic Information", "Assign To Clinician(s)"), "Grace Hopper");
    goToTab("Documents");
    await clickPrimary();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].assignToClinicians).toEqual([
      { id: "11111111-1111-4111-8111-111111111111" },
    ]);
  });

  it("attaches the staged document with its details", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await reachDocuments({ onSubmit });
    await act(async () => {
      fireEvent.click(screen.getByText("upload-pdf"));
    });
    await clickPrimary();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].documents).toEqual([
      {
        name: "Passport Scan",
        documentDetails: {
          fileUrl: "https://cdn/passport_scan.pdf",
          fileType: "application/pdf",
          uploadedAt: expect.any(String),
        },
      },
    ]);
  });

  it("labels a non-pdf upload as an image", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await reachDocuments({ onSubmit });
    await act(async () => {
      fireEvent.click(screen.getByText("upload-image"));
    });
    await clickPrimary();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].documents[0].documentDetails.fileType).toBe("image/jpeg");
  });

  it("sends no document when a name was typed but nothing was uploaded", async () => {
    const onSubmit = vi.fn().mockResolvedValue({});
    await reachDocuments({ onSubmit });
    type("documentName", "Just a name");
    await clickPrimary();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("documents");
  });

  it("keeps the modal open and surfaces the error when the save fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Email already exists"));
    const onClose = vi.fn();
    await reachDocuments({ onSubmit, onClose });
    await clickPrimary();

    await waitFor(() => expect(toast.showApiError).toHaveBeenCalled());
    expect(toast.showApiError).toHaveBeenCalledWith(expect.any(Error), "SAVE_CLIENT");
    expect(onClose).not.toHaveBeenCalled();
    expect(clearDraft).not.toHaveBeenCalled();
    expect(document.body.querySelector(".modal-overlay")).toBeInTheDocument();
  });

  it("disables both buttons while the save is in flight", async () => {
    let release;
    const onSubmit = vi.fn().mockReturnValue(new Promise((r) => (release = r)));
    await reachDocuments({ onSubmit });
    await clickPrimary();

    expect(document.body.querySelector('button[type="submit"]')).toBeDisabled();
    await act(async () => {
      release({});
    });
  });
});

describe("editing an existing client", () => {
  it("fills every field it was given", async () => {
    renderModal({ initialData: EXISTING });
    await settle();

    expect(field("firstName")).toHaveValue("Ada");
    expect(field("lastName")).toHaveValue("Lovelace");
    expect(field("preferredName")).toHaveValue("Addy");
    expect(field("email")).toHaveValue("ada@example.com");
    expect(field("phone")).toHaveValue("555-0100");
    expect(field("DOB")).toHaveValue("2015-04-02");
    expect(field("streetAddress")).toHaveValue("1 Main St");
    expect(field("city")).toHaveValue("Boston");
    expect(picker("Basic Information", "Gender").textContent).toContain("Female");
    expect(picker("Basic Information", "Country").textContent).toContain("United States");
    expect(picker("Basic Information", "State").textContent).toContain("Massachusetts");
  });

  it("preselects the assigned clinicians and the portal switch", async () => {
    renderModal({ initialData: EXISTING });
    await settle();
    expect(picker("Basic Information", "Assign To Clinician(s)").textContent).toContain(
      "Grace Hopper"
    );
    expect(field("clientPortalAccess")).toBeChecked();
  });

  it("fills the caregiver block too", async () => {
    renderModal({ initialData: EXISTING });
    await settle();
    expect(field("caregiverName")).toHaveValue("Mary Lovelace");
    expect(field("caregiverRelationship")).toHaveValue("Mother");
    expect(field("caregiverEmail")).toHaveValue("mary@example.com");
    expect(field("caregiverCity")).toHaveValue("Cambridge");
  });

  it("leaves the zip code empty because it is read from the wrong key", async () => {
    // defaultValues reads `client.zipCodeCode`; the record carries `zipCode`,
    // so an edit silently drops it. Asserted as it behaves today.
    renderModal({ initialData: EXISTING });
    await settle();
    expect(field("zipCode")).toHaveValue("");
  });

  it("falls back to blanks for a client record that is almost empty", async () => {
    renderModal({ initialData: { client: {} } });
    await settle();
    expect(field("firstName")).toHaveValue("");
    expect(field("DOB")).toHaveValue("");
    expect(picker("Basic Information", "Country").textContent).toContain("United States");
    expect(field("clientPortalAccess")).not.toBeChecked();
  });
});

describe("closing the modal", () => {
  it("forgets the staged document and the tab when it is reopened", async () => {
    const { rerender } = render(
      <AddClientModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    await settle();
    goToTab("Documents");
    await act(async () => {
      fireEvent.click(screen.getByText("upload-pdf"));
    });

    await act(async () => {
      rerender(<AddClientModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "clientDraft/resetDraft" });

    await act(async () => {
      rerender(<AddClientModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);
    });
    expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    goToTab("Documents");
    expect(screen.getByTestId("upload-initial")).toHaveTextContent("[]");
  });

  it("closes from the cross in the header", async () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    await settle();
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalled();
  });
});

// Module-level so the `initialData` identity is stable across renders: it sits
// in a memo and an effect dependency list, and a fresh object each render would
// re-run both forever.
const EXISTING = {
  dbAccess: true,
  clinicians: [{ id: "11111111-1111-4111-8111-111111111111" }],
  client: {
    firstName: "Ada",
    lastName: "Lovelace",
    preferredName: "Addy",
    email: "ada@example.com",
    phoneNumber: "555-0100",
    DOB: "2015-04-02T00:00:00.000Z",
    gender: "female",
    streetAddress: "1 Main St",
    city: "Boston",
    state: "Massachusetts",
    zipCode: "02101",
    country: "United States",
    caregiverName: "Mary Lovelace",
    caregiverRelationship: "Mother",
    caregiverPhone: "555-0101",
    caregiverEmail: "mary@example.com",
    caregiverStreetAddress: "2 Side St",
    caregiverCity: "Cambridge",
    caregiverState: "Massachusetts",
    caregiverzipCode: "02139",
    caregiverCountry: "United States",
  },
};

const MIRRORED = {
  client: {
    streetAddress: "1 Main St",
    city: "Boston",
    state: "Massachusetts",
    country: "United States",
    caregiverStreetAddress: "1 Main St",
    caregiverCity: "Boston",
    caregiverState: "Massachusetts",
    caregiverCountry: "United States",
  },
};

const WITH_DOCUMENT = {
  client: {
    documents: [
      {
        name: "Insurance Card",
        documentDetails: { fileUrl: "https://cdn/insurance.pdf" },
      },
    ],
  },
};

const UNNAMED_DOCUMENT = {
  client: {
    documents: [{ documentDetails: { fileUrl: "https://cdn/anon.pdf" } }],
  },
};
