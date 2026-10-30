import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

/**
 * BuildDocumentModal collects the four bits of metadata a clinical report needs
 * -- title, client, creator and approver -- and hands them to the report
 * builder. It runs in two modes: "fromTemplate" when a template is passed in,
 * which seeds the title and turns the template's sections into the builder's
 * activeSections/sectionData shape, and "fromScratch" when it is not.
 *
 * The client and creator boxes are disabled and filled from props and from the
 * staff list, so the interesting assertions are on what `onStartCreating`
 * receives rather than on what can be typed. The approver picker is
 * react-select, driven here by clicking the portalled option.
 *
 * Section labels are matched against a fixed table; a template section whose
 * label is not in it falls back to a squashed lowercase id, which is why one
 * fixture carries a deliberately unknown label.
 */

const auth = vi.hoisted(() => ({
  tenantId: "tenant-1",
  userId: "user-9",
  accessToken: "at",
  refreshToken: "rt",
}));
vi.mock("../hooks/useAuth", () => ({ default: () => auth }));

const route = vi.hoisted(() => ({ tenantClientId: "tc-1" }));
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => route,
}));

const api = vi.hoisted(() => ({ GetTenantStaffByTenantId: vi.fn() }));
vi.mock("../api/AppointmentApi", () => ({ default: api }));

import BuildDocumentModal from "../Components/ReusableModal/ClientModal/ClinicalReport/BuildDocumentModal/BuildDocumentModal";

const STAFF = [
  { id: "user-9", fullName: "Grace Hopper" },
  { id: "user-2", fullName: "Alan Turing", active: true },
  { id: "user-3", fullName: "Retired Rita", active: false },
];

const CLIENT = { id: "client-1", firstName: "Ada", lastName: "Lovelace" };

const renderModal = (props = {}) =>
  render(
    <BuildDocumentModal
      isOpen
      onClose={vi.fn()}
      onStartCreating={vi.fn()}
      clientData={CLIENT}
      {...props}
    />
  );

const boxes = () => Array.from(document.body.querySelectorAll(".input-group"));

const box = (label) =>
  boxes().find(
    (group) => group.querySelector("label")?.textContent.replace("*", "").trim() === label
  );

const value = (label) => box(label).querySelector("input").value;

const titleInput = () => box("Document/Report Title").querySelector("input");

const chooseApprover = (label) => {
  const input = box("Approver/Supervisor").querySelector("input");
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  const option = Array.from(document.body.querySelectorAll(".rs__option")).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no approver "${label}"`);
  fireEvent.click(option);
};

const start = () => fireEvent.click(document.body.querySelector('button[type="submit"]'));

const settle = () => act(async () => {});

beforeEach(() => {
  vi.clearAllMocks();
  auth.tenantId = "tenant-1";
  auth.userId = "user-9";
  route.tenantClientId = "tc-1";
  api.GetTenantStaffByTenantId.mockResolvedValue({ data: { data: STAFF } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening the modal", () => {
  it("shows the four metadata fields", async () => {
    renderModal();
    await settle();
    expect(screen.getByText("Build a new document")).toBeInTheDocument();
    expect(box("Document/Report Title")).toBeTruthy();
    expect(box("Client")).toBeTruthy();
    expect(box("Creator")).toBeTruthy();
    expect(box("Approver/Supervisor")).toBeTruthy();
  });

  it("renders nothing while closed and asks for no staff", () => {
    render(
      <BuildDocumentModal
        isOpen={false}
        onClose={vi.fn()}
        onStartCreating={vi.fn()}
        clientData={CLIENT}
      />
    );
    expect(document.body.querySelector(".modal-overlay")).toBeNull();
    expect(api.GetTenantStaffByTenantId).not.toHaveBeenCalled();
  });

  it("asks for no staff until the tenant is known", async () => {
    auth.tenantId = "";
    renderModal();
    await settle();
    expect(api.GetTenantStaffByTenantId).not.toHaveBeenCalled();
  });

  it("starts with an empty title when there is no template", async () => {
    renderModal();
    await settle();
    expect(titleInput()).toHaveValue("");
  });

  it("seeds the title from the template it was handed", async () => {
    renderModal({ templateData: TEMPLATE });
    await settle();
    expect(titleInput()).toHaveValue("Behaviour Plan");
  });

  it("leaves the title empty for a template with no name", async () => {
    renderModal({ templateData: { sections: [] } });
    await settle();
    expect(titleInput()).toHaveValue("");
  });
});

describe("the auto-filled boxes", () => {
  it("fills the client name and leaves the box read-only", async () => {
    renderModal();
    await settle();
    expect(value("Client")).toBe("Ada Lovelace");
    expect(box("Client").querySelector("input")).toBeDisabled();
  });

  it("says so when there is no client to fill in", async () => {
    renderModal({ clientData: null });
    await settle();
    expect(value("Client")).toBe("Auto-populated");
  });

  it("copes with a client who has only one of the two names", async () => {
    renderModal({ clientData: { id: "c2", firstName: "Ada" } });
    await settle();
    expect(value("Client")).toBe("Ada");
  });

  it("fills the creator from the signed-in member of staff", async () => {
    renderModal();
    await settle();
    expect(value("Creator")).toBe("Grace Hopper");
  });

  it("leaves the creator unfilled when the user is not on the staff list", async () => {
    auth.userId = "someone-else";
    renderModal();
    await settle();
    expect(value("Creator")).toBe("Auto-populated");
  });

  it("leaves the creator unfilled when there is no signed-in user", async () => {
    auth.userId = "";
    renderModal();
    await settle();
    expect(value("Creator")).toBe("Auto-populated");
  });
});

describe("the approver picker", () => {
  it("offers every active member of staff", async () => {
    renderModal();
    await settle();
    const input = box("Approver/Supervisor").querySelector("input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(
      Array.from(document.body.querySelectorAll(".rs__option")).map((o) => o.textContent)
    ).toEqual(["Grace Hopper", "Alan Turing"]);
  });

  it("hints at where to add staff when the tenant has none", async () => {
    api.GetTenantStaffByTenantId.mockResolvedValue({ data: {} });
    renderModal();
    await settle();
    fireEvent.keyDown(box("Approver/Supervisor").querySelector("input"), {
      key: "ArrowDown",
    });
    expect(
      screen.getByText("No staff found. Create one in Organisation → Staff & Teams.")
    ).toBeInTheDocument();
  });

  it("logs a failed staff lookup and carries on with an empty list", async () => {
    api.GetTenantStaffByTenantId.mockRejectedValue(new Error("boom"));
    renderModal();
    await settle();
    expect(console.error).toHaveBeenCalledWith("Failed to fetch staff:", expect.any(Error));
    expect(value("Creator")).toBe("Auto-populated");
  });
});

describe("starting the document", () => {
  const startWith = async (props = {}) => {
    const onStartCreating = vi.fn();
    const onClose = vi.fn();
    renderModal({ onStartCreating, onClose, ...props });
    await settle();
    return { onStartCreating, onClose };
  };

  it("hands over the metadata and closes", async () => {
    const { onStartCreating, onClose } = await startWith();
    fireEvent.change(titleInput(), { target: { value: "Intake Report" } });
    chooseApprover("Alan Turing");
    start();

    expect(onStartCreating).toHaveBeenCalledTimes(1);
    const sent = onStartCreating.mock.calls[0][0];
    expect(sent.mode).toBe("fromScratch");
    expect(sent.metadata).toMatchObject({
      documentTitle: "Intake Report",
      approver: "Alan Turing",
      approverId: "user-2",
      createdBy: "Grace Hopper",
      creatorId: "user-9",
      client: { name: "Ada Lovelace", initials: "AL" },
      clientTenantId: "tc-1",
      tenantId: "tenant-1",
    });
    expect(sent.metadata.clientData).toEqual({ client: CLIENT });
    expect(sent.formData).toEqual({ activeSections: [], sectionData: {} });
    expect(onClose).toHaveBeenCalled();
  });

  it("falls back to the client's own id when the route has none", async () => {
    route.tenantClientId = undefined;
    const { onStartCreating } = await startWith();
    fireEvent.change(titleInput(), { target: { value: "T" } });
    start();
    expect(onStartCreating.mock.calls[0][0].metadata.clientTenantId).toBe("client-1");
  });

  it("sends empty client data and two question marks when there is no client", async () => {
    const { onStartCreating } = await startWith({ clientData: null });
    fireEvent.change(titleInput(), { target: { value: "T" } });
    start();

    const { metadata } = onStartCreating.mock.calls[0][0];
    expect(metadata.clientData).toEqual({});
    expect(metadata.client).toEqual({ name: "", initials: "??" });
  });

  it("keeps the approver once chosen, since the picker offers no way to clear it", async () => {
    // The select is not clearable and its clear indicator is hidden, so the
    // "no such member of staff" arm of the name lookup cannot be reached from
    // the UI; backspacing leaves the choice standing.
    const { onStartCreating } = await startWith();
    fireEvent.change(titleInput(), { target: { value: "T" } });
    chooseApprover("Alan Turing");
    fireEvent.keyDown(box("Approver/Supervisor").querySelector("input"), {
      key: "Backspace",
    });
    start();
    expect(onStartCreating.mock.calls[0][0].metadata).toMatchObject({
      approver: "Alan Turing",
      approverId: "user-2",
    });
  });

  it("swaps one approver for another", async () => {
    const { onStartCreating } = await startWith();
    chooseApprover("Alan Turing");
    chooseApprover("Grace Hopper");
    start();
    expect(onStartCreating.mock.calls[0][0].metadata).toMatchObject({
      approver: "Grace Hopper",
      approverId: "user-9",
    });
  });

  it("starts even though nothing has been filled in", async () => {
    // ReusableModal has no `primaryButtonDisabled` prop, so the guard this
    // modal passes has no effect. Asserted as it behaves today.
    const { onStartCreating } = await startWith();
    start();
    expect(onStartCreating).toHaveBeenCalledTimes(1);
    expect(onStartCreating.mock.calls[0][0].metadata).toMatchObject({
      documentTitle: "",
      approverId: "",
      approver: "",
    });
  });

  it("closes without starting anything from Cancel", async () => {
    const { onStartCreating, onClose } = await startWith();
    fireEvent.click(document.body.querySelector(".modal-btn-secondary"));
    expect(onClose).toHaveBeenCalled();
    expect(onStartCreating).not.toHaveBeenCalled();
  });
});

describe("a document built from a template", () => {
  const startFromTemplate = async (templateData) => {
    const onStartCreating = vi.fn();
    renderModal({ templateData, onStartCreating });
    await settle();
    start();
    return onStartCreating.mock.calls[0][0];
  };

  it("reports the template mode", async () => {
    const sent = await startFromTemplate(TEMPLATE);
    expect(sent.mode).toBe("fromTemplate");
  });

  it("turns each known section label into its own id", async () => {
    const sent = await startFromTemplate(TEMPLATE);
    expect(sent.formData.activeSections).toEqual([
      "clientInformation",
      "goalsTargets",
      "somethingcustom",
      "crisisSafety",
    ]);
  });

  it("unwraps a section that stores its content as items", async () => {
    const sent = await startFromTemplate(TEMPLATE);
    expect(sent.formData.sectionData.goalsTargets).toEqual([{ goal: "Sit still" }]);
  });

  it("keeps a plain content object as it is", async () => {
    const sent = await startFromTemplate(TEMPLATE);
    expect(sent.formData.sectionData.clientInformation).toEqual({ notes: "hello" });
  });

  it("gives a section with no content an empty object", async () => {
    const sent = await startFromTemplate(TEMPLATE);
    expect(sent.formData.sectionData.crisisSafety).toEqual({});
  });

  it("squashes an unrecognised label into an id of its own", async () => {
    const sent = await startFromTemplate(TEMPLATE);
    expect(sent.formData.sectionData.somethingcustom).toEqual({ free: "text" });
  });

  it("sends no sections at all for a template that has none", async () => {
    const sent = await startFromTemplate({ name: "Bare" });
    expect(sent.formData).toEqual({ activeSections: [], sectionData: {} });
    expect(sent.mode).toBe("fromTemplate");
  });
});

// Module-level: `templateData` sits in an effect's dependency list, so a fresh
// object on every render would re-run it forever.
const TEMPLATE = {
  name: "Behaviour Plan",
  sections: [
    { section: "Client Information", content: { notes: "hello" } },
    { section: "Goals & Targets", content: { items: [{ goal: "Sit still" }] } },
    { section: "Something Custom", content: { free: "text" } },
    { section: "Crisis & Safety Plan" },
  ],
};
