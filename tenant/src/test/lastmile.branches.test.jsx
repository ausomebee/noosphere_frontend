import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";

const adminLogin = vi.fn();
const adminOnboarding = vi.fn();
vi.mock("../api/authApis", () => ({
  default: {
    get AdminLogin() {
      return adminLogin;
    },
    get AdminOnboarding() {
      return adminOnboarding;
    },
  },
}));

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

const mockUser = { value: null };
vi.mock("../hooks/useAuth", () => ({
  default: () => ({ user: mockUser.value }),
}));

import authReducer, { AdminLogin, OnboardAdmin } from "../ReduxStore/features/authentication";
import roleDraftReducer, { togglePermission } from "../ReduxStore/features/roleDraftSlice";
import usePermissions from "../hooks/usePermissions";
import useDocumentViewer, { DocumentViewerProvider } from "../hooks/useDocumentViewer";
import getSubdomain from "../Helper/getSubdomain";
import DeleteConfirmationModal from "../Components/ReusableModal/PipelineModal/DeleteConfirmationModal";
import FormLibraryModal from "../Components/ReusableModal/ClientModal/FormLibraryModal";
import ProgramLibraryModal from "../Components/ReusableModal/ClientModal/ProgramLibraryModal";
import { SelectInput } from "../Components/Input/Inputs";

/**
 * The last remaining arms: the auth thunks' error wording (reachable only with
 * the API layer mocked away), the library modals' import-failure and empty
 * states, the delete modal's footer-centring rules, and the permission hook's
 * legacy-key aliasing.
 */

const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.value = null;
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("auth thunk error wording", () => {
  const makeStore = () => configureStore({ reducer: { authentication: authReducer } });

  it("prefers the message the API returned when signing in", async () => {
    adminLogin.mockRejectedValue({ response: { data: { message: "Wrong password" } } });
    const store = makeStore();
    const result = await store.dispatch(AdminLogin({ email: "a@b.co", password: "x" }));
    expect(result.payload).toBe("Wrong password");
    expect(store.getState().authentication.error).toBe("Wrong password");
  });

  it("falls back to the thrown error's own message when signing in", async () => {
    adminLogin.mockRejectedValue(new Error("Login failed"));
    const store = makeStore();
    const result = await store.dispatch(AdminLogin({ email: "a@b.co", password: "x" }));
    expect(result.payload).toBe("Login failed");
  });

  it("signs the user in on success", async () => {
    adminLogin.mockResolvedValue({ data: { data: { accessToken: "at" } } });
    const store = makeStore();
    await store.dispatch(AdminLogin({ email: "a@b.co", password: "x" }));
    expect(store.getState().authentication.isAuthenticated).toBe(true);
  });

  it("prefers the API's message when onboarding, and falls back otherwise", async () => {
    adminOnboarding.mockRejectedValue({ response: { data: { message: "Link expired" } } });
    let store = makeStore();
    let result = await store.dispatch(OnboardAdmin({ id: "u", password: "x" }));
    expect(result.payload).toBe("Link expired");

    adminOnboarding.mockRejectedValue(new Error("Admin Onboarding failed"));
    store = makeStore();
    result = await store.dispatch(OnboardAdmin({ id: "u", password: "x" }));
    expect(result.payload).toBe("Admin Onboarding failed");
  });

  it("signs the user in after onboarding", async () => {
    adminOnboarding.mockResolvedValue({ data: { data: { accessToken: "at" } } });
    const store = makeStore();
    await store.dispatch(OnboardAdmin({ id: "u", password: "x" }));
    expect(store.getState().authentication.isAuthenticated).toBe(true);
  });
});

describe("usePermissions legacy key aliasing", () => {
  it("grants the module-specific key for a role saved with the shared one", () => {
    mockUser.value = {
      role: {
        roleModuleAccesses: [
          { module: "CLIENTS", permissions: ["edit_program"] },
          { module: "PROGRAM_LIBRARY", permissions: ["delete_program"] },
        ],
      },
    };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission("edit_client_program")).toBe(true);
    expect(result.current.hasPermission("delete_library_program")).toBe(true);
  });

  it("copes with a module access that lists no permissions", () => {
    mockUser.value = { role: { roleModuleAccesses: [{ module: "CLIENTS" }] } };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission("anything")).toBe(false);
  });

  it("treats a user with no explicit access as an owner", () => {
    mockUser.value = { role: { roleModuleAccesses: [] } };
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission("anything")).toBe(true);
  });
});

describe("roleDraft togglePermission on a known module", () => {
  it("reuses the bucket the blank map already provides", () => {
    const before = roleDraftReducer(undefined, { type: "@@INIT" });
    const [moduleKey] = Object.keys(before.permissions);
    const [subcatKey] = Object.keys(before.permissions[moduleKey]);
    const [permKey] = Object.keys(before.permissions[moduleKey][subcatKey]);

    const after = roleDraftReducer(before, togglePermission({ moduleKey, subcatKey, permKey }));
    expect(after.permissions[moduleKey][subcatKey][permKey]).toBe(
      !before.permissions[moduleKey][subcatKey][permKey]
    );
  });
});

describe("useDocumentViewer download", () => {
  const Harness = ({ name }) => {
    const { downloadDocument } = useDocumentViewer();
    return <button onClick={() => downloadDocument("https://x/a.pdf", name)}>go</button>;
  };

  const renderHarness = (name) =>
    render(
      <DocumentViewerProvider>
        <Harness name={name} />
      </DocumentViewerProvider>
    );

  const captureAnchors = () => {
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
    return anchors;
  };

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:x");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("uses the supplied file name", async () => {
    global.fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    renderHarness("report.pdf");
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe("report.pdf");
  });

  it("falls back to a generic name when none is given", async () => {
    global.fetch = vi.fn().mockResolvedValue({ blob: async () => new Blob(["x"]) });
    const anchors = captureAnchors();
    renderHarness(undefined);
    fireEvent.click(screen.getByText("go"));
    await waitFor(() => expect(anchors.length).toBe(1));
    expect(anchors[0].download).toBe("document");
  });

  it("opens the file in a new tab when the fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    const open = vi.spyOn(window, "open").mockImplementation(() => {});
    renderHarness("report.pdf");
    fireEvent.click(screen.getByText("go"));
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith("https://x/a.pdf", "_blank")
    );
  });
});

describe("getSubdomain host shapes", () => {
  const setHost = (hostname) => {
    delete window.location;
    window.location = { hostname };
  };

  it("extracts a real tenant subdomain and stores it", () => {
    setHost("mypractice.nooshere.org");
    expect(getSubdomain()).toBe("mypractice");
    expect(localStorage.getItem("subDomain")).toBe("mypractice");
  });

  it("treats the www host and the bare root as no tenant", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("www.nooshere.org");
    expect(getSubdomain()).toBeNull();
    setHost("nooshere.org");
    expect(getSubdomain()).toBeNull();
  });

  it("rejects a www prefix on an unrecognised root domain", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("www.example.com");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });

  it("falls back to no subdomain for a two-part host", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("example.com");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });
});

describe("DeleteConfirmationModal footer variants", () => {
  const open = (props) =>
    render(
      <DeleteConfirmationModal
        isOpen
        onClose={noop}
        onConfirm={noop}
        title="Delete stage"
        message="This cannot be undone."
        confirmButtonText="Delete"
        {...props}
      />
    );

  it("renders the default alert icon", () => {
    open({});
    expect(screen.getByText("Delete stage")).toBeInTheDocument();
    expect(document.body.querySelector(".warning-icon")).toBeInTheDocument();
  });

  it("renders a caller-supplied icon instead", () => {
    const Icon = (props) => <svg data-testid="custom-icon" {...props} />;
    open({ icon: Icon });
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  // ReusableModal decides what to render from the button *text* props; it has
  // no showPrimaryButton/showSecondaryButton/footerClassName props, so these
  // three only pick a class name that is then dropped. Both buttons stay on
  // screen either way. No caller in the app passes false, so nothing depends
  // on them hiding anything.
  it("still renders both buttons when the secondary is switched off", () => {
    open({ showSecondaryButton: false });
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("still renders both buttons when the confirm is switched off", () => {
    open({ showConfirmButton: false });
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows both buttons by default", () => {
    open({});
    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});

describe("FormLibraryModal", () => {
  const forms = Array.from({ length: 9 }, (_, i) => ({
    id: `f${i}`,
    name: `Form ${i}`,
  }));

  it("shows a loader while the list is fetching", () => {
    render(<FormLibraryModal isOpen onClose={noop} onSelectForm={noop} loading />);
    expect(document.body.querySelector(".section-loader")).toBeInTheDocument();
  });

  it("says so when the library is empty, and when a search matches nothing", () => {
    render(<FormLibraryModal isOpen onClose={noop} onSelectForm={noop} forms={[]} />);
    expect(screen.getByText(/No forms/i)).toBeInTheDocument();
  });

  it("paginates once past a single page", () => {
    render(<FormLibraryModal isOpen onClose={noop} onSelectForm={noop} forms={forms} />);
    expect(document.body.querySelector(".pagination")).toBeInTheDocument();
  });

  it("does not paginate a single page", () => {
    render(
      <FormLibraryModal isOpen onClose={noop} onSelectForm={noop} forms={forms.slice(0, 2)} />
    );
    expect(document.body.querySelector(".pagination")).toBeNull();
  });

  it("closes after a successful import", async () => {
    const onClose = vi.fn();
    const onSelectForm = vi.fn().mockResolvedValue(undefined);
    render(
      <FormLibraryModal
        isOpen
        onClose={onClose}
        onSelectForm={onSelectForm}
        forms={forms.slice(0, 1)}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /use/i })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("reports an import failure and stays open", async () => {
    const onClose = vi.fn();
    const onSelectForm = vi.fn().mockRejectedValue(new Error("Import blew up"));
    render(
      <FormLibraryModal
        isOpen
        onClose={onClose}
        onSelectForm={onSelectForm}
        forms={forms.slice(0, 1)}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /use/i })[0]);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Import blew up", "error"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("falls back to its own wording when the failure carries no message", async () => {
    const onSelectForm = vi.fn().mockRejectedValue({});
    render(
      <FormLibraryModal
        isOpen
        onClose={noop}
        onSelectForm={onSelectForm}
        forms={forms.slice(0, 1)}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /use/i })[0]);
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Failed to import form", "error")
    );
  });
});

describe("ProgramLibraryModal", () => {
  const programs = Array.from({ length: 9 }, (_, i) => ({
    id: `p${i}`,
    name: `Program ${i}`,
  }));

  it("shows a loading line while fetching", () => {
    render(<ProgramLibraryModal isOpen onClose={noop} onSelectProgram={noop} loading />);
    expect(screen.getByText("Loading programs...")).toBeInTheDocument();
  });

  it("says the library is empty, then that a search found nothing", () => {
    render(
      <ProgramLibraryModal isOpen onClose={noop} onSelectProgram={noop} programs={[]} />
    );
    expect(screen.getByText("No programs in library")).toBeInTheDocument();

    fireEvent.change(document.body.querySelector('input[type="text"]'), {
      target: { value: "zzz" },
    });
    expect(screen.getByText("No programs found")).toBeInTheDocument();
  });

  it("paginates once past a single page, and not before", () => {
    const { unmount } = render(
      <ProgramLibraryModal isOpen onClose={noop} onSelectProgram={noop} programs={programs} />
    );
    expect(document.body.querySelector(".pagination")).toBeInTheDocument();
    unmount();

    render(
      <ProgramLibraryModal
        isOpen
        onClose={noop}
        onSelectProgram={noop}
        programs={programs.slice(0, 2)}
      />
    );
    expect(document.body.querySelector(".pagination")).toBeNull();
  });

  it("closes after a successful import", async () => {
    const onClose = vi.fn();
    const onSelectProgram = vi.fn().mockResolvedValue(undefined);
    render(
      <ProgramLibraryModal
        isOpen
        onClose={onClose}
        onSelectProgram={onSelectProgram}
        programs={programs.slice(0, 1)}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /select|import|use/i })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("reports an import failure, and falls back to its own wording", async () => {
    const onSelectProgram = vi.fn().mockRejectedValue(new Error("Import blew up"));
    const { unmount } = render(
      <ProgramLibraryModal
        isOpen
        onClose={noop}
        onSelectProgram={onSelectProgram}
        programs={programs.slice(0, 1)}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /select|import|use/i })[0]);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith("Import blew up", "error"));
    unmount();

    const bare = vi.fn().mockRejectedValue({});
    render(
      <ProgramLibraryModal
        isOpen
        onClose={noop}
        onSelectProgram={bare}
        programs={programs.slice(0, 1)}
      />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /select|import|use/i })[0]);
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith("Failed to import program", "error")
    );
  });
});

describe("SelectInput multi with no value yet", () => {
  it("renders an empty multi select when the value prop is undefined", () => {
    const { container } = render(
      <SelectInput
        label="Kind"
        options={[{ value: "a", label: "Alpha" }]}
        onChange={noop}
        isMulti
      />
    );
    expect(container.querySelector(".input-select")).toBeInTheDocument();
    expect(screen.getByText("-- Select Kind --")).toBeInTheDocument();
  });
});
