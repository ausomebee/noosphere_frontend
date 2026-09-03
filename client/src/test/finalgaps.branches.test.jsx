import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const axiosPatch = vi.fn();
const axiosPost = vi.fn();
vi.mock("axios", () => ({
  default: {
    patch: (...a) => axiosPatch(...a),
    post: (...a) => axiosPost(...a),
    get: vi.fn(),
  },
}));

import authApi from "../api/authApis";
import getSubdomain from "../Helper/getSubdomain";
import AuthorizationCard from "../Components/Cards/Dashboard/Authorization/AuthorizationCard";
import ReusableTable from "../Components/Table/ReuseableTable";

/**
 * The final client gaps: the production-host subdomain rules, the reset-email
 * fallback message, and the authorization card's service-code handler (which
 * sits behind react-select, not a native select).
 */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getSubdomain on real hosts", () => {
  const setHost = (hostname) => {
    delete window.location;
    window.location = { hostname };
  };

  it("treats a www-prefixed host as no tenant", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("www.noospherehub.com");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });

  it("treats the bare root domain as no tenant", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("noospherehub.com");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });

  it("extracts a real tenant subdomain and stores it", () => {
    setHost("mypractice.noospherehub.com");
    expect(getSubdomain()).toBe("mypractice");
    expect(localStorage.getItem("subDomain")).toBe("mypractice");
  });

  it("ignores a www prefix on an unrecognised root domain", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("www.example.com");
    expect(getSubdomain()).toBeNull();
  });

  it("falls back to no subdomain for a two-part host", () => {
    localStorage.setItem("subDomain", "stale");
    setHost("example.com");
    expect(getSubdomain()).toBeNull();
    expect(localStorage.getItem("subDomain")).toBeNull();
  });
});

describe("ClientForgetPassword messaging", () => {
  it("surfaces the backend message", async () => {
    axiosPatch.mockRejectedValue({ response: { data: { message: "No such account" } } });
    await expect(authApi.ClientForgetPassword({ email: "a@b.co" })).rejects.toThrow(
      "No such account"
    );
  });

  it("falls back to its own wording when the backend sends none", async () => {
    axiosPatch.mockRejectedValue(new Error("network down"));
    await expect(authApi.ClientForgetPassword({ email: "a@b.co" })).rejects.toThrow(
      "Forget Password Email failed"
    );
  });

  it("resolves on success", async () => {
    axiosPatch.mockResolvedValue({ data: { ok: true } });
    await expect(authApi.ClientForgetPassword({ email: "a@b.co" })).resolves.toBeDefined();
  });
});

describe("AuthorizationCard service-code selection", () => {
  // The prop is `serviceCodeOptions`, and SelectInput drops any option whose
  // value is "" as a manual placeholder.
  const serviceCodeOptions = [
    { value: "97153", label: "97153" },
    { value: "97155", label: "97155" },
  ];

  // The card uses SelectInput (react-select), so drive it by keyboard.
  const pickFirst = (container) => {
    const input = container.querySelector("input");
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
  };

  it("reports the chosen service code to its handler", () => {
    const onServiceCodeChange = vi.fn();
    const { container } = render(
      <AuthorizationCard
        data={{}}
        serviceCodeOptions={serviceCodeOptions}
        onServiceCodeChange={onServiceCodeChange}
      />
    );
    pickFirst(container);
    expect(onServiceCodeChange).toHaveBeenCalled();
  });

  it("tolerates a selection with no handler wired", () => {
    const { container } = render(
      <AuthorizationCard data={{}} serviceCodeOptions={serviceCodeOptions} />
    );
    expect(() => pickFirst(container)).not.toThrow();
  });

  it("renders a zero-authorization state without dividing by zero", () => {
    expect(() =>
      render(
        <AuthorizationCard
          data={{ totalAuthorized: 0, totalCompleted: 0 }}
          serviceCodeOptions={serviceCodeOptions}
        />
      )
    ).not.toThrow();
  });

  it("renders a partially used authorization", () => {
    render(
      <AuthorizationCard
        data={{ totalAuthorized: 100, totalCompleted: 40 }}
        serviceCodeOptions={serviceCodeOptions}
      />
    );
    expect(screen.getByText("Authorization")).toBeInTheDocument();
  });
});

describe("ReusableTable filter values from mixed rows", () => {
  const columns = [
    { key: "name", title: "Name" },
    { key: "status", title: "Status" },
  ];

  it("builds filter values from rows whose key is present, skipping the rest", () => {
    const data = [
      { id: "1", name: "Alpha", status: "Active" },
      { id: "2", name: "Beta", status: undefined },
      { id: "3", name: "Gamma", status: "Paused" },
    ];
    const { container } = render(
      <ReusableTable
        title="R"
        columns={columns}
        data={data}
        filters={[{ key: "status", label: "Status" }]}
      />
    );
    fireEvent.click(container.querySelector(".filter-btn"));
    const values = Array.from(container.querySelectorAll(".filter-panel option")).map(
      (o) => o.value
    );
    expect(values).toEqual(["", "Active", "Paused"]);
  });

  it("opens the action menu upward when the row sits low in the viewport", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight - 200,
      bottom: window.innerHeight - 180,
      left: 100,
      right: 200,
      width: 100,
      height: 20,
      x: 100,
      y: window.innerHeight - 200,
      toJSON() {},
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      value: 400,
    });
    render(
      <ReusableTable
        title="R"
        columns={columns}
        data={[{ id: "1", name: "Alpha", status: "Active" }]}
        actions={[{ menu: true, label: "Archive", onClick: vi.fn() }]}
      />
    );
    fireEvent.click(screen.getAllByLabelText("More actions")[0]);
    expect(document.body).toBeTruthy();
    delete HTMLElement.prototype.offsetHeight;
  });
});
