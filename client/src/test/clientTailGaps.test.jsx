import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";

const showToast = vi.fn();
vi.mock("../Helper/ShowToast", () => ({ showToast: (...a) => showToast(...a) }));

import Button from "../Components/Button/Button";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import { SelectInput, SearchableSelectInput } from "../Components/Input/Inputs";
import usePageTitle from "../hooks/usePageTitle";
import useIdleTimeout from "../hooks/useIdleTimeout";
import formBuilderReducer, { loadForm } from "../ReduxStore/features/formBuilderSlice";

/**
 * The last few branches nothing else reaches.
 *
 * These are the arms of small shared pieces that the pages exercising them
 * always happen to take the other way: a button clicked while it is disabled,
 * a select handed a bare value instead of an event, a page title cleared, a
 * form loaded with no ids on it. Each is cheap to reach directly and expensive
 * to arrange through the screens that use them.
 */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the shared button", () => {
  it("runs its handler when it is live", () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onClick).toHaveBeenCalled();
  });

  it("swallows the click when it is disabled", () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} disabled />);
    fireEvent.click(screen.getByText("Save"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("swallows the click while it is busy", () => {
    const onClick = vi.fn();
    render(<Button label="Save" onClick={onClick} loading />);
    // A busy button is labelled "Loading" rather than by its own text.
    fireEvent.click(screen.getByLabelText("Loading"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("the authorization card's picker", () => {
  const options = [{ value: "sc1", label: "97153 - Treatment" }];

  it("reads a value delivered as an event", () => {
    const onServiceCodeChange = vi.fn();
    render(
      <AuthorizationCard
        data={null}
        serviceCodeOptions={options}
        onServiceCodeChange={onServiceCodeChange}
      />
    );
    const input = document.body.querySelector(".service-type-selector input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onServiceCodeChange).toHaveBeenCalledWith("sc1");
  });

  it("renders zeroes with no authorization selected", () => {
    render(<AuthorizationCard data={null} serviceCodeOptions={[]} />);
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("copes with no change handler wired up", () => {
    render(<AuthorizationCard data={null} serviceCodeOptions={options} />);
    const input = document.body.querySelector(".service-type-selector input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(() => fireEvent.keyDown(input, { key: "Enter" })).not.toThrow();
  });
});

describe("the select inputs", () => {
  const options = [
    { value: "a", label: "Apples" },
    { value: "b", label: "Bananas" },
  ];

  it("reports a multi-select as a list of values", () => {
    const onChange = vi.fn();
    render(<SelectInput label="Fruit" options={options} isMulti onChange={onChange} value={[]} />);
    const input = document.body.querySelector("input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ value: ["a"] }) })
    );
  });

  it("reports a cleared single select as an empty value", () => {
    const onChange = vi.fn();
    render(
      <SelectInput label="Fruit" options={options} onChange={onChange} value="a" isClearable />
    );
    // react-select clears the current value on Backspace, which is the one
    // route to `newVal` being null and the empty-string fallback taking over.
    fireEvent.keyDown(document.body.querySelector(".rs__control input"), {
      key: "Backspace",
    });
    expect(onChange).toHaveBeenLastCalledWith({
      target: { name: undefined, value: "" },
    });
  });

  it("reports a cleared searchable select as an empty value too", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelectInput
        label="Fruit"
        options={options}
        onChange={onChange}
        value="a"
        name="fruit"
        isClearable
      />
    );
    fireEvent.keyDown(document.body.querySelector(".rs__control input"), {
      key: "Backspace",
    });
    expect(onChange).toHaveBeenLastCalledWith({
      target: { name: "fruit", value: "" },
    });
  });

  it("reports a searchable select's choice", () => {
    const onChange = vi.fn();
    render(
      <SearchableSelectInput label="Fruit" options={options} onChange={onChange} name="fruit" />
    );
    const input = document.body.querySelector("input");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({ target: { name: "fruit", value: "a" } });
  });

  it("measures its menu placement on a scroll", () => {
    render(<SelectInput label="Fruit" options={options} onChange={vi.fn()} value="" />);
    // The listener runs against a ref that jsdom gives no geometry; it must not
    // throw when the element has since gone.
    expect(() => fireEvent.scroll(window)).not.toThrow();
    expect(() => window.dispatchEvent(new Event("resize"))).not.toThrow();
  });
});

describe("the page title", () => {
  it("appends the product name to a page's own title", () => {
    renderHook(() => usePageTitle("Dashboard"));
    expect(document.title).toBe("Dashboard | Noosphere");
  });

  it("falls back to the product name alone", () => {
    renderHook(() => usePageTitle(""));
    expect(document.title).toBe("Noosphere");
  });
});

describe("the idle timeout", () => {
  // The hook reaches for the store, the router and the socket on logout, so it
  // needs the whole surround even though only its default argument is at issue.
  const wrapper = ({ children }) => (
    <Provider store={configureStore({ reducer: { auth: (s = {}) => s } })}>
      <MemoryRouter>{children}</MemoryRouter>
    </Provider>
  );

  it("accepts a timeout of its own", () => {
    expect(() => renderHook(() => useIdleTimeout(1000), { wrapper })).not.toThrow();
  });

  it("falls back to its default half-hour", () => {
    expect(() => renderHook(() => useIdleTimeout(), { wrapper })).not.toThrow();
  });
});

describe("loading a form into the builder slice", () => {
  const store = () => configureStore({ reducer: { formBuilder: formBuilderReducer } });

  it("keeps the ids the form arrived with", () => {
    const s = store();
    s.dispatch(loadForm({ formName: "Intake", elements: [], formId: "f1", tenantId: "t1" }));
    expect(s.getState().formBuilder.formId).toBe("f1");
    expect(s.getState().formBuilder.tenantId).toBe("t1");
  });

  it("nulls the ids a form arrived without", () => {
    const s = store();
    s.dispatch(loadForm({ formName: "Intake", elements: [] }));
    expect(s.getState().formBuilder.formId).toBeNull();
    expect(s.getState().formBuilder.tenantId).toBeNull();
  });
});

describe("development-only guards", () => {
  it("keeps quiet about a caught render error in production", async () => {
    vi.stubEnv("DEV", false);
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: ErrorBoundary } = await import("../Helper/ErrorBoundary");
    const Boom = () => {
      throw new Error("render exploded");
    };
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    // React logs the error itself; what must not appear is the boundary's own
    // development-only line.
    const ours = spy.mock.calls.filter(
      ([first]) => typeof first === "string" && first.includes("Error caught by ErrorBoundary")
    );
    expect(ours).toHaveLength(0);
    vi.unstubAllEnvs();
  });

  it("only audits the notification fallback table in development", async () => {
    vi.stubEnv("DEV", false);
    vi.resetModules();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await import("../Data/notificationConfig");
    const ours = spy.mock.calls.filter(
      ([first]) => typeof first === "string" && first.includes("notificationConfig")
    );
    expect(ours).toHaveLength(0);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("loading a raw API form into the builder slice", () => {
  // The slice's second path takes the API envelope untransformed, and does its
  // own field transform -- including its own copy of the file-size parser.
  const store = () => configureStore({ reducer: { formBuilder: formBuilderReducer } });

  const raw = (fields, over = {}) => ({
    formData: { id: "f1", tenantId: "t1", name: "Intake", fields, ...over },
  });

  it("keeps the ids and name the envelope carries", () => {
    const s = store();
    s.dispatch(loadForm(raw([])));
    const state = s.getState().formBuilder;
    expect(state.formId).toBe("f1");
    expect(state.tenantId).toBe("t1");
    expect(state.formName).toBe("Intake");
    expect(state.status).toBe("published");
  });

  it("nulls the ids and names the form when the envelope carries none", () => {
    const s = store();
    s.dispatch(
      loadForm({ formData: { fields: [], isDraft: true } })
    );
    const state = s.getState().formBuilder;
    expect(state.formId).toBeNull();
    expect(state.tenantId).toBeNull();
    expect(state.formName).toBe("Untitled Form");
    expect(state.status).toBe("draft");
    expect(state.isPublished).toBe(false);
  });

  it.each([
    ["a size with a unit", "25 MB", 25],
    ["a size in kilobytes", "512KB", 0.5],
    ["a size in gigabytes", "1GB", 1024],
    ["a plain number", 5, 5],
    ["a size it cannot parse", "loads", 10],
    ["no size at all", undefined, 10],
  ])("reads %s on an upload field", (_case, maxSize, expected) => {
    const s = store();
    s.dispatch(
      loadForm(
        raw([
          {
            id: 1,
            fieldType: "fileUpload",
            label: "Attach",
            fileUpload: [{ maxSize, maxFiles: "2" }],
          },
        ])
      )
    );
    expect(s.getState().formBuilder.elements[0].maxFileSize).toBe(expected);
  });

  it("defaults an upload field with no configuration at all", () => {
    const s = store();
    s.dispatch(loadForm(raw([{ id: 1, fieldType: "fileUpload", label: "Attach" }])));
    const el = s.getState().formBuilder.elements[0];
    expect(el.maxFiles).toBe(1);
    expect(el.maxFileSize).toBe(10);
    expect(el.allowedFileTypes).toEqual(["Image", "PDF"]);
  });

  it("keeps an allowed-types list the field does configure", () => {
    const s = store();
    s.dispatch(
      loadForm(
        raw([
          {
            id: 1,
            fieldType: "fileUpload",
            fileUpload: [{ allowedTypes: ["PDF"], maxFiles: "3" }],
          },
        ])
      )
    );
    const el = s.getState().formBuilder.elements[0];
    expect(el.allowedTypes ?? el.allowedFileTypes).toEqual(["PDF"]);
    expect(el.maxFiles).toBe(3);
  });

  it("transforms a signature field's upload permission", () => {
    const s = store();
    s.dispatch(
      loadForm(
        raw([
          { id: 1, fieldType: "signature", signature: [{ allowUpload: true }] },
          { id: 2, fieldType: "signature" },
        ])
      )
    );
    const [withUpload, without] = s.getState().formBuilder.elements;
    expect(withUpload.allowSignatureUpload).toBe(true);
    expect(without.allowSignatureUpload).toBe(false);
  });

  it("labels and orders a field the envelope described sparsely", () => {
    const s = store();
    s.dispatch(loadForm(raw([{ id: 7, fieldType: "shortText" }])));
    const el = s.getState().formBuilder.elements[0];
    expect(el.id).toBe("7");
    expect(el.label).toBe("");
    expect(el.placeholder).toBe("");
    expect(el.options).toEqual([]);
    expect(el.isRequired).toBe(false);
  });
});

describe("the app shell", () => {
  it("waits behind a loader while the subdomain is being worked out", async () => {
    vi.resetModules();
    vi.doMock("../Components/AllRoutes", () => ({ default: () => <div>routes</div> }));
    const { default: App } = await import("../App");
    const subDomain = (state = { loading: true }) => state;

    render(
      <Provider store={configureStore({ reducer: { subDomain } })}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.queryByText("routes")).not.toBeInTheDocument();
    vi.doUnmock("../Components/AllRoutes");
    vi.resetModules();
  });
});

describe("the socket hook", () => {
  it("dials once and stays dialled across re-renders", async () => {
    const connectSocket = vi.fn(() => ({ on: vi.fn(), off: vi.fn() }));
    const disconnectSocket = vi.fn();
    vi.resetModules();
    // The hook pulls several registrars in; stub the whole module surface.
    vi.doMock("../api/socketService", async () => {
      const actual = await vi.importActual("../api/socketService");
      return {
        ...actual,
        connectSocket,
        disconnectSocket,
        registerUser: vi.fn(),
        onNotification: () => () => {},
        ensureConnected: vi.fn(),
      };
    });
    const { default: useSocket } = await import("../hooks/useSocket");
    const authReducer = (await import("../ReduxStore/features/authentication")).default;

    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: {
          isAuthenticated: true,
          accessToken: "at",
          refreshToken: "rt",
          user: { id: "u1", tenantLinks: [{ id: "tc1", clientId: "cl1", tenantId: "t1" }] },
        },
      },
    });
    const wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

    const { rerender } = renderHook(() => useSocket(), { wrapper });
    expect(connectSocket).toHaveBeenCalledTimes(1);

    // The `initialized` ref is what stops a second dial on every re-render.
    rerender();
    rerender();
    expect(connectSocket).toHaveBeenCalledTimes(1);

    vi.doUnmock("../api/socketService");
    vi.resetModules();
  });
});

describe("the app shell once the subdomain is known", () => {
  it("hands over to the router", async () => {
    vi.resetModules();
    vi.doMock("../Components/AllRoutes", () => ({ default: () => <div>routes</div> }));
    const { default: App } = await import("../App");
    const subDomain = (state = { loading: false, subdomain: "acme" }) => state;

    render(
      <Provider store={configureStore({ reducer: { subDomain } })}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </Provider>
    );
    // The routes are lazily imported, so they arrive a tick after the loader.
    await screen.findByText("routes");
    vi.doUnmock("../Components/AllRoutes");
    vi.resetModules();
  });
});
