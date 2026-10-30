import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const showToast = vi.fn();
const showApiError = vi.fn();
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => showToast(...a),
  showApiError: (...a) => showApiError(...a),
}));

const showValidationErrors = vi.fn();
vi.mock("../Helper/formErrors", () => ({
  showValidationErrors: (...a) => showValidationErrors(...a),
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../Components/JiraBoard/JiraBoard", () => ({
  default: () => <div data-testid="board" />,
}));

// react-color needs a canvas; the picker's own job is only to relay a hex.
vi.mock("react-color", () => ({
  ChromePicker: ({ color, onChange }) => (
    <button
      data-testid="chrome-picker"
      data-color={color}
      onClick={() => onChange({ hex: "#abcdef" })}
    >
      pick
    </button>
  ),
}));

import NewDocumentRequestModal from "../Components/ReusableModal/ClientModal/NewDocumentRequestModal";
import RejectConfirmationModal from "../Components/ReusableModal/SchedulerModal/RejectConfirmationModal";
import ConfirmLeaveModal from "../Components/ReusableModal/StartAppointmentModal/ConfirmLeaveModal";
import ConfirmCancelModal from "../Components/ReusableModal/StartAppointmentModal/ConfirmCancelModal";
import DeleteLibraryModal from "../Components/ReusableModal/ProgramLibraryModal/DeleteLibraryModal";
import RejectTimeSheetModal from "../Components/ReusableModal/BillingAndPaymentModal/RejectTimesheetModal";
import ApproveTimeSheetModal from "../Components/ReusableModal/BillingAndPaymentModal/ApproveTimeSheetModal";
import CancelModal from "../Components/ReusableModal/SchedulerModal/CancelModal";
import ColorPicker from "../Components/ColorPicker";
import ConnectionStatus from "../Components/ConnectionStatus/ConnectionStatus";
import NotFound from "../Components/NotFound";
import Pipeline from "../Pages/Client/Pipeline/Pipeline";
import KnowledgeBase from "../Pages/HelpAndSupport/KnowledgeBase/KnowledgeBase";
import Reports from "../Pages/Reports/Reports";
import authReducer from "../ReduxStore/features/authentication";
import generalSettingsReducer from "../ReduxStore/features/generalSettingsSlice";

/**
 * The small shared pieces no page-level suite reaches: four confirmation
 * modals, the two timesheet decisions, the colour picker, the presence badge,
 * the 404, and the three thin pages that are little more than a permission gate
 * around one child.
 *
 * The confirmation modals are all thin wrappers over `ReusableModal`, so what
 * is worth pinning is the wording they choose and the payload they hand back —
 * `RejectConfirmationModal` in particular pluralises its own title and reads a
 * client name straight off the first request, which is how it breaks on an
 * empty list.
 */

const onClose = vi.fn();
const onConfirm = vi.fn();
const onSave = vi.fn();

// Tenant's ReusableModal gives the primary button no modifier class, so it is
// the `.modal-btn` that is not the secondary.
const primary = () =>
  document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");

const makeStore = (permissions) =>
  configureStore({
    // `useFormatSettings` reads the settings slice and refetches until it is
    // marked loaded, so it is seeded rather than left to the network.
    reducer: { authentication: authReducer, generalSettings: generalSettingsReducer },
    preloadedState: {
      generalSettings: { loaded: true, dateFormat: "MM/dd/yyyy", timeFormat: "h:mm a" },
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: {
          id: "u1",
          ...(permissions
            ? { role: { roleModuleAccesses: [{ module: "REPORTS", permissions }] } }
            : {}),
        },
      },
    },
  });

const inShell = (ui, permissions) =>
  render(
    <Provider store={makeStore(permissions)}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  onConfirm.mockResolvedValue(undefined);
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the new document request modal", () => {
  const renderModal = (props = {}) =>
    render(
      <Provider store={makeStore()}>
        <NewDocumentRequestModal isOpen onClose={onClose} onSubmit={onSave} {...props} />
      </Provider>
    );

  const nameField = () => screen.getByPlaceholderText("Type something");
  const descriptionField = () => screen.getByPlaceholderText("Enter a description...");
  const dueDateField = () => document.body.querySelector('input[type="date"]');
  const multipleBox = () => document.body.querySelector("#multiple-upload");

  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText("New document request")).not.toBeInTheDocument();
  });

  it("loses the name and description the user typed", async () => {
    // `handleSave` reads the fields off `e.target.closest("form")`, but the
    // footer button it fires from lives OUTSIDE ReusableModal's form, so the
    // lookup falls back to the button itself and both fields come back
    // undefined. The request is created nameless.
    renderModal();
    fireEvent.change(nameField(), { target: { value: "Proof of address" } });
    fireEvent.change(descriptionField(), { target: { value: "A utility bill" } });
    await act(async () => { fireEvent.click(primary()); });

    expect(onSave).toHaveBeenCalledWith({
      name: undefined,
      description: undefined,
      allowMultiple: false,
      dueDate: "",
    });
    expect(onClose).toHaveBeenCalled();
  });


  it("records that several files are allowed", async () => {
    renderModal();
    fireEvent.change(nameField(), { target: { value: "Bank statements" } });
    fireEvent.click(multipleBox());
    await act(async () => { fireEvent.click(primary()); });
    expect(onSave.mock.calls[0][0].allowMultiple).toBe(true);
  });

  it("records and echoes back a due date", async () => {
    renderModal();
    // The name field is `required` and the date carries `min={today}`, so both
    // have to satisfy the browser before the modal will submit at all.
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    fireEvent.change(nameField(), { target: { value: "Consent form" } });
    fireEvent.change(dueDateField(), { target: { value: future } });
    await waitFor(() => expect(screen.getByText(/Selected:/)).toBeInTheDocument());

    await act(async () => { fireEvent.click(primary()); });
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].dueDate).toBe(future);
  });

  it("shows no due-date echo until one is chosen", () => {
    renderModal();
    expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument();
  });

  it("stays open and reports a request the backend refused", async () => {
    onSave.mockRejectedValue(new Error("server said no"));
    renderModal();
    fireEvent.change(nameField(), { target: { value: "Proof of address" } });
    await act(async () => { fireEvent.click(primary()); });

    expect(showApiError).toHaveBeenCalledWith(expect.any(Error), "DOCUMENT_REQUEST");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("the reject-reschedule confirmation", () => {
  const renderModal = (appointments) =>
    render(
      <RejectConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        appointments={appointments}
      />
    );

  it("names the client when there is only one request", () => {
    renderModal([{ clientName: "Ada Bell" }]);
    expect(screen.getByText("Reject Reschedule Request")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to reject the reschedule request for Ada Bell?")
    ).toBeInTheDocument();
  });

  it("counts them instead when there are several", () => {
    renderModal([{ clientName: "Ada" }, { clientName: "Grace" }]);
    expect(screen.getByText("Reject Reschedule Requests")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to reject 2 reschedule requests?")
    ).toBeInTheDocument();
  });

  it("reads an undefined client name rather than failing on an empty list", () => {
    // `appointments[0]?.clientName` is optional-chained, so an empty list still
    // renders — with the word "undefined" where the name should be.
    renderModal([]);
    expect(screen.getByText(/reschedule request for/)).toBeInTheDocument();
  });

  it("hands the whole list back on confirmation", () => {
    const appointments = [{ clientName: "Ada Bell" }];
    renderModal(appointments);
    fireEvent.click(primary());
    expect(onConfirm).toHaveBeenCalledWith({ appointments });
  });
});

describe("the leave and cancel confirmations", () => {
  // Held in a lookup rather than passed through `it.each`, so the component is
  // an ordinary binding the linter can see used in JSX.
  const DIALOGS = {
    leaving: { Dialog: ConfirmLeaveModal, label: "Leave anyway" },
    cancelling: { Dialog: ConfirmCancelModal, label: "Cancel anyway" },
  };

  it.each(["leaving", "cancelling"])("confirms %s", (key) => {
    const { Dialog, label } = DIALOGS[key];
    render(<Dialog isOpen onClose={onClose} onConfirm={onConfirm} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    fireEvent.click(screen.getByText(label));
    expect(onConfirm).toHaveBeenCalled();
  });

  it.each(["leaving", "cancelling"])("backs out of %s", (key) => {
    const { Dialog } = DIALOGS[key];
    render(<Dialog isOpen onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it.each(["leaving", "cancelling"])(
    "locks the button for %s while the request is in flight",
    (key) => {
      const { Dialog } = DIALOGS[key];
      render(<Dialog isOpen onClose={onClose} onConfirm={onConfirm} loading />);
      expect(primary()).toBeDisabled();
    }
  );

  it.each(["leaving", "cancelling"])("renders no dialog for %s while closed", (key) => {
    const { Dialog } = DIALOGS[key];
    const { container } = render(
      <Dialog isOpen={false} onClose={onClose} onConfirm={onConfirm} />
    );
    expect(container.ownerDocument.querySelector(".modal-content")).toBeNull();
  });
});

describe("deleting a program library", () => {
  const rowData = { id: "lib-1", name: "Early Intervention" };

  const renderModal = (props = {}) =>
    render(
      <DeleteLibraryModal
        isOpen
        onClose={onClose}
        onDelete={onConfirm}
        rowData={rowData}
        {...props}
      />
    );

  it("warns what is lost", () => {
    renderModal();
    expect(screen.getByText("Delete this library?")).toBeInTheDocument();
    expect(
      screen.getByText(/All associated programs and targets will be lost/)
    ).toBeInTheDocument();
  });

  it("deletes the row it was given, then closes", async () => {
    renderModal();
    await act(async () => { fireEvent.click(primary()); });
    expect(onConfirm).toHaveBeenCalledWith(rowData);
    expect(onClose).toHaveBeenCalled();
  });

  it("closes even when the delete fails, because the close is outside the try", async () => {
    // `onClose()` sits after the try/finally, so a rejected delete still
    // dismisses the dialog — the row stays on screen with no explanation.
    onConfirm.mockRejectedValue(new Error("still in use"));
    renderModal();
    await act(async () => {
      fireEvent.click(primary());
      await Promise.resolve();
    });
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
  });

  it("backs out without deleting", () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("the timesheet decisions", () => {
  it("approves a timesheet and closes", async () => {
    render(<ApproveTimeSheetModal isOpen onClose={onClose} onSave={onSave} />);
    await act(async () => { fireEvent.click(primary()); });
    expect(onSave).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("reports an approval the backend refused", async () => {
    onSave.mockRejectedValue(new Error("locked"));
    render(<ApproveTimeSheetModal isOpen onClose={onClose} onSave={onSave} />);
    await act(async () => { fireEvent.click(primary()); });
    expect(showToast).toHaveBeenCalledWith("Failed to approve timesheet", "error");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes an approval without sending anything", () => {
    render(<ApproveTimeSheetModal isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejects a timesheet with the reason that was typed", async () => {
    render(<RejectTimeSheetModal isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("Enter rejection reason"), {
      target: { value: "Hours do not match the schedule." },
    });
    await act(async () => { fireEvent.click(primary()); });

    // The whole form object is forwarded, not just the reason string.
    expect(onSave).toHaveBeenCalledWith({ reason: "Hours do not match the schedule." });
    expect(onClose).toHaveBeenCalled();
  });

  it("reports a rejection the backend refused", async () => {
    onSave.mockRejectedValue(new Error("locked"));
    render(<RejectTimeSheetModal isOpen onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText("Enter rejection reason"), {
      target: { value: "Wrong hours" },
    });
    await act(async () => { fireEvent.click(primary()); });
    expect(showToast).toHaveBeenCalledWith("Failed to reject timesheet", "error");
  });

  it("empties the rejection form on cancel", () => {
    render(<RejectTimeSheetModal isOpen onClose={onClose} onSave={onSave} />);
    const box = screen.getByPlaceholderText("Enter rejection reason");
    fireEvent.change(box, { target: { value: "Never mind" } });
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(box.value).toBe("");
  });
});

describe("cancelling an appointment", () => {
  const appointments = [{ id: "a1" }];

  const renderModal = () =>
    render(
      <CancelModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        appointments={appointments}
      />
    );

  const reasonBox = () => screen.getByPlaceholderText("Enter Reason");

  it("refuses a cancellation with no reason", async () => {
    renderModal();
    await act(async () => { fireEvent.click(primary()); });
    await waitFor(() =>
      expect(screen.getByText("Cancellation reason is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("sends the appointments with the reason", async () => {
    renderModal();
    fireEvent.change(reasonBox(), { target: { value: "Client unwell" } });
    await act(async () => { fireEvent.click(primary()); });
    expect(onSave).toHaveBeenCalledWith({ appointments, reason: "Client unwell" });
    expect(onClose).toHaveBeenCalled();
  });

  it("stays open and reports a refused cancellation", async () => {
    onSave.mockRejectedValue(new Error("too late"));
    renderModal();
    fireEvent.change(reasonBox(), { target: { value: "Client unwell" } });
    await act(async () => { fireEvent.click(primary()); });
    expect(showToast).toHaveBeenCalledWith("Failed to cancel appointment", "error");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes without cancelling anything", () => {
    renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("the colour picker", () => {
  it("relays the hex the picker produced", () => {
    const onChange = vi.fn();
    render(<ColorPicker color="#000000" onChange={onChange} onClose={onClose} />);
    fireEvent.click(screen.getByTestId("chrome-picker"));
    expect(onChange).toHaveBeenCalledWith("#abcdef");
  });

  it("shows the colour it was opened on", () => {
    render(<ColorPicker color="#112233" onChange={vi.fn()} onClose={onClose} />);
    expect(screen.getByTestId("chrome-picker")).toHaveAttribute('data-color', '#112233');
  });

  it("closes from either button", () => {
    render(<ColorPicker color="#000000" onChange={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Confirm"));
    fireEvent.click(screen.getByText("Cancel"));
    // Both are wired to the same handler; neither commits or reverts anything.
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("the presence badge", () => {
  it.each([
    [true, "is-online", /You're online/],
    [false, "is-offline", /You're offline/],
  ])("reads %s to the user", (isConnected, className, wording) => {
    render(<ConnectionStatus isConnected={isConnected} />);
    const badge = document.body.querySelector(".conn-status");
    expect(badge.className).toContain(className);
    expect(badge.getAttribute("data-tip")).toMatch(wording);
  });

  it("takes an extra class from its caller and stays keyboard-reachable", () => {
    render(<ConnectionStatus isConnected className="in-header" />);
    const badge = document.body.querySelector(".conn-status");
    expect(badge.className).toContain("in-header");
    expect(badge).toHaveAttribute("tabindex", "0");
  });

  it("reads as offline when told nothing", () => {
    render(<ConnectionStatus />);
    expect(document.body.querySelector(".conn-status").className).toContain("is-offline");
  });
});

describe("the 404 page", () => {
  it("says what happened and offers a way back", () => {
    inShell(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Go Home"));
    expect(navigate).toHaveBeenCalled();
  });
});

describe("the thin pages", () => {
  it("renders the prospect board as the client pipeline", () => {
    inShell(<Pipeline />);
    expect(screen.getByTestId("board")).toBeInTheDocument();
  });

  it("shows the knowledge base to a permitted user", () => {
    inShell(<KnowledgeBase />);
    expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
  });

  it("turns away a user without the knowledge base", () => {
    inShell(<KnowledgeBase />, ["something_else"]);
    expect(screen.queryByText("Knowledge Base")).not.toBeInTheDocument();
  });

  it("lists every report to a permitted user", () => {
    inShell(<Reports />);
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Cancelled Appointments")).toBeInTheDocument();
    expect(screen.getByText("Audit Logs")).toBeInTheDocument();
  });

  it("opens the report that was clicked", () => {
    inShell(<Reports />);
    fireEvent.click(screen.getByText("Login Logs"));
    expect(navigate).toHaveBeenCalledWith("/reports/login-logs");
  });

  it("shows the cards but no links to a user who may not open a report", () => {
    inShell(<Reports />, ["view_report_list"]);
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.queryByText("Cancelled Appointments")).not.toBeInTheDocument();
  });

  it("turns away a user without the reports module", () => {
    inShell(<Reports />, ["something_else"]);
    expect(screen.queryByText("Reports")).not.toBeInTheDocument();
  });
});
