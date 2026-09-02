import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

const apiMock = vi.hoisted(() => ({ GetSingleSessionBySessionId: vi.fn() }));
vi.mock("../api/homeApis", () => ({ default: apiMock }));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

// react-signature-canvas wants a real canvas. The stub keeps the pad's public
// surface -- clear / isEmpty / toDataURL -- so the signature rules stay testable.
// In React 19 the ref arrives as an ordinary prop, so it is populated directly.
const { pad } = vi.hoisted(() => ({
  pad: { empty: true, dataUrl: "data:image/png;base64,drawn", cleared: 0 },
}));
vi.mock("react-signature-canvas", () => ({
  default: function SignatureCanvas({ ref }) {
    if (ref) {
      ref.current = {
        clear: () => { pad.cleared += 1; pad.empty = true; },
        isEmpty: () => pad.empty,
        toDataURL: () => pad.dataUrl,
      };
    }
    return <canvas data-testid="signature-pad" />;
  },
}));

import SessionFeedbackModal from "../Components/Modal/UpcomingDashboardModal/ReviewSessionModal";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The awaiting-feedback review sheet.
 *
 * Session information has three possible shapes and the modal picks between
 * them: a full session envelope with a nested `appointment`, the lighter
 * completed-session row (`clientName` + `sessionTypeName`), or nothing usable
 * at all, in which case every field reads "N/A".
 *
 * Service codes prefer the authorization the session drew units from and only
 * fall back to the appointment's own services when that list is empty --
 * duplicates are collapsed either way.
 *
 * A signature is the one hard requirement on submit, and it can come from three
 * different places, so each mode is checked both filled and empty. The drawing
 * pad is stubbed: `react-signature-canvas` needs a canvas jsdom does not
 * provide, so the draw-mode assertions here are about the modes and the toast,
 * not about pixels.
 */

const session = (over = {}) => ({
  id: "s1",
  startTime: "2026-02-01T09:00:00.000Z",
  endTime: "2026-02-01T10:30:00.000Z",
  note: "The client engaged well throughout.",
  appointment: {
    client: { firstName: "Ada", lastName: "Bell", insuranceId: "INS-9" },
    session: { name: "ABA Therapy" },
    serviceLocation: "Clinic",
    clinicians: [{ fullName: "Dr Grace Hopper", npi: "1234567890" }],
    appointmentServices: [{ serviceCode: { code: "97153" }, modifiers: { modifier: "HN" } }],
  },
  ...over,
});

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        isAuthenticated: true,
        loading: false,
        error: null,
        accessToken: "at",
        refreshToken: "rt",
        user: { id: "u1", tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
      },
    },
  });

const onClose = vi.fn();
const onSave = vi.fn();

const renderModal = async (props = {}) => {
  const view = render(
    <Provider store={makeStore()}>
      <SessionFeedbackModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        appointment={{ id: "s1" }}
        {...props}
      />
    </Provider>
  );
  if (props.appointment !== null && props.isOpen !== false) {
    await waitFor(() =>
      expect(screen.getByText("Session Information")).toBeInTheDocument()
    );
  }
  return view;
};

// Every info line renders as "<strong>Label</strong>: value" in its own div.
const line = (label) =>
  screen.getByText(label).parentElement.textContent.replace(/\s+/g, " ").trim();

const save = () => fireEvent.click(screen.getByText("Save and Close"));

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
  pad.empty = true;
  pad.cleared = 0;
  apiMock.GetSingleSessionBySessionId.mockResolvedValue({ data: session() });
  onSave.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("opening", () => {
  it("renders nothing without an appointment", async () => {
    await renderModal({ appointment: null });
    expect(screen.queryByText("Session Information")).not.toBeInTheDocument();
  });

  it("fetches the full session by its id", async () => {
    await renderModal();
    await waitFor(() =>
      expect(apiMock.GetSingleSessionBySessionId).toHaveBeenCalledWith({
        sessionId: "s1",
        accessToken: "at",
        refreshToken: "rt",
      })
    );
  });

  it("fetches nothing while closed", async () => {
    await renderModal({ isOpen: false });
    expect(apiMock.GetSingleSessionBySessionId).not.toHaveBeenCalled();
  });

  it("fetches nothing for an appointment with no id", async () => {
    await renderModal({ appointment: { originalData: {} } });
    expect(apiMock.GetSingleSessionBySessionId).not.toHaveBeenCalled();
  });

  it("unwraps the envelope the endpoint replies with", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Session Notes")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Session Notes"));
    expect(
      screen.getByText("The client engaged well throughout.")
    ).toBeInTheDocument();
  });

  it("reads a response delivered without an envelope", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue(session());
    await renderModal();
    await waitFor(() => expect(line("Client Name")).toContain("Ada Bell"));
  });

  it("falls back to the row when the fetch fails", async () => {
    apiMock.GetSingleSessionBySessionId.mockRejectedValue(new Error("offline"));
    await renderModal({
      appointment: { id: "s1", originalData: { clientName: "Row Ada", sessionTypeName: "ABA" } },
    });
    await waitFor(() => expect(line("Client Name")).toContain("Row Ada"));
  });

  it("falls back to the row itself when there is no original data", async () => {
    apiMock.GetSingleSessionBySessionId.mockRejectedValue(new Error("offline"));
    await renderModal({
      appointment: { id: "s1", clientName: "Flat Ada", sessionTypeName: "ABA" },
    });
    await waitFor(() => expect(line("Client Name")).toContain("Flat Ada"));
  });
});

describe("the session information", () => {
  it("renders the full session's fields", async () => {
    await renderModal();
    await waitFor(() => expect(line("Client Name")).toContain("Ada Bell"));
    expect(line("Client Name")).toContain("INS-9");
    expect(line("Clinician Name(s)")).toContain("Dr Grace Hopper");
    expect(line("Clinician Name(s)")).toContain("NPI 1234567890");
    expect(line("Session Type")).toContain("ABA Therapy");
    expect(line("Location")).toContain("Clinic");
  });

  it("formats the slot and its duration", async () => {
    await renderModal();
    await waitFor(() => expect(line("Date")).toContain("02/01/2026"));
    expect(line("Total Session Duration")).toContain("1h 30m");
  });

  it("says N/A when the session records no end time", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({ endTime: null }),
    });
    await renderModal();
    await waitFor(() => expect(line("Session End Time")).toContain("N/A"));
    expect(line("Total Session Duration")).toContain("N/A");
  });

  it("says N/A when the session records no start time", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({ startTime: null }),
    });
    await renderModal();
    await waitFor(() => expect(line("Date")).toContain("N/A"));
  });

  it("hides the insurance id and NPI when neither is known", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({
        appointment: {
          client: { firstName: "Ada", lastName: "Bell" },
          clinicians: [{ fullName: "Dr Grace Hopper" }],
        },
      }),
    });
    await renderModal();
    await waitFor(() => expect(line("Client Name")).toContain("Ada Bell"));
    expect(line("Client Name")).not.toContain("Insurance");
    expect(line("Clinician Name(s)")).not.toContain("NPI");
  });

  it("labels an unnamed client and an unassigned clinician", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({ appointment: {} }),
    });
    await renderModal();
    await waitFor(() => expect(line("Client Name")).toContain("Unknown"));
    expect(line("Clinician Name(s)")).toContain("Not assigned");
    expect(line("Session Type")).toContain("N/A");
    expect(line("Location")).toContain("N/A");
  });

  it("reads the completed-session row shape", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: {
        clientName: "Ada Bell",
        sessionTypeName: "ABA Therapy",
        clinician: "Dr Grace Hopper",
        date: "2026-02-01T09:00:00.000Z",
        totalHours: 1.5,
      },
    });
    await renderModal();
    await waitFor(() => expect(line("Client Name")).toContain("Ada Bell"));
    expect(line("Total Session Duration")).toContain("1h 30m");
    expect(line("Session End Time")).toContain("N/A");
  });

  it.each([
    [2, "2h"],
    [0.5, "30m"],
  ])("renders a completed session of %s hours as %s", async (totalHours, label) => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: { clientName: "Ada Bell", sessionTypeName: "ABA", totalHours },
    });
    await renderModal();
    await waitFor(() => expect(line("Total Session Duration")).toContain(label));
  });

  it("says N/A throughout when the payload is unusable", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({ data: {} });
    await renderModal();
    await waitFor(() => expect(line("Client Name")).toContain("Unknown"));
    expect(line("Date")).toContain("N/A");
    expect(line("Total Session Duration")).toContain("N/A");
  });
});

describe("service codes", () => {
  const withAuthorizations = (authorizationsUsed) =>
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({ authorizationsUsed }),
    });

  it("prefers the authorization the session drew from", async () => {
    withAuthorizations([
      {
        clientAuthorizationServices: [
          { serviceCode: { code: "97155" }, modifiers: { modifier: "HO" } },
        ],
      },
    ]);
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("97155 (HO)"));
    expect(line("Service Type(s)")).not.toContain("97153");
  });

  it("accepts a modifier given as a bare string", async () => {
    withAuthorizations([
      { clientAuthorizationServices: [{ serviceCode: { code: "97155" }, modifiers: "HN" }] },
    ]);
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("97155 (HN)"));
  });

  it("renders a code with no modifier at all", async () => {
    withAuthorizations([
      { clientAuthorizationServices: [{ serviceCode: { code: "97155" } }] },
    ]);
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("97155"));
  });

  it("collapses duplicate codes", async () => {
    withAuthorizations([
      {
        clientAuthorizationServices: [
          { serviceCode: { code: "97155" } },
          { serviceCode: { code: "97155" } },
        ],
      },
    ]);
    await renderModal();
    await waitFor(() =>
      expect(line("Service Type(s)")).toBe("Service Type(s): 97155")
    );
  });

  it("falls back to the appointment's services when the authorization has none", async () => {
    withAuthorizations([{ clientAuthorizationServices: [] }]);
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("97153 (HN)"));
  });

  it("skips an authorization entry with no service code", async () => {
    withAuthorizations([{ clientAuthorizationServices: [{ serviceCode: {} }] }]);
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("97153"));
  });

  it("copes with an authorization entry that is null", async () => {
    withAuthorizations([null]);
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("97153"));
  });

  it("says N/A when neither source names a code", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({
        appointment: { appointmentServices: [{ serviceCode: {} }] },
      }),
    });
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toContain("N/A"));
  });
});

describe("the session notes sheet", () => {
  it("opens and closes", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Session Notes")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Session Notes"));
    expect(screen.getByText("The client engaged well throughout.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("Close")[0]);
    await waitFor(() =>
      expect(screen.queryByText("The client engaged well throughout.")).toBeNull()
    );
  });

  it("says so when the session has no note", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({ data: session({ note: null }) });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Session Notes")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Session Notes"));
    expect(
      screen.getByText("No notes available for this session.")
    ).toBeInTheDocument();
  });
});

describe("the session data sheet", () => {
  const withData = (sessionDatas) =>
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({ sessionDatas }),
    });

  const openData = async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Session Data")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Session Data"));
  };

  it("says so when the session recorded none", async () => {
    await openData();
    expect(screen.getByText("No session data available.")).toBeInTheDocument();
  });

  it("numbers each target", async () => {
    withData([
      { id: "d1", data: { numberOfOccurrence: 3 } },
      { id: "d2", data: { duration: 60 } },
    ]);
    await openData();
    expect(screen.getByText("Target 1")).toBeInTheDocument();
    expect(screen.getByText("Target 2")).toBeInTheDocument();
  });

  it.each([
    ["Task Analysis", { steps: [{ step: "Wet hands", prompt: "Independent" }] }],
    ["Latency", { trials: [{ latency: 4 }] }],
    ["Percentage Correct", { trials: [{ correct: true }], percentageCorrect: 80 }],
    ["Trials/Opportunities", { trials: [{ performance: "correct" }] }],
    ["Rate", { duration: 60, numberOfOccurrence: 3 }],
    ["Frequency", { numberOfOccurrence: 3 }],
    ["Duration", { duration: 60 }],
  ])("badges a %s target", async (label, data) => {
    withData([{ id: "d1", data }]);
    await openData();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("badges nothing for an entry it cannot classify", async () => {
    withData([{ id: "d1", data: { somethingElse: true } }]);
    await openData();
    expect(screen.getByText("Target 1")).toBeInTheDocument();
    expect(screen.queryByText("Duration")).not.toBeInTheDocument();
  });

  it("badges nothing for an entry carrying no data", async () => {
    withData([{ id: "d1" }]);
    await openData();
    expect(screen.getByText("Target 1")).toBeInTheDocument();
  });

  it("renders the notes, occurrence, duration and collection type", async () => {
    withData([
      {
        id: "d1",
        data: {
          notes: "Prompted twice",
          numberOfOccurrence: 3,
          duration: 60,
          dataCollectionType: "rate",
        },
      },
    ]);
    await openData();
    expect(screen.getByText("Prompted twice")).toBeInTheDocument();
    expect(screen.getByText("Number of Occurrences:")).toBeInTheDocument();
    expect(screen.getByText("Duration:")).toBeInTheDocument();
    expect(screen.getByText("Data Collection Type:")).toBeInTheDocument();
  });

  it("renders a percentage", async () => {
    withData([{ id: "d1", data: { percentageCorrect: 80, trials: [{ correct: true }] } }]);
    await openData();
    expect(screen.getByText("Percentage Correct:")).toBeInTheDocument();
  });

  it("builds the trials table from the first trial's keys", async () => {
    withData([
      {
        id: "d1",
        data: {
          trials: [
            { trial: 1, performance: "correct" },
            { trial: 2, performance: "incorrect" },
          ],
        },
      },
    ]);
    await openData();
    expect(screen.getByText("Trials:")).toBeInTheDocument();
    expect(screen.getByText("correct")).toBeInTheDocument();
    expect(screen.getByText("incorrect")).toBeInTheDocument();
  });

  it("stringifies a nested value inside a trial", async () => {
    withData([{ id: "d1", data: { trials: [{ trial: 1, detail: { prompt: "full" } }] } }]);
    await openData();
    expect(screen.getByText('{"prompt":"full"}')).toBeInTheDocument();
  });

  it("renders no trials table for an empty trial list", async () => {
    withData([{ id: "d1", data: { trials: [], numberOfOccurrence: 1 } }]);
    await openData();
    expect(screen.queryByText("Trials:")).not.toBeInTheDocument();
  });

  it("builds the steps table for a task analysis", async () => {
    withData([
      {
        id: "d1",
        data: {
          steps: [
            { step: "Wet hands", prompt: "Independent" },
            { step: "Apply soap", prompt: "Partial" },
          ],
        },
      },
    ]);
    await openData();
    expect(screen.getByText("Wet hands")).toBeInTheDocument();
    expect(screen.getByText("Apply soap")).toBeInTheDocument();
  });

  it("closes from the footer", async () => {
    withData([{ id: "d1", data: { duration: 60 } }]);
    await openData();
    fireEvent.click(screen.getAllByText("Close").slice(-1)[0]);
    await waitFor(() => expect(screen.queryByText("Target 1")).toBeNull());
  });
});

describe("the feedback form", () => {
  it("records a service and therapist rating", async () => {
    await renderModal();
    await waitFor(() =>
      expect(screen.getByText("Please rate the service you received")).toBeInTheDocument()
    );
    const stars = screen.getAllByLabelText(/^Rate \d star/);
    // Two rating rows of five stars each, service first.
    fireEvent.click(stars[3]);
    fireEvent.click(stars[9]);
    expect(stars[3]).toHaveStyle({ color: "#fbbf24" });
    expect(stars[9]).toHaveStyle({ color: "#fbbf24" });
  });

  it("labels a single star in the singular", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getAllByLabelText("Rate 1 star")).toHaveLength(2));
    expect(screen.getAllByLabelText("Rate 2 stars")).toHaveLength(2);
  });

  it("records the optional written feedback", async () => {
    await renderModal();
    const box = await waitFor(() => screen.getByPlaceholderText("Enter a description..."));
    fireEvent.change(box, { target: { value: "All good" } });
    expect(box.value).toBe("All good");
  });

  it("records the delivery confirmation", async () => {
    await renderModal();
    const box = await waitFor(() =>
      document.body.querySelector('input[type="checkbox"]')
    );
    fireEvent.click(box);
    expect(box.checked).toBe(true);
  });
});

describe("the signature", () => {
  const switchTo = (mode) => fireEvent.click(screen.getByText(mode));
  const typeName = (value) =>
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value },
    });

  it("starts in drawing mode", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Draw")).toBeInTheDocument());
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("switches to typing and back", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Type")).toBeInTheDocument());
    switchTo("Type");
    expect(screen.getByPlaceholderText("Type your full name")).toBeInTheDocument();

    switchTo("Draw");
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("switches to an uploaded image", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    switchTo("Image");
    expect(screen.getByText("Click to upload signature image")).toBeInTheDocument();
  });

  it("refuses to submit with an empty typed signature", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Type")).toBeInTheDocument());
    switchTo("Type");
    save();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Please provide your signature", "error")
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a typed signature that is only whitespace", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Type")).toBeInTheDocument());
    switchTo("Type");
    typeName("   ");
    save();
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits a typed signature", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Type")).toBeInTheDocument());
    switchTo("Type");
    typeName("Ada Bell");
    await act(async () => { save(); });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "s1", signature: "Ada Bell" })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("refuses to submit with no uploaded image", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    switchTo("Image");
    save();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Please provide your signature", "error")
    );
  });

  it("submits an uploaded image and can remove it again", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    switchTo("Image");

    const input = document.body.querySelector('input[type="file"]');
    const file = new File(["x"], "sig.png", { type: "image/png" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    await waitFor(() => expect(screen.getByText("Remove")).toBeInTheDocument());

    await act(async () => { save(); });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ signature: expect.stringContaining("data:") })
    );
  });

  it("removes an uploaded image", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    switchTo("Image");
    const input = document.body.querySelector('input[type="file"]');
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File(["x"], "sig.png", { type: "image/png" })] },
      });
    });
    await waitFor(() => expect(screen.getByText("Remove")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() =>
      expect(screen.getByText("Click to upload signature image")).toBeInTheDocument()
    );
  });

  it("ignores a file chooser dismissed without a file", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Image")).toBeInTheDocument());
    switchTo("Image");
    const input = document.body.querySelector('input[type="file"]');
    await act(async () => { fireEvent.change(input, { target: { files: [] } }); });
    expect(screen.getByText("Click to upload signature image")).toBeInTheDocument();
  });

  it("refuses to submit an untouched drawing pad", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Clear")).toBeInTheDocument());
    save();
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Please provide your signature", "error")
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits what was drawn", async () => {
    pad.empty = false;
    await renderModal();
    await waitFor(() => expect(screen.getByText("Clear")).toBeInTheDocument());
    await act(async () => { save(); });
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ signature: "data:image/png;base64,drawn" })
    );
  });

  it("clears the drawing pad", async () => {
    pad.empty = false;
    await renderModal();
    await waitFor(() => expect(screen.getByText("Clear")).toBeInTheDocument());
    const before = pad.cleared;
    fireEvent.click(screen.getByText("Clear"));
    expect(pad.cleared).toBe(before + 1);
    expect(pad.empty).toBe(true);
  });
});

describe("submitting", () => {
  const typedSubmit = async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Type")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Type"));
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada Bell" },
    });
  };

  it("sends the ratings, confirmation and feedback along", async () => {
    await typedSubmit();
    fireEvent.click(document.body.querySelector('input[type="checkbox"]'));
    fireEvent.change(screen.getByPlaceholderText("Enter a description..."), {
      target: { value: "Very helpful" },
    });
    const stars = screen.getAllByLabelText(/^Rate \d star/);
    fireEvent.click(stars[4]);
    fireEvent.click(stars[8]);

    await act(async () => { save(); });
    expect(onSave).toHaveBeenCalledWith({
      sessionId: "s1",
      confirmDelivery: true,
      rateService: 5,
      rateTherapist: 4,
      feedback: "Very helpful",
      signature: "Ada Bell",
    });
  });

  it("stays open and reports a failed submit", async () => {
    onSave.mockRejectedValue(new Error("server said no"));
    await typedSubmit();
    await act(async () => { save(); });
    expect(showToast).toHaveBeenCalledWith("server said no", "error");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports a failure that carries no message", async () => {
    onSave.mockRejectedValue({});
    await typedSubmit();
    await act(async () => { save(); });
    expect(showToast).toHaveBeenCalledWith(
      "Failed to submit. Please try again.",
      "error"
    );
  });

  it("closes from the cancel button", async () => {
    await renderModal();
    await waitFor(() => expect(screen.getByText("Cancel")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("odds and ends", () => {
  it("stringifies a nested value inside a step row", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({
        sessionDatas: [{ id: "d1", data: { steps: [{ step: "Wet hands", detail: { prompt: "full" } }] } }],
      }),
    });
    await renderModal();
    await waitFor(() => expect(screen.getByText("Session Data")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Session Data"));
    expect(screen.getByText('{"prompt":"full"}')).toBeInTheDocument();
  });

  it("clears the drawing pad when the modal is dismissed", async () => {
    const { rerender } = render(
      <Provider store={makeStore()}>
        <SessionFeedbackModal isOpen onClose={onClose} onSave={onSave} appointment={{ id: "s1" }} />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText("Session Information")).toBeInTheDocument());
    const before = pad.cleared;

    rerender(
      <Provider store={makeStore()}>
        <SessionFeedbackModal
          isOpen={false}
          onClose={onClose}
          onSave={onSave}
          appointment={{ id: "s1" }}
        />
      </Provider>
    );
    await waitFor(() => expect(pad.cleared).toBe(before + 1));
  });

  it("skips an appointment service with no code of its own", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: session({
        appointment: {
          appointmentServices: [{ serviceCode: {} }, { serviceCode: { code: "97155" } }],
        },
      }),
    });
    await renderModal();
    await waitFor(() => expect(line("Service Type(s)")).toBe("Service Type(s): 97155"));
  });

  it("labels a completed-session row with no client or type", async () => {
    apiMock.GetSingleSessionBySessionId.mockResolvedValue({
      data: { clientName: "Ada", sessionTypeName: "ABA", clinician: null },
    });
    await renderModal();
    await waitFor(() => expect(line("Clinician Name(s)")).toContain("Not assigned"));
    expect(line("Total Session Duration")).toContain("N/A");
  });
});
