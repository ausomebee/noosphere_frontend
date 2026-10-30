import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AddStaffModal from "../Components/ReusableModal/OrganizationModal/AddStaffModal";
import authReducer from "../ReduxStore/features/authentication";
import staffFormDraftReducer from "../ReduxStore/features/AddStaffDraftSlice";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The edges of the new/edit staff modal that driving it forward tab by tab never
 * reaches: what it does with a modal that is closed, how it rebuilds a form from
 * a saved draft (either the `staffFormDraft` slice or the persisted `formDrafts`
 * entry), and the corners of the upload area -- the icon per file type, the
 * size unit, the simulated progress bar and what removing a rejected file does.
 *
 * The icon packs are mocked down to marker elements: the upload list picks a
 * different react-icons component per extension and two SVGs are otherwise
 * indistinguishable in the DOM.
 *
 * The upload area's progress is a `setInterval` simulation rather than real
 * upload progress, so the tests that watch it run on fake timers with
 * `shouldAdvanceTime` so `waitFor` still works around them.
 */

const api = vi.hoisted(() => ({
  income: vi.fn(),
  deductions: vi.fn(),
  roles: vi.fn(),
  upload: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("../api/payrollApi", () => ({
  default: {
    GetIncomeItemsByTenantId: api.income,
    GetDeductionsByTenantId: api.deductions,
  },
}));
vi.mock("../api/roleApi", () => ({
  default: { GetAllRolesByTenantId: api.roles },
}));
vi.mock("../api/ImageUpload", () => ({ default: { UploadImage: api.upload } }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: api.toast,
  showApiError: vi.fn(),
}));

vi.mock("react-icons/bs", () => ({
  BsCloudUpload: () => <span data-icon="cloud" />,
  BsFileEarmarkPdf: () => <span data-icon="pdf" />,
  BsFileEarmarkPlay: () => <span data-icon="gif" />,
}));
vi.mock("react-icons/fa", () => ({
  FaRegFile: () => <span data-icon="generic" />,
  FaPhotoVideo: () => <span data-icon="video" />,
  FaImage: () => <span data-icon="image" />,
  FaCheckCircle: () => <span data-icon="check" />,
  FaPlus: () => <span data-icon="plus" />,
}));

const roles = [
  { id: "r1", name: "BCBA" },
  { id: "r2", name: "RBT" },
];

// A saved draft as the slice holds it: payroll nested, documents in the
// {filename,url} shape the debounced writer produces.
const savedDraft = (over = {}) => ({
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  phoneNumber: "+1 555 123 4567",
  DOB: "1980-12-09T00:00:00.000Z",
  staffRole: "r1",
  country: "UK",
  // Stored as the region code, which normalizeState expands back to its name.
  state: "ABE",
  active: true,
  ...over,
});

const makeStore = ({ user = {}, draft, formDraft } = {}) =>
  configureStore({
    reducer: {
      authentication: authReducer,
      staffFormDraft: staffFormDraftReducer,
      formDrafts: formDraftsReducer,
    },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "rt",
        user: {
          id: "u1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          ...user,
        },
      },
      // `formData: {}` is the "no draft" case: the modal only restores a draft
      // whose object has keys.
      staffFormDraft: { formData: draft || {} },
      formDrafts: formDraft ? { "add-staff": formDraft } : {},
    },
  });

const renderModal = ({ user, draft, formDraft, ...props } = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const store = makeStore({ user, draft, formDraft });
  const view = render(
    <Provider store={store}>
      <AddStaffModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        mode="add"
        {...props}
      />
    </Provider>
  );
  return { ...view, onSubmit, onClose, store };
};

// Labels are plain siblings with a "*" span and no htmlFor, so walk up from the
// label text rather than querying by accessible name.
const groupFor = (labelText, index = 0) => {
  const matches = Array.from(
    document.body.querySelectorAll("label.input-group-label")
  ).filter((l) => l.textContent.replace("*", "").trim() === labelText);
  if (!matches[index]) throw new Error(`no field labelled "${labelText}"`);
  return matches[index].closest(".input-group");
};

const controlFor = (labelText, index = 0) =>
  groupFor(labelText, index).querySelector("input");

const tab = (name) => screen.getByRole("tab", { name });
const primary = () =>
  document.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.querySelector(".modal-btn-secondary");
const fileInput = () => document.querySelector(".upload-input");
const attach = (files) => fireEvent.change(fileInput(), { target: { files } });
const fileNames = () =>
  Array.from(document.querySelectorAll(".file-name")).map((n) => n.textContent);
const icons = () =>
  Array.from(document.querySelectorAll(".file-info [data-icon]")).map((n) =>
    n.getAttribute("data-icon")
  );

const sized = (name, bytes) => {
  const file = new File(["x"], name);
  Object.defineProperty(file, "size", { value: bytes });
  return file;
};

let errorSpy;

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  api.income.mockResolvedValue({ data: [{ id: "i1", name: "Bonus" }] });
  api.deductions.mockResolvedValue({ data: [{ id: "d1", name: "Pension" }] });
  api.roles.mockResolvedValue({ data: { data: roles } });
  api.upload.mockResolvedValue({
    success: true,
    data: [{ filename: "cert.pdf", url: "https://files/cert.pdf" }],
  });
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("a modal that is not open", () => {
  it("renders nothing and clears the saved draft", () => {
    const { store } = renderModal({
      isOpen: false,
      draft: savedDraft(),
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(store.getState().staffFormDraft.formData.fullName).toBe("");
  });

  it("forgets the tab it was left on when it closes", async () => {
    const { rerender, store, onClose, onSubmit } = renderModal();
    fireEvent.click(tab("Documents"));
    expect(primary().textContent).toBe("Save");

    const closed = (
      <Provider store={store}>
        <AddStaffModal
          isOpen={false}
          onClose={onClose}
          onSubmit={onSubmit}
          mode="add"
        />
      </Provider>
    );
    rerender(closed);
    rerender(
      <Provider store={store}>
        <AddStaffModal isOpen onClose={onClose} onSubmit={onSubmit} mode="add" />
      </Provider>
    );
    await waitFor(() =>
      expect(tab("Basic Information").getAttribute("aria-selected")).toBe("true")
    );
  });
});

describe("restoring the saved draft", () => {
  it("puts the typed values back", () => {
    renderModal({ draft: savedDraft() });
    expect(controlFor("Full Name")).toHaveValue("Ada Lovelace");
    expect(controlFor("Email")).toHaveValue("ada@example.com");
    // A timestamp is narrowed back to the date the input can show.
    expect(controlFor("Date of Birth")).toHaveValue("1980-12-09");
  });

  it("expands a country code and the region code stored under it", () => {
    renderModal({ draft: savedDraft() });
    expect(groupFor("Country").textContent).toContain("United Kingdom");
    expect(groupFor("State").textContent).toContain("Aberdeen City");
  });

  it("blanks a date of birth the draft never held", () => {
    renderModal({ draft: savedDraft({ DOB: null }) });
    expect(controlFor("Date of Birth")).toHaveValue("");
  });

  it("honours an inactive staff member and a missing phone number", () => {
    renderModal({ draft: savedDraft({ active: false, phoneNumber: null }) });
    expect(document.querySelector(".switch input")).not.toBeChecked();
    expect(controlFor("Phone Number")).toHaveValue("");
  });

  it("defaults an undecided active flag back to active", () => {
    renderModal({ draft: savedDraft({ active: null }) });
    expect(document.querySelector(".switch input")).toBeChecked();
  });

  it("starts the licences tab empty even when the draft holds rows", () => {
    renderModal({
      draft: savedDraft({
        licenses: [{ licenseName: "RBT", licenseNumber: "R-1" }],
      }),
    });
    fireEvent.click(tab("Licenses"));
    expect(screen.queryByText("Remove License")).not.toBeInTheDocument();
  });

  it("rebuilds pay and deduction rows saved as bare ids", async () => {
    renderModal({
      draft: savedDraft({
        payroll: { otherPays: ["i1"], deductions: ["d1"] },
      }),
    });
    fireEvent.click(tab("Payroll Settings"));
    await waitFor(() => expect(groupFor("Pay Type").textContent).toContain("Bonus"));
    expect(groupFor("Deduction Type").textContent).toContain("Pension");
  });

  it("rebuilds pay and deduction rows saved as objects", async () => {
    renderModal({
      draft: savedDraft({
        payroll: { otherPays: [{ type: "i1" }], deductions: [{ type: "d1" }] },
      }),
    });
    fireEvent.click(tab("Payroll Settings"));
    await waitFor(() => expect(groupFor("Pay Type").textContent).toContain("Bonus"));
    expect(groupFor("Deduction Type").textContent).toContain("Pension");
  });

  it("leaves the pay rows empty when the draft holds no payroll", () => {
    renderModal({ draft: savedDraft() });
    fireEvent.click(tab("Payroll Settings"));
    expect(screen.queryByText("Pay Type")).not.toBeInTheDocument();
    expect(screen.queryByText("Deduction Type")).not.toBeInTheDocument();
  });

  it("restores the compensation type and rate the draft held", async () => {
    renderModal({
      draft: savedDraft({
        payroll: { paymentSchedule: "SALARIED", ratePerHour: "5200", minimumHours: "160" },
      }),
    });
    fireEvent.click(tab("Payroll Settings"));
    await waitFor(() =>
      expect(groupFor("Compensation Type").textContent).toContain("Salaried")
    );
    expect(controlFor("Pay Rate (Salary)")).toHaveValue(5200);
    expect(controlFor("Minimum Number of Hours per Month")).toHaveValue(160);
  });

  it("lists documents the draft saved as a filename and url", () => {
    renderModal({
      draft: savedDraft({
        documents: [{ id: "doc1", filename: "contract.pdf", url: "https://files/c.pdf" }],
      }),
    });
    fireEvent.click(tab("Documents"));
    expect(fileNames()).toEqual(["contract.pdf • Unknown"]);
  });

  it("names a saved document that lost its filename", () => {
    renderModal({
      draft: savedDraft({ documents: [{ id: "doc1", url: "https://files/c.pdf" }] }),
    });
    fireEvent.click(tab("Documents"));
    expect(fileNames()).toEqual(["Unknown File • Unknown"]);
  });

  it("ignores a documents value that is not a list", () => {
    renderModal({ draft: savedDraft({ documents: "contract.pdf" }) });
    fireEvent.click(tab("Documents"));
    expect(fileNames()).toEqual([]);
  });
});

describe("restoring the persisted form draft", () => {
  const fresh = (values) => ({ values, savedAt: Date.now() });

  it("migrates a country saved in an older encoding", async () => {
    renderModal({
      formDraft: fresh({ fullName: "Ada", country: "UK", state: "Aberdeen City" }),
    });
    // The hook defers its reset so it wins over the modal's own reset on open.
    await waitFor(() => expect(controlFor("Full Name")).toHaveValue("Ada"));
    expect(groupFor("Country").textContent).toContain("United Kingdom");
    expect(groupFor("State").textContent).toContain("Aberdeen City");
  });

  it("drops a draft that has expired instead of restoring it", async () => {
    const { store } = renderModal({
      formDraft: {
        values: { fullName: "Stale Ada" },
        savedAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
      },
    });
    await waitFor(() => expect(store.getState().formDrafts["add-staff"]).toBeUndefined());
    expect(controlFor("Full Name")).toHaveValue("");
  });
});

describe("editing an existing staff member", () => {
  const initialData = {
    fullName: "Grace Hopper",
    email: "grace@example.com",
    licenses: [],
    documents: [{ id: "doc1", documentsUrl: { url: "https://files/c.pdf" } }],
  };

  it("shows no licence rows for a staff member who has none", () => {
    renderModal({ mode: "edit", initialData });
    fireEvent.click(tab("Licenses"));
    expect(screen.queryByText("Remove License")).not.toBeInTheDocument();
  });

  it("names a stored document that has no filename", () => {
    renderModal({ mode: "edit", initialData });
    fireEvent.click(tab("Documents"));
    expect(fileNames()).toEqual(["Unknown File • Unknown"]);
  });

  it("prefers the staff member's own record over any saved draft", () => {
    renderModal({ mode: "edit", initialData, draft: savedDraft() });
    expect(controlFor("Full Name")).toHaveValue("Grace Hopper");
  });
});

describe("moving between tabs by hand", () => {
  it("lets a tab header skip the validation the Next button runs", () => {
    renderModal();
    fireEvent.click(tab("Documents"));
    expect(tab("Documents").getAttribute("aria-selected")).toBe("true");
    expect(api.toast).not.toHaveBeenCalled();
    expect(primary().textContent).toBe("Save");
    expect(secondary().textContent).toBe("Previous");
  });

  it("keeps offering Next in edit mode even on the last tab", () => {
    renderModal({ mode: "edit", initialData: { fullName: "Grace Hopper" } });
    fireEvent.click(tab("Documents"));
    expect(primary().textContent).toBe("Next");
  });
});

describe("the upload area", () => {
  const openDocuments = (props) => {
    const view = renderModal(props);
    fireEvent.click(tab("Documents"));
    return view;
  };

  it("picks an icon per file type and falls back for the rest", async () => {
    openDocuments();
    attach([
      new File(["x"], "report.pdf"),
      new File(["x"], "clip.mp4"),
      new File(["x"], "loop.gif"),
      new File(["x"], "shot.png"),
      new File(["x"], "notes.txt"),
      new File(["x"], ""),
    ]);
    await waitFor(() => expect(api.upload).toHaveBeenCalled());
    expect(icons()).toEqual(["pdf", "video", "gif", "image", "generic", "generic"]);
  });

  it("names a file that arrives without one", async () => {
    openDocuments();
    attach([new File(["x"], "")]);
    await waitFor(() => expect(api.upload).toHaveBeenCalled());
    expect(fileNames()[0]).toContain("Unknown File");
  });

  it("shows a small file in kilobytes and a large one in megabytes", async () => {
    openDocuments();
    attach([sized("small.pdf", 2048), sized("big.pdf", 2 * 1024 * 1024)]);
    await waitFor(() => expect(api.upload).toHaveBeenCalled());
    expect(fileNames()).toEqual(["small.pdf • 2 KB", "big.pdf • 2.0 MB"]);
  });

  it("reports a rejected upload that gives no reason", async () => {
    api.upload.mockResolvedValue({ success: false });
    openDocuments();
    attach([new File(["x"], "cert.pdf")]);
    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Failed to upload file(s): Upload failed",
        type: "error",
      })
    );
  });

  it("keeps a rejected file out of the payload but still lets Save through", async () => {
    // The modal asks ReusableModal to disable the primary button while an
    // upload has failed, but ReusableModal takes no such prop -- so Save stays
    // live. This asserts the behaviour as it stands today.
    openDocuments();
    attach([sized("huge.mp4", 60 * 1024 * 1024)]);
    await waitFor(() =>
      expect(screen.getByText("File size exceeds 50MB limit")).toBeInTheDocument()
    );
    expect(api.upload).not.toHaveBeenCalled();
    expect(primary()).not.toBeDisabled();
  });

  it("clears a rejected file, which never had a url to match on", async () => {
    openDocuments();
    attach([sized("huge.mp4", 60 * 1024 * 1024)]);
    await waitFor(() => expect(document.querySelector(".retry-file")).toBeTruthy());
    fireEvent.click(document.querySelector(".remove-file"));
    expect(api.toast).toHaveBeenCalledWith({
      message: "File huge.mp4 removed",
      type: "info",
    });
    await waitFor(() => expect(document.querySelector(".file-item")).toBeNull());
  });

  it("runs the progress bar up to a finished tick", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      openDocuments();
      attach([new File(["x"], "cert.pdf")]);
      await waitFor(() => expect(api.upload).toHaveBeenCalled());
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(document.querySelector(".progress-text").textContent).toBe("100%");
      expect(document.querySelector('[data-icon="check"]')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("announces the end of a retried upload", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      openDocuments();
      attach([sized("huge.mp4", 60 * 1024 * 1024)]);
      await waitFor(() => expect(document.querySelector(".retry-file")).toBeTruthy());
      fireEvent.click(document.querySelector(".retry-file"));
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(api.toast).toHaveBeenCalledWith({
        message: "Retry upload simulation completed",
        type: "success",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("more of the upload area", () => {
  const openDocuments = (props) => {
    const view = renderModal(props);
    fireEvent.click(tab("Documents"));
    return view;
  };

  it("names an oversized file that arrives without one", async () => {
    openDocuments();
    const nameless = new File(["x"], "");
    Object.defineProperty(nameless, "size", { value: 60 * 1024 * 1024 });
    attach([nameless]);

    await waitFor(() =>
      expect(screen.getByText("File size exceeds 50MB limit")).toBeInTheDocument()
    );
    expect(fileNames()[0]).toContain("Unknown File");
  });

  it("uploads the acceptable half of a mixed batch and keeps the rest listed", async () => {
    openDocuments();
    attach([new File(["x"], "cert.pdf"), sized("huge.mp4", 60 * 1024 * 1024)]);

    await waitFor(() => expect(api.upload).toHaveBeenCalledTimes(1));
    expect(fileNames()[0]).toContain("cert.pdf");
    expect(fileNames()[1]).toContain("huge.mp4");
    expect(screen.getByText("File size exceeds 50MB limit")).toBeInTheDocument();
  });

  it("advances only the file being uploaded and leaves its neighbour alone", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      openDocuments();
      // The oversized one never starts a progress run, so its bar has to stay
      // where it was while the good one climbs.
      attach([new File(["x"], "cert.pdf"), sized("huge.mp4", 60 * 1024 * 1024)]);
      await waitFor(() => expect(api.upload).toHaveBeenCalled());
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(document.querySelector(".progress-text").textContent).toBe("100%");
      expect(document.querySelectorAll(".progress-text")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries one rejected file without disturbing the other", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      openDocuments();
      attach([
        sized("huge.mp4", 60 * 1024 * 1024),
        sized("enormous.mp4", 70 * 1024 * 1024),
      ]);
      await waitFor(() =>
        expect(document.querySelectorAll(".retry-file")).toHaveLength(2)
      );
      fireEvent.click(document.querySelectorAll(".retry-file")[0]);
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Only the retried row loses its error; the other keeps its message.
      expect(document.querySelectorAll(".retry-file")).toHaveLength(1);
      expect(
        screen.getAllByText("File size exceeds 50MB limit")
      ).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("what the primary button offers", () => {
  // `hasChanges` is only ever set back to false -- nothing in the modal turns
  // it on -- so an edit is stuck on "Next" no matter what is typed. Pinned as
  // current behaviour; see the report.
  it("keeps saying Next on an edit even after a field is changed", async () => {
    renderModal({
      mode: "edit",
      initialValues: {
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        phoneNumber: "+1 555 123 4567",
        staffRole: "r1",
      },
    });
    expect(primary()).toHaveTextContent("Next");

    fireEvent.change(controlFor("Full Name"), {
      target: { value: "Ada Byron" },
    });
    await waitFor(() => expect(controlFor("Full Name")).toHaveValue("Ada Byron"));
    expect(primary()).toHaveTextContent("Next");
  });
});

describe("saving after the form has already complained", () => {
  const fillBasicInfo = async () => {
    const typeIn = (label, value) =>
      fireEvent.change(controlFor(label), { target: { value } });
    typeIn("Full Name", "Ada Lovelace");
    typeIn("Email", "ada@example.com");
    typeIn("Phone Number", "+1 555 123 4567");
    typeIn("NPI", "1234567890");
    await waitFor(() =>
      expect(groupFor("Staff Role").textContent).toContain("Staff Role")
    );
    const roleInput = controlFor("Staff Role");
    fireEvent.focus(roleInput);
    fireEvent.keyDown(roleInput, { key: "ArrowDown", keyCode: 40 });
    const menus = document.body.querySelectorAll(".rs__menu");
    fireEvent.click(
      Array.from(menus[menus.length - 1].querySelectorAll(".rs__option")).find(
        (o) => o.textContent === "BCBA"
      )
    );
  };

  const fillPayroll = () => {
    const compensation = controlFor("Compensation Type");
    fireEvent.focus(compensation);
    fireEvent.keyDown(compensation, { key: "ArrowDown", keyCode: 40 });
    const menus = document.body.querySelectorAll(".rs__menu");
    fireEvent.click(
      Array.from(menus[menus.length - 1].querySelectorAll(".rs__option")).find(
        (o) => o.textContent === "Hourly"
      )
    );
    fireEvent.change(controlFor("Pay Rate (per hour)"), {
      target: { value: "45.5" },
    });
  };

  it("refuses the save that follows a complaint the user has already fixed", async () => {
    // The Save handler closes over the errors of the render that built it, so
    // the click straight after a fix still sees the old error map and stops.
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());
    await waitFor(() => expect(screen.getByRole("tab", { name: "Basic Information" })).toHaveAttribute("aria-selected", "true"));

    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Please fix form errors before submitting",
        type: "error",
      })
    );
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(primary());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("falls back to house copy when a refused save says nothing", async () => {
    const { onSubmit, onClose } = renderModal();
    onSubmit.mockRejectedValue({});
    await fillBasicInfo();
    fireEvent.click(tab("Payroll Settings"));
    fillPayroll();
    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Save failed",
        type: "error",
      })
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("option endpoints that answer without a list", () => {
  it("offers no pay types when the income response carries no data", async () => {
    api.income.mockResolvedValue({});
    renderModal();
    await waitFor(() => expect(api.income).toHaveBeenCalled());
    fireEvent.click(tab("Payroll Settings"));
    fireEvent.click(screen.getByText("Add Other Pay"));

    const input = controlFor("Pay Type");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(document.body.querySelectorAll(".rs__option")).toHaveLength(0);
  });

  it("offers no deductions when the deduction response carries no data", async () => {
    api.deductions.mockResolvedValue({});
    renderModal();
    await waitFor(() => expect(api.deductions).toHaveBeenCalled());
    fireEvent.click(tab("Payroll Settings"));
    fireEvent.click(screen.getByText("Add Deduction"));

    const input = controlFor("Deduction Type");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(document.body.querySelectorAll(".rs__option")).toHaveLength(0);
  });

  it("names a deduction that has none", async () => {
    api.deductions.mockResolvedValue({ data: [{ id: "d1" }] });
    renderModal();
    await waitFor(() => expect(api.deductions).toHaveBeenCalled());
    fireEvent.click(tab("Payroll Settings"));
    fireEvent.click(screen.getByText("Add Deduction"));

    const input = controlFor("Deduction Type");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(screen.getByText("Unknown Deduction")).toBeInTheDocument();
  });

  it("offers no roles when the role response carries neither envelope", async () => {
    api.roles.mockResolvedValue({});
    renderModal();
    await waitFor(() => expect(api.roles).toHaveBeenCalled());

    const input = controlFor("Staff Role");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    expect(document.body.querySelectorAll(".rs__option")).toHaveLength(0);
  });
});

describe("a draft whose pay rows hold nothing", () => {
  // A row saved as `null` throws on restore, so the blank string is the only
  // empty shape the modal survives; see the report.
  it("rebuilds an empty row for a pay and a deduction saved as a blank", async () => {
    renderModal({
      draft: savedDraft({
        payroll: { otherPays: [""], deductions: [""] },
      }),
    });
    fireEvent.click(tab("Payroll Settings"));

    await waitFor(() => expect(screen.getByText("Pay Type")).toBeInTheDocument());
    expect(controlFor("Pay Type")).toHaveValue("");
    expect(controlFor("Deduction Type")).toHaveValue("");
  });
});

describe("removing a file that already reached the server", () => {
  it("drops it by the url the upload wrote back", async () => {
    const { onSubmit } = renderModal();
    fireEvent.click(tab("Documents"));
    attach([new File(["x"], "cert.pdf")]);
    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "1 file(s) uploaded successfully",
        type: "success",
      })
    );

    fireEvent.click(document.querySelector(".remove-file"));
    await waitFor(() => expect(document.querySelector(".file-item")).toBeNull());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("an error on a field no tab claims", () => {
  // `practiceNPI` is validated by the schema but is absent from the tab/field
  // map, so a bad NPI produces an error the modal cannot route anywhere: it
  // complains but leaves the user where they are. See the report.
  it("complains without moving the user to a tab", async () => {
    const { onSubmit } = renderModal();
    const typeIn = (label, value) =>
      fireEvent.change(controlFor(label), { target: { value } });
    typeIn("Full Name", "Ada Lovelace");
    typeIn("Email", "ada@example.com");
    typeIn("Phone Number", "+1 555 123 4567");
    typeIn("NPI", "123");
    await waitFor(() =>
      expect(groupFor("Staff Role").textContent).toContain("Staff Role")
    );
    const roleInput = controlFor("Staff Role");
    fireEvent.focus(roleInput);
    fireEvent.keyDown(roleInput, { key: "ArrowDown", keyCode: 40 });
    const menus = document.body.querySelectorAll(".rs__menu");
    fireEvent.click(
      Array.from(menus[menus.length - 1].querySelectorAll(".rs__option")).find(
        (o) => o.textContent === "BCBA"
      )
    );

    // Payroll has to be valid too, or its own error would give the modal a tab
    // to jump to and hide the one it cannot place.
    fireEvent.click(tab("Payroll Settings"));
    const compensation = controlFor("Compensation Type");
    fireEvent.focus(compensation);
    fireEvent.keyDown(compensation, { key: "ArrowDown", keyCode: 40 });
    const payMenus = document.body.querySelectorAll(".rs__menu");
    fireEvent.click(
      Array.from(
        payMenus[payMenus.length - 1].querySelectorAll(".rs__option")
      ).find((o) => o.textContent === "Hourly")
    );
    fireEvent.change(controlFor("Pay Rate (per hour)"), {
      target: { value: "45.5" },
    });

    fireEvent.click(tab("Documents"));
    fireEvent.click(primary());

    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith({
        message: "Please fix the highlighted errors before submitting",
        type: "error",
      })
    );
    expect(tab("Documents").getAttribute("aria-selected")).toBe("true");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("the active status switch", () => {
  it("turns a new staff member inactive", async () => {
    renderModal();
    const toggle = document.querySelector(".switch input");
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).not.toBeChecked());
  });
});
