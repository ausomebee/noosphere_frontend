import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

/**
 * The client portal settings modal: one master switch that reveals the portal
 * address and two permission switches, saved in a single call.
 *
 * The part with the most branching is the portal address. It is built from the
 * tenant's subdomain in redux plus the apex of whatever host the admin happens
 * to be on, and "the apex" is worked out by hand — localhost, a *.localhost, an
 * AWS host and a bare IP all collapse to the production apex, anything else
 * keeps its last two labels, and a host with only one label keeps itself. Each
 * of those is a separate test, driven by redefining `window.location` (which
 * jsdom will not let a test assign to directly).
 *
 * `initialData` also lands in the open effect's dependency list, so it is
 * always passed from a module-level constant here.
 */

const api = vi.hoisted(() => vi.fn());
vi.mock("../api/clientPanelApis", () => ({
  default: { UpdateClientPortalAccess: api },
}));

const toast = vi.hoisted(() => ({ showToast: vi.fn(), showApiError: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: (...a) => toast.showApiError(...a),
}));

import ClientPortalSettingsModal from "../Components/ReusableModal/ClientModal/ClientAccessModal";

// The modal only reads two slices, so they are stubbed as constant reducers
// rather than dragged in whole.
const makeStore = ({ user = {}, subdomain = "acme" } = {}) =>
  configureStore({
    reducer: {
      authentication: () => ({
        user: user === null ? null : { accessToken: "access-1", refreshToken: "refresh-1", ...user },
      }),
      subDomain: () => ({ subdomain }),
    },
  });

// Effect dependency: never a fresh literal.
const NOTHING_STORED = {};

const renderModal = ({ store, initialData = NOTHING_STORED, ...props } = {}) => {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  const view = render(
    <Provider store={store ?? makeStore()}>
      <ClientPortalSettingsModal
        isOpen
        onClose={onClose}
        onSaved={onSaved}
        clientTenantId="client-1"
        initialData={initialData}
        {...props}
      />
    </Provider>
  );
  return { ...view, onClose, onSaved };
};

const switches = () => Array.from(document.body.querySelectorAll(".switch input"));
const portalSwitch = () => switches()[0];
const rescheduleSwitch = () => switches()[1];
const documentSwitch = () => switches()[2];
const portalUrl = () => document.body.querySelector('input[readonly]')?.value;
const primary = () => document.body.querySelector(".modal-btn:not(.modal-btn-secondary)");
const secondary = () => document.body.querySelector(".modal-btn-secondary");
const save = async () => act(async () => { fireEvent.click(primary()); });

let originalLocation;
const writeText = vi.fn();

const setHost = (hostname, origin = `https://${hostname}`) => {
  Object.defineProperty(window, "location", {
    value: { hostname, origin },
    writable: true,
    configurable: true,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  api.mockResolvedValue({ data: { success: true } });
  originalLocation = window.location;
  setHost("app.nooshere.org");
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    writable: true,
    configurable: true,
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
  vi.restoreAllMocks();
});

describe("the modal shell", () => {
  it("renders nothing while closed", () => {
    renderModal({ isOpen: false });
    expect(document.body.querySelector(".modal-content")).toBeNull();
  });

  it("opens with the portal switched off and everything else hidden", () => {
    renderModal();
    expect(document.body.querySelector(".modal-title-text")).toHaveTextContent(
      "Client Portal Settings"
    );
    expect(portalSwitch()).not.toBeChecked();
    expect(switches()).toHaveLength(1);
    expect(
      screen.getByText("Enable the client portal to configure access and permissions")
    ).toBeInTheDocument();
  });

  it("closes from Cancel", () => {
    const { onClose } = renderModal();
    fireEvent.click(secondary());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes from Escape", () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("opening on the stored settings", () => {
  it("switches the portal on for a client that already has it", () => {
    const STORED = Object.freeze({ clientPortalAccess: true, documentAccess: true });
    renderModal({ initialData: STORED });
    expect(portalSwitch()).toBeChecked();
    expect(documentSwitch()).toBeChecked();
    // Rescheduling is on unless the record explicitly says otherwise.
    expect(rescheduleSwitch()).toBeChecked();
  });

  it("honours a record that switched rescheduling off", () => {
    const STORED = Object.freeze({
      clientPortalAccess: true,
      requestAppointment: false,
    });
    renderModal({ initialData: STORED });
    expect(rescheduleSwitch()).not.toBeChecked();
    expect(documentSwitch()).not.toBeChecked();
  });

  it("treats a record with nothing in it as a portal that is switched off", () => {
    renderModal();
    expect(portalSwitch()).not.toBeChecked();
  });
});

describe("the portal address", () => {
  const openEnabled = () => {
    const ENABLED = Object.freeze({ clientPortalAccess: true });
    return renderModal({ initialData: ENABLED });
  };

  it("puts the tenant's subdomain in front of the apex of the current host", () => {
    setHost("admin.nooshere.org");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.nooshere.org/client/");
  });

  it("uses the production apex when the admin is on localhost", () => {
    setHost("localhost");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.nooshere.org/client/");
  });

  it("uses the production apex on a subdomain of localhost", () => {
    setHost("acme.localhost");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.nooshere.org/client/");
  });

  it("uses the production apex on a raw AWS host", () => {
    setHost("ec2-1-2-3-4.compute.amazonaws.com");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.nooshere.org/client/");
  });

  it("uses the production apex on a bare IP address", () => {
    setHost("192.168.0.14");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.nooshere.org/client/");
  });

  // A single-label host has no apex to trim down to, so it is used whole.
  it("keeps a one-label host as the apex", () => {
    setHost("intranet");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.intranet/client/");
  });

  it("keeps only the last two labels of a deeper host", () => {
    setHost("a.b.c.example.com");
    openEnabled();
    expect(portalUrl()).toBe("https://acme.example.com/client/");
  });

  it("falls back to the current origin when the tenant has no subdomain", () => {
    setHost("app.nooshere.org", "https://app.nooshere.org");
    const ENABLED = Object.freeze({ clientPortalAccess: true });
    renderModal({ store: makeStore({ subdomain: null }), initialData: ENABLED });
    expect(portalUrl()).toBe("https://app.nooshere.org/client/");
  });

  it("copies the address to the clipboard", () => {
    openEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Copy portal link" }));
    expect(writeText).toHaveBeenCalledWith("https://acme.nooshere.org/client/");
    expect(toast.showToast).toHaveBeenCalledWith("Link copied to clipboard!", "success");
  });
});

describe("the switches", () => {
  it("reveals the address and the permissions when the portal is switched on", () => {
    renderModal();
    fireEvent.click(portalSwitch());
    expect(switches()).toHaveLength(3);
    expect(portalUrl()).toBe("https://acme.nooshere.org/client/");
    expect(
      screen.queryByText("Enable the client portal to configure access and permissions")
    ).toBeNull();
  });

  it("hides them again when the portal is switched back off", () => {
    const ENABLED = Object.freeze({ clientPortalAccess: true });
    renderModal({ initialData: ENABLED });
    fireEvent.click(portalSwitch());
    expect(switches()).toHaveLength(1);
    expect(portalUrl()).toBeUndefined();
  });

  it("turns each permission on and off in turn", () => {
    const ENABLED = Object.freeze({ clientPortalAccess: true });
    renderModal({ initialData: ENABLED });
    fireEvent.click(rescheduleSwitch());
    expect(rescheduleSwitch()).not.toBeChecked();
    fireEvent.click(documentSwitch());
    expect(documentSwitch()).toBeChecked();
  });
});

describe("saving", () => {
  it("sends the switches, the client and the tokens", async () => {
    const ENABLED = Object.freeze({ clientPortalAccess: true });
    const { onClose, onSaved } = renderModal({ initialData: ENABLED });
    fireEvent.click(documentSwitch());
    await save();
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith({
      clientTenantId: "client-1",
      documentAccess: true,
      dbAccess: true,
      requestAppointment: true,
      accessToken: "access-1",
      refreshToken: "refresh-1",
    });
    expect(toast.showToast).toHaveBeenCalledWith(
      "Portal settings saved successfully",
      "success"
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("saves the switched-off state just as readily", async () => {
    renderModal();
    await save();
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(api.mock.calls[0][0]).toMatchObject({
      dbAccess: false,
      documentAccess: false,
      requestAppointment: true,
    });
  });

  it("sends no tokens when nobody is signed in", async () => {
    renderModal({ store: makeStore({ user: null }) });
    await save();
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(api.mock.calls[0][0].accessToken).toBeUndefined();
  });

  it("saves nothing without a client to save it against", async () => {
    const { onClose } = renderModal({ clientTenantId: null });
    await save();
    expect(toast.showToast).toHaveBeenCalledWith("Client not found", "error");
    expect(api).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not mind a caller that supplied no refresh callback", async () => {
    const { onClose } = renderModal({ onSaved: undefined });
    await save();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("reports a refused save and leaves the modal open", async () => {
    const err = new Error("500");
    api.mockRejectedValue(err);
    const { onClose, onSaved } = renderModal();
    await save();
    await waitFor(() =>
      expect(toast.showApiError).toHaveBeenCalledWith(err, "SAVE_CLIENT_SETTINGS")
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks the Save button while the request is in flight", async () => {
    let release;
    api.mockReturnValue(new Promise((r) => { release = r; }));
    renderModal();
    await save();
    await waitFor(() => expect(primary()).toBeDisabled());
    await act(async () => { release({}); });
    await waitFor(() => expect(primary()).not.toBeDisabled());
  });
});
