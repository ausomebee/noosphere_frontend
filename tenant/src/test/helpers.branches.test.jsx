import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const toastFn = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastIsActive = vi.fn(() => false);

vi.mock("react-toastify", () => ({
  toast: Object.assign((...a) => toastFn(...a), {
    success: (...a) => toastSuccess(...a),
    error: (...a) => toastError(...a),
    isActive: (...a) => toastIsActive(...a),
  }),
}));

// exportTableToPDF loads jsPDF lazily and ends with doc.save(), which really
// writes a file. Stub both so the assertions can read the table it built and
// the suite leaves nothing behind on disk.
const pdfSave = vi.fn();
const pdfText = vi.fn();
const autoTable = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: function jsPDF() {
    return {
      internal: { pageSize: { getWidth: () => 800 } },
      setFontSize: vi.fn(),
      text: pdfText,
      save: pdfSave,
    };
  },
}));

vi.mock("jspdf-autotable", () => ({ default: (...a) => autoTable(...a) }));

import { showToast, showApiError } from "../Helper/ShowToast";
import ERROR_MESSAGES from "../Helper/errorMessages";
import { exportTableData, exportTableToPDF, printTableData } from "../utils/TableUtils";
import { formatMsgTime, formatTime, utilizationDisplay } from "../Helper/Formatters";
import { expandModulePermissions } from "../hooks/usePermissions";
import {
  lastSubmittedAtFrom,
  isChangeRequestOpen,
  sortNewestFirst,
} from "../Pages/Client/Pipeline/ClientPanel/ClinentSubs/ClinicalSubs/changeRequestStatus";
import authReducer, {
  AdminLogin,
  OnboardAdmin,
  updateAccessToken,
  setTokens,
} from "../ReduxStore/features/authentication";
import formBuilderReducer, {
  addElement,
  updateElement,
  toggleRequired,
  addOption,
  removeOption,
  updateOption,
  loadForm,
} from "../ReduxStore/features/formBuilderSlice";
import roleDraftReducer, {
  togglePermission,
  setGrantAll,
} from "../ReduxStore/features/roleDraftSlice";
import formDraftsReducer, { setFormDraft } from "../ReduxStore/features/formDraftsSlice";
import settingsReducer, { setSettings } from "../ReduxStore/features/generalSettingsSlice";
import Button from "../Components/Button/Button";
import SectionLoader from "../Components/SectionLoader";

/**
 * The long tail: one file for the small helpers and slices that each had a
 * handful of untaken arms — toast de-duplication, the CSV/PDF/print exporters'
 * keyed-versus-plain-object modes, the formatters' 24-hour and same-day paths,
 * and the draft slices' "create the nested bucket on first write" guards.
 */

beforeEach(() => {
  vi.clearAllMocks();
  toastIsActive.mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("showToast", () => {
  it("accepts a plain message and type", () => {
    showToast("Saved", "success");
    expect(toastSuccess).toHaveBeenCalledWith("Saved", expect.objectContaining({
      toastId: "success-Saved",
    }));
  });

  it("accepts the object calling convention", () => {
    showToast({ message: "Broke", type: "error" });
    expect(toastError).toHaveBeenCalledWith("Broke", expect.any(Object));
  });

  it("defaults the type for an object with only a message", () => {
    showToast({ message: "Note" });
    expect(toastFn).toHaveBeenCalledWith("Note", expect.any(Object));
  });

  it("treats an object with no message as empty", () => {
    showToast({ type: "success" });
    expect(toastSuccess).toHaveBeenCalledWith("", expect.any(Object));
  });

  it("defaults the type when only a message is passed", () => {
    showToast("Note");
    expect(toastFn).toHaveBeenCalledWith("Note", expect.any(Object));
  });

  it("treats a null message as empty rather than as an object", () => {
    showToast(null);
    expect(toastFn).toHaveBeenCalledWith("", expect.any(Object));
  });

  it("suppresses a toast that is already on screen", () => {
    toastIsActive.mockReturnValue(true);
    showToast("Saved", "success");
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe("showApiError", () => {
  it("shows the message the endpoint returned", () => {
    showApiError({ response: { data: { message: "Client already exists" } } });
    expect(toastError).toHaveBeenCalledWith("Client already exists", expect.any(Object));
  });

  it("falls back to the body's error field", () => {
    showApiError({ response: { data: { error: "Bad request body" } } });
    expect(toastError).toHaveBeenCalledWith("Bad request body", expect.any(Object));
  });

  it("uses the thrown error's own message when there is no body", () => {
    showApiError(new Error("Something specific broke"));
    expect(toastError).toHaveBeenCalledWith("Something specific broke", expect.any(Object));
  });

  it.each([
    "Request failed with status code 500",
    "Network Error",
    "timeout of 5000ms exceeded",
  ])("replaces the generic axios text %s with our own copy", (raw) => {
    showApiError(new Error(raw), "DEFAULT");
    expect(toastError).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });

  it("uses our own copy when the error carries nothing at all", () => {
    showApiError(undefined);
    expect(toastError).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });

  it("falls back to the default copy for an unknown message key", () => {
    showApiError(new Error("Network Error"), "NO_SUCH_KEY");
    expect(toastError).toHaveBeenCalledWith(ERROR_MESSAGES.DEFAULT, expect.any(Object));
  });
});

describe("exportTableData", () => {
  let anchors;

  beforeEach(() => {
    anchors = [];
    global.URL.createObjectURL = vi.fn(() => "blob:x");
    const orig = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === "a") {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });
  });

  it("writes a keyed CSV when columns are supplied", () => {
    exportTableData(
      [{ name: "Ada", status: "Active" }, { name: "Bob" }],
      [
        { key: "name", header: "Name" },
        { key: "status", header: "Status" },
      ],
      "people.csv"
    );
    expect(anchors[0].download).toBe("people.csv");
    expect(anchors[0].click).toHaveBeenCalled();
  });

  it("writes a key/value CSV when there are no columns", () => {
    exportTableData({ total: 3, open: 1 });
    expect(anchors[0].download).toBe("export.csv");
  });
});

describe("exportTableToPDF", () => {
  it("builds a keyed table when columns are supplied", async () => {
    await exportTableToPDF(
      [{ name: "Ada", status: "Active" }, { name: "Bob" }],
      [
        { key: "name", header: "Name" },
        { key: "status", header: "Status" },
      ],
      "people.pdf",
      "People"
    );
    const [, options] = autoTable.mock.calls[0];
    expect(options.head).toEqual([["S/N", "Name", "Status"]]);
    // A row missing the column's key renders blank rather than "undefined".
    expect(options.body).toEqual([
      ["1", "Ada", "Active"],
      ["2", "Bob", ""],
    ]);
    expect(pdfText).toHaveBeenCalledWith("People", 20, 15);
    expect(pdfSave).toHaveBeenCalledWith("people.pdf");
  });

  it("builds a key/value table when there are none, stringifying object values", async () => {
    await exportTableToPDF({ total: 3, breakdown: { a: 1 } });
    const [, options] = autoTable.mock.calls[0];
    expect(options.head).toEqual([["S/N", "Key", "Value"]]);
    expect(options.body).toEqual([
      ["1", "total", 3],
      ["2", "breakdown", '{"a":1}'],
    ]);
    expect(pdfText).toHaveBeenCalledWith("", 20, 15);
    expect(pdfSave).toHaveBeenCalledWith("export.pdf");
  });
});

describe("printTableData", () => {
  let printWindow;

  beforeEach(() => {
    printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      print: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(printWindow);
  });

  it("prints a keyed table and escapes what it writes", () => {
    printTableData(
      [{ name: "<script>alert(1)</script>", status: "Active" }],
      [
        { key: "name", header: "Name" },
        { key: "status", header: "Status" },
      ],
      "People & Co"
    );
    const html = printWindow.document.write.mock.calls[0][0];
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("People &amp; Co");
    expect(printWindow.print).toHaveBeenCalled();
  });

  it("prints a key/value table when there are no columns", () => {
    printTableData({ total: 3, breakdown: { a: 1 }, missing: null });
    const html = printWindow.document.write.mock.calls[0][0];
    expect(html).toContain("<th>Key</th>");
    expect(html).toContain("total");
  });

  it("renders a blank cell rather than 'undefined' for a missing value", () => {
    printTableData([{ name: "Ada" }], [
      { key: "name", header: "Name" },
      { key: "status", header: "Status" },
    ]);
    const html = printWindow.document.write.mock.calls[0][0];
    expect(html).not.toContain("undefined");
  });
});

describe("time formatters", () => {
  it("renders a 24-hour clock time without seconds", () => {
    expect(formatTime("09:05:00", "24-hour")).toBe("09:05");
  });

  it("rejects a time it cannot parse", () => {
    expect(formatTime("not-a-time")).toBe("N/A");
    expect(formatTime("09")).toBe("N/A");
    expect(formatTime("")).toBe("N/A");
  });

  it("shows no day label for a message sent today", () => {
    const today = new Date();
    expect(formatMsgTime(today.toISOString())).not.toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /
    );
  });

  it("prefixes the weekday for a message from another day", () => {
    const other = new Date();
    other.setDate(other.getDate() - 3);
    expect(formatMsgTime(other.toISOString())).toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /
    );
  });

  it("renders a message time on a 24-hour clock when asked", () => {
    const today = new Date();
    expect(formatMsgTime(today.toISOString(), "24-hour")).not.toMatch(/AM|PM/i);
  });

  it("returns an empty string for no date", () => {
    expect(formatMsgTime("")).toBe("");
  });
});

describe("utilizationDisplay", () => {
  it("keeps a visible sliver for any real usage", () => {
    expect(utilizationDisplay(0.2)).toEqual(
      expect.objectContaining({ width: 1.5, label: "0.2%" })
    );
  });

  it("shows '<0.1%' rather than rounding tiny usage to nothing", () => {
    expect(utilizationDisplay(0.02).label).toBe("<0.1%");
  });

  it("shows a whole percent once past one", () => {
    expect(utilizationDisplay(42.4).label).toBe("42%");
  });

  it("reports a bar of zero width for no usage", () => {
    expect(utilizationDisplay(0)).toEqual({ percent: 0, width: 0, label: "0%" });
  });

  it("clamps out-of-range and unparseable values", () => {
    expect(utilizationDisplay(140).percent).toBe(100);
    expect(utilizationDisplay(-5).percent).toBe(0);
    expect(utilizationDisplay("abc").percent).toBe(0);
  });
});

describe("expandModulePermissions", () => {
  it("adds the module-specific key for a legacy shared one", () => {
    const set = expandModulePermissions("CLIENTS", ["edit_program"]);
    expect(set.has("edit_client_program")).toBe(true);
    expect(set.has("edit_program")).toBe(true);
  });

  it("leaves a permission with no alias for that module alone", () => {
    const set = expandModulePermissions("SCHEDULER", ["edit_program"]);
    expect(set.size).toBe(1);
  });

  it("leaves an unrecognised permission alone", () => {
    const set = expandModulePermissions("CLIENTS", ["something_else"]);
    expect(set.size).toBe(1);
  });

  it("defaults to an empty set", () => {
    expect(expandModulePermissions("CLIENTS").size).toBe(0);
  });
});

describe("change request status helpers", () => {
  it("finds the latest submission and ignores unusable entries", () => {
    const at = lastSubmittedAtFrom([
      { action: "submitted", createdAt: "2026-01-01T00:00:00Z" },
      { action: "SUBMITTED", createdAt: "2026-05-01T00:00:00Z" },
      { action: "SUBMITTED" },
      { action: "APPROVED", createdAt: "2026-06-01T00:00:00Z" },
      { action: "SUBMITTED", createdAt: "not-a-date" },
      null,
    ]);
    expect(at).toBe(new Date("2026-05-01T00:00:00Z").getTime());
  });

  it("returns null when nothing was ever submitted", () => {
    expect(lastSubmittedAtFrom([])).toBeNull();
    expect(lastSubmittedAtFrom(undefined)).toBeNull();
  });

  it("treats an undated request, an unsubmitted report and an unparseable date as open", () => {
    expect(isChangeRequestOpen({}, 1)).toBe(true);
    expect(isChangeRequestOpen({ createdAt: "2026-01-01" }, null)).toBe(true);
    expect(isChangeRequestOpen({ createdAt: "nonsense" }, 1)).toBe(true);
  });

  it("closes a request raised before the last submission", () => {
    const submitted = new Date("2026-05-01T00:00:00Z").getTime();
    expect(isChangeRequestOpen({ createdAt: "2026-01-01T00:00:00Z" }, submitted)).toBe(false);
    expect(isChangeRequestOpen({ createdAt: "2026-06-01T00:00:00Z" }, submitted)).toBe(true);
  });

  it("sorts newest first and tolerates missing dates and a missing list", () => {
    const sorted = sortNewestFirst([
      { id: "a", createdAt: "2026-01-01T00:00:00Z" },
      { id: "b", createdAt: "2026-06-01T00:00:00Z" },
      { id: "c" },
      null,
    ]);
    expect(sorted[0].id).toBe("b");
    expect(sortNewestFirst(undefined)).toEqual([]);
  });
});

describe("authentication slice", () => {
  const initial = () => authReducer(undefined, { type: "@@INIT" });

  it("takes the token from either field name on login", () => {
    let s = authReducer(initial(), {
      type: AdminLogin.fulfilled.type,
      payload: { data: { token: "t1", refreshToken: "r1" } },
    });
    expect(s.token).toBe("t1");
    expect(s.refreshToken).toBe("r1");

    s = authReducer(initial(), {
      type: AdminLogin.fulfilled.type,
      payload: { data: { accessToken: "t2" } },
    });
    expect(s.token).toBe("t2");
    expect(s.refreshToken).toBeNull();
  });

  it("does the same for the onboarding response", () => {
    let s = authReducer(initial(), {
      type: OnboardAdmin.fulfilled.type,
      payload: { data: { token: "t1", refreshToken: "r1" } },
    });
    expect(s.token).toBe("t1");

    s = authReducer(initial(), {
      type: OnboardAdmin.fulfilled.type,
      payload: { data: { accessToken: "t2" } },
    });
    expect(s.token).toBe("t2");
    expect(s.refreshToken).toBeNull();
  });

  it("writes a refreshed token onto the user record only when there is one", () => {
    const signedIn = authReducer(initial(), {
      type: AdminLogin.fulfilled.type,
      payload: { data: { accessToken: "t1", fullName: "Ada" } },
    });
    expect(authReducer(signedIn, updateAccessToken("t2")).user.accessToken).toBe("t2");
    expect(authReducer(initial(), updateAccessToken("t2")).token).toBe("t2");
  });

  it("stores a token pair with and without a signed-in user", () => {
    const signedIn = authReducer(initial(), {
      type: AdminLogin.fulfilled.type,
      payload: { data: { accessToken: "t1" } },
    });
    const withUser = authReducer(
      signedIn,
      setTokens({ accessToken: "a", refreshToken: "b" })
    );
    expect(withUser.user.accessToken).toBe("a");
    expect(withUser.refreshToken).toBe("b");

    const without = authReducer(initial(), setTokens({ accessToken: "a", refreshToken: "b" }));
    expect(without.token).toBe("a");
  });
});

describe("formBuilder slice guards", () => {
  const initial = () => formBuilderReducer(undefined, { type: "@@INIT" });
  const withElement = () =>
    formBuilderReducer(
      initial(),
      addElement({ id: 1, type: "text", label: "Name", options: ["a"] })
    );

  it("fills an added element's blanks", () => {
    const s = formBuilderReducer(initial(), addElement({ id: 2, type: "text" }));
    const el = s.elements.find((e) => String(e.id) === "2");
    expect(el.label).toBe("");
    expect(el.required).toBe(false);
    expect(el.options).toEqual([]);
  });

  it("ignores edits aimed at an element that is not there", () => {
    const before = withElement();
    expect(formBuilderReducer(before, updateElement({ id: 99, updates: { label: "x" } }))).toEqual(
      before
    );
    expect(formBuilderReducer(before, toggleRequired(99))).toEqual(before);
    expect(formBuilderReducer(before, addOption({ id: 99, option: "x" }))).toEqual(before);
    expect(formBuilderReducer(before, removeOption({ id: 99, index: 0 }))).toEqual(before);
    expect(formBuilderReducer(before, updateOption({ id: 99, index: 0, value: "x" }))).toEqual(
      before
    );
  });

  it("creates the option list on first add", () => {
    const s = formBuilderReducer(
      formBuilderReducer(initial(), addElement({ id: 3, type: "select" })),
      addOption({ id: 3, option: "first" })
    );
    expect(s.elements.find((e) => e.id === "3").options).toEqual(["first"]);
  });

  it("ignores an option index that is past the end", () => {
    const before = withElement();
    expect(formBuilderReducer(before, removeOption({ id: 1, index: 9 }))).toEqual(before);
    expect(formBuilderReducer(before, updateOption({ id: 1, index: 9, value: "x" }))).toEqual(
      before
    );
  });

  it("fills the blanks when loading a saved form", () => {
    const s = formBuilderReducer(initial(), loadForm({ elements: [{ id: 7, type: "text" }] }));
    expect(s.formName).toBe("Untitled Form");
    expect(s.status).toBe("draft");
    expect(s.elements[0]).toEqual(expect.objectContaining({ id: "7", label: "", options: [] }));
  });

  it("loads a form with nothing in it", () => {
    const s = formBuilderReducer(initial(), loadForm({ formName: "Intake", status: "published" }));
    expect(s.formName).toBe("Intake");
    expect(s.elements).toEqual([]);
  });
});

describe("draft slices", () => {
  it("creates the nested permission buckets on first write", () => {
    let s = roleDraftReducer(
      undefined,
      togglePermission({ moduleKey: "CLIENTS", subcatKey: "records", permKey: "view" })
    );
    expect(s.permissions.CLIENTS.records.view).toBe(true);
    s = roleDraftReducer(
      s,
      togglePermission({ moduleKey: "CLIENTS", subcatKey: "records", permKey: "view" })
    );
    expect(s.permissions.CLIENTS.records.view).toBe(false);
  });

  it("creates the same buckets when granting a whole subcategory", () => {
    // A module the blank permission map doesn't know about, so both guards fire.
    const s = roleDraftReducer(
      undefined,
      setGrantAll({
        moduleKey: "NEW_MODULE",
        subcatKey: "appointments",
        permKeys: ["view", "edit"],
        value: true,
      })
    );
    expect(s.permissions.NEW_MODULE.appointments).toEqual({ view: true, edit: true });
  });

  it("stamps a form draft's save time only when the caller sends none", () => {
    const explicit = formDraftsReducer(
      undefined,
      setFormDraft({ key: "k", values: { a: 1 }, savedAt: 123 })
    );
    expect(explicit.k.savedAt).toBe(123);

    const stamped = formDraftsReducer(undefined, setFormDraft({ key: "k", values: {} }));
    expect(typeof stamped.k.savedAt).toBe("number");
  });

  it("applies only the settings actually supplied", () => {
    const s = settingsReducer(undefined, setSettings({ timeFormat: "24-hour" }));
    expect(s.timeFormat).toBe("24-hour");
    expect(s.loaded).toBe(true);

    const all = settingsReducer(
      undefined,
      setSettings({ dateFormat: "DD/MM/YYYY", timeFormat: "12-hour", currency: "NGN" })
    );
    expect(all.dateFormat).toBe("DD/MM/YYYY");
    expect(all.currency).toBe("NGN");
  });
});

describe("Button busy state", () => {
  it("holds itself disabled while an async click is in flight", async () => {
    let resolve;
    const onClick = vi.fn(() => new Promise((r) => {
      resolve = r;
    }));
    render(<Button label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    resolve();
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
  });

  it("stays live for a synchronous click", () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("releases itself when the async click rejects", async () => {
    const onClick = vi.fn(() => Promise.reject(new Error("boom")));
    render(<Button label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled());
  });

  it("clicks happily with no handler wired", () => {
    render(<Button label="Save" />);
    expect(() => fireEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  it("renders disabled when the caller says it is loading", () => {
    render(<Button label="Save" loading />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("SectionLoader", () => {
  it("applies a minimum height only when one is given", () => {
    const { container, rerender } = render(<SectionLoader minHeight={200} />);
    expect(container.querySelector(".section-loader").style.minHeight).toBe("200px");
    rerender(<SectionLoader />);
    expect(container.querySelector(".section-loader").style.minHeight).toBe("");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("roleDraft togglePermission on an unknown module", () => {
  it("creates both nested buckets before recording the toggle", () => {
    const s = roleDraftReducer(
      undefined,
      togglePermission({ moduleKey: "BRAND_NEW", subcatKey: "things", permKey: "view" })
    );
    expect(s.permissions.BRAND_NEW.things.view).toBe(true);
  });
});
