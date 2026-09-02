import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

/**
 * The public page a client lands on from a "please sign this report" email.
 *
 * There is no logged-in session here: the signing JWT in the URL path IS the
 * credential, and its `id` claim is the report id, so every test has to mint a
 * real base64url token rather than pass an opaque string. The page decides what
 * to render from that token alone before it ever calls the server -- malformed,
 * already-lapsed and valid are three separate screens -- and the backend can
 * still override with its own expiry error.
 *
 * Two things need shimming in jsdom: canvas (the draw-a-signature pad calls
 * getContext and toDataURL) and nothing else -- FileReader and atob are real.
 * The section renderer is generic, printing every key of every content object,
 * so the fixtures below deliberately carry one value of each shape it branches
 * on: array of objects, array of strings, image, HTML, boolean and scalar.
 */

const h = vi.hoisted(() => ({
  params: {},
  api: {
    ValidateClientReportToken: vi.fn(),
    GetSingleClinicalReportById: vi.fn(),
    SignClinicalReport: vi.fn(),
    CreateClinicalReportChangeRequest: vi.fn(),
  },
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: () => h.params,
}));

vi.mock("../hooks/useFormatSettings", () => ({
  default: () => ({ dateFormat: "YYYY-MM-DD", timeFormat: "12-hour", currency: "USD" }),
}));

vi.mock("../api/TemplateAndReportApi", () => ({
  default: {
    ValidateClientReportToken: (...a) => h.api.ValidateClientReportToken(...a),
    GetSingleClinicalReportById: (...a) => h.api.GetSingleClinicalReportById(...a),
    SignClinicalReport: (...a) => h.api.SignClinicalReport(...a),
    CreateClinicalReportChangeRequest: (...a) => h.api.CreateClinicalReportChangeRequest(...a),
  },
}));

import ClientReportView from "../Pages/ClientReportView/ClientReportView";

// A real JWT shape -- the page splits on ".", base64url-decodes the middle part
// and reads `id` and `exp` out of it, so an opaque placeholder would not do.
const makeToken = (payload) => {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${body}.signature`;
};

const inSeconds = (offsetMs) => Math.floor((Date.now() + offsetMs) / 1000);

const validToken = () => makeToken({ id: "rep-1", exp: inSeconds(60 * 60 * 1000) });

const report = (over = {}) => ({
  id: "rep-1",
  title: "Quarterly Review",
  status: "PENDING_CLIENT_SIGNATURE",
  createdAt: "2026-01-02T10:00:00.000Z",
  updatedAt: "2026-01-03T10:00:00.000Z",
  clientTenantId: "ct-1",
  creator: { fullName: "Dr Who" },
  approver: { fullName: "Dr River" },
  client: { client: { firstName: "Ada", lastName: "Lovelace" } },
  sections: [
    {
      id: "s1",
      section: "Consent & Signatures",
      content: { summary: "All good", clinicianSignature: "data:image/png;base64,AAA" },
    },
  ],
  ...over,
});

const renderPage = () => render(<ClientReportView />);

const settled = () => waitFor(() => expect(screen.queryByRole("status")).toBeNull());

const openReport = async (data = report()) => {
  h.params = { token: validToken() };
  h.api.ValidateClientReportToken.mockResolvedValue({});
  h.api.GetSingleClinicalReportById.mockResolvedValue({ data });
  renderPage();
  await settled();
};

beforeEach(() => {
  vi.clearAllMocks();
  h.params = { token: validToken() };
  h.api.ValidateClientReportToken.mockResolvedValue({});
  h.api.GetSingleClinicalReportById.mockResolvedValue({ data: report() });
  h.api.SignClinicalReport.mockResolvedValue({});
  h.api.CreateClinicalReportChangeRequest.mockResolvedValue({});

  // jsdom ships no canvas implementation; the signature pad needs a context
  // object with the handful of methods it actually calls.
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    lineWidth: 0,
    lineCap: "",
    lineJoin: "",
    strokeStyle: "",
  }));
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => "data:image/png;base64,DRAWN");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("reading the link", () => {
  it("refuses a link with no token at all", async () => {
    h.params = {};
    renderPage();
    await settled();
    expect(
      screen.getByText("This link is not valid. Please check the link in your email.")
    ).toBeInTheDocument();
    expect(h.api.ValidateClientReportToken).not.toHaveBeenCalled();
  });

  it("refuses a token that is not a JWT", async () => {
    h.params = { token: "just-a-string" };
    renderPage();
    await settled();
    expect(screen.getByText(/This link is not valid/)).toBeInTheDocument();
  });

  it("refuses a token whose payload is not decodable", async () => {
    h.params = { token: "header.!!!not-base64!!!.sig" };
    renderPage();
    await settled();
    expect(screen.getByText(/This link is not valid/)).toBeInTheDocument();
  });

  it("refuses a token whose payload is a bare value rather than an object", async () => {
    h.params = { token: `header.${btoa("42")}.sig` };
    renderPage();
    await settled();
    expect(screen.getByText(/This link is not valid/)).toBeInTheDocument();
  });

  it("refuses a well-formed token that carries no report id", async () => {
    h.params = { token: makeToken({ exp: inSeconds(60000) }) };
    renderPage();
    await settled();
    expect(screen.getByText(/This link is not valid/)).toBeInTheDocument();
  });

  it("shows the expired screen for a lapsed token without asking the server", async () => {
    h.params = { token: makeToken({ id: "rep-1", exp: inSeconds(-60 * 60 * 1000) }) };
    renderPage();
    await settled();
    expect(screen.getByText("This signing link has expired")).toBeInTheDocument();
    expect(screen.getByText(/this one expired on/)).toBeInTheDocument();
    expect(h.api.ValidateClientReportToken).not.toHaveBeenCalled();
    // Retrying can never help, so no retry button is offered.
    expect(screen.queryByText("Try Again")).toBeNull();
  });

  it("shows the expired screen without a date when the server rejects an undated token", async () => {
    h.params = { token: makeToken({ id: "rep-1" }) };
    h.api.ValidateClientReportToken.mockRejectedValue(new Error("token has expired"));
    renderPage();
    await settled();
    expect(screen.getByText("This signing link has expired")).toBeInTheDocument();
    expect(screen.queryByText(/this one expired on/)).toBeNull();
  });

  it("shows a generic failure for any other load error, and can retry", async () => {
    h.api.GetSingleClinicalReportById.mockRejectedValueOnce(new Error("500"));
    renderPage();
    await settled();
    expect(screen.getByText(/Unable to load this report/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Try Again"));
    await waitFor(() => expect(screen.getByText("Clinical Report")).toBeInTheDocument());
  });

  it("accepts a response that is the report itself rather than a wrapper", async () => {
    h.api.GetSingleClinicalReportById.mockResolvedValue(report({ title: "Bare Body" }));
    renderPage();
    await settled();
    expect(screen.getByText("Bare Body")).toBeInTheDocument();
  });

  it("passes the token as both credentials, since that is all the client has", async () => {
    const token = validToken();
    h.params = { token };
    renderPage();
    await settled();
    expect(h.api.GetSingleClinicalReportById).toHaveBeenCalledWith({
      Id: "rep-1",
      accessToken: token,
      refreshToken: token,
    });
  });
});

describe("the report header", () => {
  it("names the client and pre-fills their name as the signer", async () => {
    await openReport();
    expect(screen.getByRole("heading", { name: "Ada Lovelace" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your full name")).toHaveValue("Ada Lovelace");
    expect(document.body.querySelector(".crv-client-avatar").textContent).toBe("AL");
  });

  it("falls back to placeholders when the report carries no client", async () => {
    await openReport(report({ client: null }));
    expect(screen.getByRole("heading", { name: "Client" })).toBeInTheDocument();
    expect(document.body.querySelector(".crv-client-avatar").textContent).toBe("??");
    expect(screen.getByPlaceholderText("Enter your full name")).toHaveValue("");
  });

  it("shows the status with its underscores spelled out", async () => {
    await openReport();
    expect(screen.getByText("PENDING CLIENT SIGNATURE")).toBeInTheDocument();
  });

  it("falls back across every missing header field at once", async () => {
    await openReport(
      report({
        status: undefined,
        title: undefined,
        creator: null,
        approver: null,
        createdAt: null,
        updatedAt: null,
        client: { client: { firstName: "", lastName: "" } },
      })
    );
    expect(document.body.querySelector(".crv-status-badge")).toHaveTextContent("Unknown");
    expect(screen.getByText("Untitled Report")).toBeInTheDocument();
    const values = Array.from(document.body.querySelectorAll(".crv-info-value")).map(
      (n) => n.textContent
    );
    expect(values).toEqual(["Unknown", "None", "N/A", "N/A"]);
  });
});

describe("rendering a section", () => {
  const sectioned = (content, name = "Assessment") =>
    report({ sections: [{ id: "s9", section: name, content }] });

  it("skips a section with no content", async () => {
    await openReport(sectioned(null));
    expect(document.body.querySelector(".crv-section-card")).toBeNull();
  });

  it("collapses and re-expands on the header button", async () => {
    await openReport(sectioned({ note: "visible" }));
    expect(screen.getByText("visible")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Assessment/ }));
    expect(screen.queryByText("visible")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Assessment/ }));
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("numbers each entry when the content is a list of items", async () => {
    await openReport(
      sectioned({ items: [{ id: "i1", note: "first" }, { note: "second" }] })
    );
    expect(screen.getByText("Assessment 1")).toBeInTheDocument();
    expect(screen.getByText("Assessment 2")).toBeInTheDocument();
  });

  it("hides the clinician's own signature from the client", async () => {
    await openReport(
      sectioned({
        clinicianSignature: "data:image/png;base64,SECRET",
        clinicianSignatureType: "draw",
        id: "should-not-show",
        clinicalReportId: "also-not",
        signedBy: "Nurse Joy",
      })
    );
    expect(document.body.querySelector("img.crv-content-image")).toBeNull();
    expect(screen.getByText("Nurse Joy")).toBeInTheDocument();
    expect(screen.queryByText("should-not-show")).toBeNull();
  });

  it("omits a field that is empty, null or undefined", async () => {
    await openReport(
      sectioned({ blank: "", missing: null, absent: undefined, kept: "here" })
    );
    expect(document.body.querySelectorAll(".crv-field")).toHaveLength(1);
    expect(screen.getByText("here")).toBeInTheDocument();
  });

  it("joins a list of plain values onto one line", async () => {
    await openReport(sectioned({ goals: ["walk", "talk"] }));
    expect(screen.getByText("walk, talk")).toBeInTheDocument();
  });

  it("omits an empty list", async () => {
    await openReport(sectioned({ goals: [], kept: "here" }));
    expect(document.body.querySelectorAll(".crv-field")).toHaveLength(1);
  });

  it("expands a list of objects into a card each", async () => {
    await openReport(
      sectioned({
        diagnoses: [
          { id: "d1", code: "F84.0", primary: true },
          { code: "F90.0", primary: false },
        ],
      })
    );
    expect(document.body.querySelectorAll(".crv-nested-card")).toHaveLength(2);
    expect(screen.getByText("F84.0")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it.each([
    ["a base64 data url", "data:image/png;base64,AAAA"],
    ["a link to an image file", "https://cdn.example.com/sig.png"],
    ["an image link with a query string", "https://cdn.example.com/sig.jpeg?v=2"],
  ])("renders %s as a picture", async (_kind, value) => {
    await openReport(sectioned({ clientUpload: value }));
    expect(document.body.querySelector("img.crv-content-image")).toHaveAttribute("src", value);
  });

  it("treats a link to a non-image file as plain text", async () => {
    await openReport(sectioned({ attachment: "https://cdn.example.com/notes.pdf" }));
    expect(document.body.querySelector("img.crv-content-image")).toBeNull();
    expect(screen.getByText("https://cdn.example.com/notes.pdf")).toBeInTheDocument();
  });

  it("renders an HTML value as markup, sanitised", async () => {
    await openReport(
      sectioned({ narrative: "<p>Steady <strong>progress</strong></p><script>alert(1)</script>" })
    );
    const html = document.body.querySelector(".crv-html-content");
    expect(html.querySelector("strong")).toHaveTextContent("progress");
    expect(html.querySelector("script")).toBeNull();
  });

  it("prints a number as text", async () => {
    await openReport(sectioned({ sessionCount: 12 }));
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("labels a camelCase key in words", async () => {
    await openReport(sectioned({ presentingConcern: "anxiety" }));
    expect(screen.getByText("Presenting Concern")).toBeInTheDocument();
  });
});

describe("signing by typing", () => {
  it("keeps the sign button disabled until both a name and a signature are given", async () => {
    await openReport(report({ client: null }));
    const signButton = screen.getByRole("button", { name: /Sign Document/ });
    expect(signButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada Lovelace" },
    });
    // A signature with no signer name is still not enough.
    expect(signButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Enter your full name"), {
      target: { value: "Ada Lovelace" },
    });
    expect(signButton).toBeEnabled();
  });

  it("stays disabled for a signature that is only whitespace", async () => {
    await openReport();
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeDisabled();
  });

  it("stays disabled when the signer name is blanked out", async () => {
    await openReport();
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your full name"), {
      target: { value: "  " },
    });
    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeDisabled();
  });

  it("previews the typed signature only once something is typed", async () => {
    await openReport();
    expect(document.body.querySelector(".crv-signature-preview-typed")).toBeNull();

    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada" },
    });
    expect(document.body.querySelector(".crv-signature-preview-typed")).toHaveTextContent("Ada");
  });

  it("sends the typed signature against the consent section and shows the receipt", async () => {
    await openReport();
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign Document/ }));

    await screen.findByText("Document Signed Successfully");
    expect(h.api.SignClinicalReport).toHaveBeenCalledWith({
      id: "s1",
      content: expect.objectContaining({
        signatureType: "type",
        signatureData: "Ada Lovelace",
        signerName: "Ada Lovelace",
      }),
    });
    expect(screen.getByText("Quarterly Review", { exact: false })).toBeInTheDocument();
  });

  it("sends no section id when the report has no consent section", async () => {
    await openReport(report({ sections: [{ id: "s2", section: "Notes", content: { a: "b" } }] }));
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign Document/ }));

    await screen.findByText("Document Signed Successfully");
    expect(h.api.SignClinicalReport).toHaveBeenCalledWith(
      expect.objectContaining({ id: undefined })
    );
  });

  it("warns and stays on the page when signing fails", async () => {
    h.api.SignClinicalReport.mockRejectedValue(new Error("nope"));
    await openReport();
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign Document/ }));

    expect(
      await screen.findByText("Failed to sign document. Please try again.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Document Signed Successfully")).toBeNull();
  });

  it("shows a busy state while the signature is in flight", async () => {
    let release;
    h.api.SignClinicalReport.mockReturnValue(new Promise((r) => (release = r)));
    await openReport();
    fireEvent.change(screen.getByPlaceholderText("Type your full name"), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign Document/ }));

    expect(await screen.findByText("Signing...")).toBeInTheDocument();
    await act(async () => {
      release({});
    });
    expect(await screen.findByText("Document Signed Successfully")).toBeInTheDocument();
  });
});

describe("signing by drawing", () => {
  const canvas = () => document.body.querySelector(".crv-signature-canvas");

  const chooseDraw = () => fireEvent.click(screen.getByRole("button", { name: "Draw" }));

  it("captures a stroke as a data url and enables signing", async () => {
    await openReport();
    chooseDraw();

    fireEvent.mouseDown(canvas(), { clientX: 5, clientY: 5 });
    fireEvent.mouseMove(canvas(), { clientX: 20, clientY: 20 });
    fireEvent.mouseUp(canvas());

    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /Sign Document/ }));
    await screen.findByText("Document Signed Successfully");
    expect(h.api.SignClinicalReport).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          signatureType: "draw",
          signatureData: "data:image/png;base64,DRAWN",
        }),
      })
    );
  });

  it("accepts a touch stroke as well as a mouse one", async () => {
    await openReport();
    chooseDraw();

    fireEvent.touchStart(canvas(), { touches: [{ clientX: 1, clientY: 1 }] });
    fireEvent.touchMove(canvas(), { touches: [{ clientX: 9, clientY: 9 }] });
    fireEvent.touchEnd(canvas(), { touches: [] });

    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeEnabled();
  });

  it("ignores movement that did not start with a press", async () => {
    await openReport();
    chooseDraw();
    fireEvent.mouseMove(canvas(), { clientX: 4, clientY: 4 });
    fireEvent.mouseUp(canvas());
    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeDisabled();
  });

  it("treats leaving the canvas mid-stroke as finishing it", async () => {
    await openReport();
    chooseDraw();
    fireEvent.mouseDown(canvas(), { clientX: 2, clientY: 2 });
    fireEvent.mouseLeave(canvas());
    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeEnabled();
  });

  it("clears the pad again", async () => {
    await openReport();
    chooseDraw();
    fireEvent.mouseDown(canvas(), { clientX: 2, clientY: 2 });
    fireEvent.mouseUp(canvas());

    fireEvent.click(screen.getByRole("button", { name: /Clear/ }));
    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeDisabled();
  });
});

describe("signing with an uploaded image", () => {
  const chooseUpload = () =>
    fireEvent.click(screen.getByRole("button", { name: "Upload Image" }));

  const fileInput = () => document.body.querySelector('input[type="file"]');

  const upload = (file) => fireEvent.change(fileInput(), { target: { files: [file] } });

  it("previews the image and enables signing", async () => {
    await openReport();
    chooseUpload();
    upload(new File(["sig"], "sig.png", { type: "image/png" }));

    const preview = await screen.findByAltText("Signature");
    expect(preview.getAttribute("src")).toMatch(/^data:image\/png/);
    expect(screen.getByRole("button", { name: /Sign Document/ })).toBeEnabled();
  });

  it("rejects a file that is not an image", async () => {
    await openReport();
    chooseUpload();
    upload(new File(["x"], "notes.txt", { type: "text/plain" }));

    expect(screen.getByText("Please upload an image file")).toBeInTheDocument();
    expect(screen.queryByAltText("Signature")).toBeNull();
  });

  it("rejects an image over five megabytes", async () => {
    await openReport();
    chooseUpload();
    const big = new File(["x"], "huge.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });
    upload(big);

    expect(screen.getByText("Image must be less than 5MB")).toBeInTheDocument();
  });

  it("ignores a change event with no file behind it", async () => {
    await openReport();
    chooseUpload();
    fireEvent.change(fileInput(), { target: { files: [] } });
    expect(document.body.querySelector(".crv-toast")).toBeNull();
  });

  it("lets the client remove the upload and start again", async () => {
    await openReport();
    chooseUpload();
    upload(new File(["sig"], "sig.png", { type: "image/png" }));
    await screen.findByAltText("Signature");

    fireEvent.click(document.body.querySelector(".crv-remove-upload"));
    expect(screen.queryByAltText("Signature")).toBeNull();
    expect(screen.getByText("Click to upload signature image")).toBeInTheDocument();
  });

  it("swaps the input area when the signature method changes", async () => {
    await openReport();
    expect(screen.getByPlaceholderText("Type your full name")).toBeInTheDocument();

    chooseUpload();
    expect(screen.queryByPlaceholderText("Type your full name")).toBeNull();
    expect(document.body.querySelector(".crv-signature-image-input")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Type" }));
    expect(screen.getByPlaceholderText("Type your full name")).toBeInTheDocument();
  });
});

describe("the toast", () => {
  it("can be dismissed by hand", async () => {
    await openReport();
    fireEvent.click(screen.getByRole("button", { name: "Upload Image" }));
    fireEvent.change(document.body.querySelector('input[type="file"]'), {
      target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });

    const toast = document.body.querySelector(".crv-toast");
    fireEvent.click(toast.querySelector("button"));
    expect(document.body.querySelector(".crv-toast")).toBeNull();
  });

  it("clears itself after four seconds", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await openReport();
      fireEvent.click(screen.getByRole("button", { name: "Upload Image" }));
      fireEvent.change(document.body.querySelector('input[type="file"]'), {
        target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
      });
      expect(document.body.querySelector(".crv-toast-error")).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(4100));
      expect(document.body.querySelector(".crv-toast")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("requesting a change", () => {
  const openModal = async () => {
    await openReport();
    fireEvent.click(screen.getByRole("button", { name: /Request Change/ }));
  };

  it("opens and closes from the header cross", async () => {
    await openModal();
    expect(screen.getByText("Describe the changes you would like to be made to this document."))
      .toBeInTheDocument();

    fireEvent.click(document.body.querySelector(".crv-modal-header button"));
    expect(document.body.querySelector(".crv-modal")).toBeNull();
  });

  it("closes from Cancel", async () => {
    await openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(document.body.querySelector(".crv-modal")).toBeNull();
  });

  it("closes when the backdrop is clicked but not the dialog itself", async () => {
    await openModal();
    fireEvent.click(document.body.querySelector(".crv-modal"));
    expect(document.body.querySelector(".crv-modal")).toBeInTheDocument();

    fireEvent.click(document.body.querySelector(".crv-modal-overlay"));
    expect(document.body.querySelector(".crv-modal")).toBeNull();
  });

  it("will not submit an empty or whitespace-only description", async () => {
    await openModal();
    const submit = screen.getByRole("button", { name: "Submit Request" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Describe the changes you'd like..."), {
      target: { value: "   " },
    });
    expect(submit).toBeDisabled();
  });

  it("submits, closes, clears the box and reloads the report", async () => {
    await openModal();
    fireEvent.change(screen.getByPlaceholderText("Describe the changes you'd like..."), {
      target: { value: "Please correct the date" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => expect(document.body.querySelector(".crv-modal")).toBeNull());
    expect(h.api.CreateClinicalReportChangeRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicalReportId: "rep-1",
        description: "Please correct the date",
        clientTenantId: "ct-1",
      })
    );
    expect(screen.getByText("Change request submitted successfully!")).toBeInTheDocument();
    // The refresh is a second read of the same report.
    expect(h.api.GetSingleClinicalReportById).toHaveBeenCalledTimes(2);
  });

  it("keeps the modal open and warns when the submission fails", async () => {
    h.api.CreateClinicalReportChangeRequest.mockRejectedValue(new Error("nope"));
    await openModal();
    fireEvent.change(screen.getByPlaceholderText("Describe the changes you'd like..."), {
      target: { value: "Please correct the date" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(await screen.findByText("Failed to submit change request")).toBeInTheDocument();
    expect(document.body.querySelector(".crv-modal")).toBeInTheDocument();
  });

  it("shows a spinner in place of the label while submitting", async () => {
    let release;
    h.api.CreateClinicalReportChangeRequest.mockReturnValue(new Promise((r) => (release = r)));
    await openModal();
    fireEvent.change(screen.getByPlaceholderText("Describe the changes you'd like..."), {
      target: { value: "Please correct the date" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => expect(document.body.querySelector(".spinner")).toBeInTheDocument());
    await act(async () => {
      release({});
    });
    await waitFor(() => expect(document.body.querySelector(".crv-modal")).toBeNull());
  });
});
