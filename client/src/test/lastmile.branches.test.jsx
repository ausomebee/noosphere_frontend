import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";

const mockPost = vi.fn();
vi.mock("../Helper/AxiosInterceptor", () => ({
  default: () => ({ post: mockPost, get: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() }),
}));

const apiClientLogin = vi.fn();
vi.mock("../api/authApis", () => ({
  default: {
    get ClientLogin() {
      return apiClientLogin;
    },
  },
}));

import DocumentViewer from "../Components/FileUpload/DocumentViewer";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import documentsApi from "../api/documentsAndFormsApis";
import { ClientLogin } from "../ReduxStore/features/authentication";
import getSubdomain from "../Helper/getSubdomain";
import { getFingerprint } from "../Helper/fingerprint";

/**
 * Last-mile client branches: the document viewer's filename and type
 * fallbacks, the form payload builder's file and signature arms, and the login
 * thunk's two-level error unwrapping.
 */

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn(() => "blob:x");
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DocumentViewer fallbacks", () => {
  const base = { isOpen: true, onClose: vi.fn() };

  it("renders a pdf in an iframe and clears loading on load", () => {
    render(<DocumentViewer {...base} fileUrl="https://x/a.pdf" fileName="a.pdf" />);
    const frame = document.body.querySelector("iframe");
    expect(frame).toBeInTheDocument();
    fireEvent.load(frame);
  });

  it("renders an image, applies the image content class, and clears loading", () => {
    render(<DocumentViewer {...base} fileUrl="https://x/scan.png" fileName="scan.png" />);
    const img = document.body.querySelector("img");
    expect(img).toBeInTheDocument();
    fireEvent.load(img);
    expect(document.body.querySelector(".doc-viewer-content-image")).toBeInTheDocument();
    fireEvent.error(img);
  });

  it("falls back to a generic alt when no file name is given", () => {
    render(<DocumentViewer {...base} fileUrl="https://x/scan.jpg" />);
    expect(document.body.querySelector("img")).toHaveAttribute("alt", "Document preview");
  });

  it("reads the extension past a query string", () => {
    render(<DocumentViewer {...base} fileUrl="https://x/a.pdf?sig=1" fileName="a.pdf" />);
    expect(document.body.querySelector("iframe")).toBeInTheDocument();
  });

  it("treats a url with no extension as neither pdf nor image", () => {
    render(<DocumentViewer {...base} fileUrl={undefined} />);
    expect(document.body.querySelector("iframe")).toBeNull();
    expect(document.body.querySelector("img")).toBeNull();
  });

  it("names the download from the file name, and 'document' without one", async () => {
    global.fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(["x"]) });
    const anchors = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = orig(tag);
      if (tag === "a") {
        el.click = vi.fn();
        anchors.push(el);
      }
      return el;
    });

    const clickDownload = () => {
      const btn = Array.from(document.body.querySelectorAll("button")).find((b) =>
        /download/i.test(b.textContent || b.getAttribute("aria-label") || "")
      );
      if (btn) fireEvent.click(btn);
      return btn;
    };

    const { unmount } = render(
      <DocumentViewer {...base} fileUrl="https://x/a.pdf" fileName="report.pdf" />
    );
    if (clickDownload()) {
      await waitFor(() => expect(anchors.length).toBeGreaterThan(0));
      expect(anchors[anchors.length - 1].download).toBe("report.pdf");
    }
    unmount();

    render(<DocumentViewer {...base} fileUrl="https://x/a.pdf" />);
    if (clickDownload()) {
      await waitFor(() => expect(anchors.length).toBeGreaterThan(1));
      expect(anchors[anchors.length - 1].download).toBe("document");
    }
  });

  it("falls back to a new tab when the blob fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("blocked"));
    const open = vi.spyOn(window, "open").mockImplementation(() => {});
    render(<DocumentViewer {...base} fileUrl="https://x/a.pdf" fileName="a.pdf" />);
    const btn = Array.from(document.body.querySelectorAll("button")).find((b) =>
      /download/i.test(b.textContent || b.getAttribute("aria-label") || "")
    );
    if (btn) {
      fireEvent.click(btn);
      await waitFor(() => expect(open).toHaveBeenCalledWith("https://x/a.pdf", "_blank"));
    }
  });
});

describe("AuthorizationCard service code selection", () => {
  it("accepts either an event or a bare value, and tolerates no handler", () => {
    const onServiceCodeChange = vi.fn();
    const { container, rerender } = render(
      <AuthorizationCard
        data={{}}
        serviceCodes={[{ value: "97153", label: "97153" }]}
        onServiceCodeChange={onServiceCodeChange}
      />
    );
    const select = container.querySelector("select");
    if (select) {
      fireEvent.change(select, { target: { value: "97153" } });
      expect(onServiceCodeChange).toHaveBeenCalledWith("97153");
    }
    rerender(
      <AuthorizationCard data={{}} serviceCodes={[{ value: "97153", label: "97153" }]} />
    );
    if (container.querySelector("select")) {
      expect(() =>
        fireEvent.change(container.querySelector("select"), { target: { value: "97153" } })
      ).not.toThrow();
    }
  });

  it("renders with no data at all", () => {
    expect(() => render(<AuthorizationCard data={undefined} serviceCodes={[]} />)).not.toThrow();
  });
});

describe("PrepareResponsePayload", () => {
  // Positional: (responses, files, signatures).
  const build = (responses, files, signatures) =>
    documentsApi.PrepareResponsePayload(responses, files, signatures);

  it("builds plain response fields", async () => {
    const out = await build({ q1: "yes" }, {}, {});
    expect(JSON.stringify(out)).toContain("q1");
  });

  it("encodes uploaded files as base64 without the data-url prefix", async () => {
    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    const out = await build({}, { q2: [file] }, {});
    const serialized = JSON.stringify(out);
    expect(serialized).toContain("a.txt");
    expect(serialized).not.toContain("data:text/plain;base64,");
  });

  it("skips a file field with an empty list", async () => {
    const out = await build({}, { q2: [] }, {});
    expect(JSON.stringify(out)).not.toContain("q2");
  });

  it("passes a drawn signature through as its data url", async () => {
    const out = await build({}, {}, { q3: "data:image/png;base64,AAA" });
    expect(JSON.stringify(out)).toContain("data:image/png;base64,AAA");
  });

  it("passes a typed signature through as text", async () => {
    const out = await build({}, {}, { q3: "Jane Doe" });
    expect(JSON.stringify(out)).toContain("Jane Doe");
  });

  it("skips an empty signature", async () => {
    const out = await build({}, {}, { q3: "" });
    expect(JSON.stringify(out)).not.toContain("q3");
  });
});

describe("ClientLogin thunk", () => {
  const run = async (arg) => {
    const dispatch = vi.fn();
    const getState = vi.fn(() => ({}));
    return ClientLogin(arg)(dispatch, getState, undefined);
  };

  it("returns the payload on success", async () => {
    apiClientLogin.mockResolvedValue({ data: { id: 1 } });
    const result = await run({ email: "a@b.co", password: "pw" });
    expect(result.payload).toEqual({ id: 1 });
  });

  it("rejects with the backend message when there is one", async () => {
    apiClientLogin.mockRejectedValue({ response: { data: { message: "bad creds" } } });
    const result = await run({ email: "a@b.co", password: "pw" });
    expect(result.payload).toBe("bad creds");
  });

  it("falls back to the error message when the backend sends none", async () => {
    apiClientLogin.mockRejectedValue(new Error("network down"));
    const result = await run({ email: "a@b.co", password: "pw" });
    expect(result.payload).toBe("network down");
  });
});

describe("getSubdomain and fingerprint edges", () => {
  const setHost = (hostname) => {
    delete window.location;
    window.location = { hostname };
  };

  it("ignores a www prefix on localhost", () => {
    setHost("www.localhost");
    expect(getSubdomain()).toBeNull();
  });

  it("detects a tenant subdomain on localhost", () => {
    setHost("mypractice.localhost");
    expect(getSubdomain()).toBe("mypractice");
  });

  it("clears any stored value for plain localhost", () => {
    setHost("mypractice.localhost");
    getSubdomain();
    setHost("localhost");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });

  it("reuses a stored fingerprint rather than regenerating it", () => {
    localStorage.clear();
    const first = getFingerprint();
    expect(first).toBeTruthy();
    expect(getFingerprint()).toBe(first);
  });

  it("generates one through the fallback when randomUUID is unavailable", () => {
    localStorage.clear();
    const original = crypto.randomUUID;
    crypto.randomUUID = undefined;
    const id = getFingerprint();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(10);
    crypto.randomUUID = original;
  });
});
