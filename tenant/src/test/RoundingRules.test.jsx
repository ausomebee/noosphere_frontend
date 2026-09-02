import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxStore/features/authentication";

/**
 * The billing settings' Rounding Rules panel: a list of rules, a per-row
 * dropdown that views, edits or flips a rule, and one modal that both creates
 * and updates.
 *
 * The panel builds two different API payloads from the same form -- a standard
 * rule looks its description up in a fixed table and rejects an unknown name,
 * while a custom rule nests the unit under `roundingRule` -- so the save tests
 * drive the modal probe's `onSave` directly with each shape. `handleSave`
 * deliberately re-throws after toasting so the modal can stay open, which is
 * why the failure tests await the rejected promise.
 *
 * `actions` is passed to the table as a function of the row, not an array, so
 * the table probe below calls it per row before rendering its buttons.
 */

const api = vi.hoisted(() => ({
  GetRoundingRuleByTenantId: vi.fn(),
  UpdateRoundingRuleActiveness: vi.fn(),
  CreateTenantRoundingRule: vi.fn(),
  UpdateTenantRoundingRule: vi.fn(),
}));
vi.mock("../api/billingAndPaymentsApi", () => ({ default: api }));

const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock("../Helper/ShowToast", () => ({
  showToast: (...a) => toast.showToast(...a),
  showApiError: vi.fn(),
}));

const table = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/Table/CustomTable", () => ({
  default: (received) => {
    table.props = received;
    return (
      <div data-testid="table" data-loading={String(received.loading)}>
        {received.data.map((row) => (
          <div key={row.id} data-testid={`row-${row.id}`}>
            <span>{row.roundingRule}</span>
            {received.actions(row)[0].items.map((item, i) => (
              <button key={i} onClick={() => item.onClick(row)}>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  },
}));

const modal = vi.hoisted(() => ({ props: null }));
vi.mock("../Components/ReusableModal/BillingAndPaymentModal/AddRoundingRule", () => ({
  default: (received) => {
    modal.props = received;
    return received.isOpen ? (
      <div data-testid="rule-modal" data-mode={received.mode} data-saving={String(received.loading)} />
    ) : null;
  },
}));

import RoundingRules from "../Pages/BillingAndPayment/Settings/SettingSubs/RoundingRules";

const makeStore = (permissions, user = {}) =>
  configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "at",
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "at",
          refreshToken: "rt",
          role: permissions
            ? { roleModuleAccesses: [{ module: "BILLINGS_PAYMENTS", permissions }] }
            : { roleModuleAccesses: [] },
          ...user,
        },
      },
    },
  });

const renderPanel = ({ permissions, user } = {}) =>
  render(
    <Provider store={makeStore(permissions, user)}>
      <RoundingRules />
    </Provider>
  );

// The endpoint returns the rules directly on `data`, not nested twice.
const rule = (over = {}) => ({
  id: "rr-1",
  ruleName: "8 Minute Rule",
  description: "Round up when time is more than 8 min into the next 15 min block",
  isActive: true,
  ...over,
});

const listed = () =>
  waitFor(() => expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "false"));

const button = (name) => screen.getByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  table.props = null;
  modal.props = null;
  api.GetRoundingRuleByTenantId.mockResolvedValue({ data: [rule()] });
  api.UpdateRoundingRuleActiveness.mockResolvedValue({});
  api.CreateTenantRoundingRule.mockResolvedValue({ id: "rr-new" });
  api.UpdateTenantRoundingRule.mockResolvedValue({ id: "rr-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loading the rules", () => {
  it("asks for the tenant's rules and maps each one into a row", async () => {
    renderPanel();
    await listed();
    expect(api.GetRoundingRuleByTenantId).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(table.props.data[0]).toMatchObject({
      id: "rr-1",
      roundingRule: "8 Minute Rule",
      isActive: true,
      hasActions: true,
    });
    expect(table.props.data[0].fullData).toMatchObject({ ruleName: "8 Minute Rule" });
  });

  it("shows an empty table when the response carries no rules", async () => {
    api.GetRoundingRuleByTenantId.mockResolvedValue({});
    renderPanel();
    await listed();
    expect(table.props.data).toEqual([]);
  });

  it("stays empty and silent when the fetch fails", async () => {
    api.GetRoundingRuleByTenantId.mockRejectedValue(new Error("500"));
    renderPanel();
    await listed();
    expect(table.props.data).toEqual([]);
    expect(toast.showToast).not.toHaveBeenCalled();
  });

  it("never fetches without a tenant", () => {
    renderPanel({ user: { tenantId: undefined } });
    expect(api.GetRoundingRuleByTenantId).not.toHaveBeenCalled();
    expect(screen.getByTestId("table")).toHaveAttribute("data-loading", "true");
  });
});

describe("permissions", () => {
  it("gives an org owner the add button and every row action", async () => {
    renderPanel();
    await listed();
    expect(button("Add a New Rounding Rule")).toBeInTheDocument();
    expect(button("View")).toBeInTheDocument();
    expect(button("Edit")).toBeInTheDocument();
    expect(button("Deactivate")).toBeInTheDocument();
    expect(table.props.onToggleActive).toBeTypeOf("function");
  });

  it("leaves a read-only role with View alone and no status switch", async () => {
    renderPanel({ permissions: ["view_rounding_rule"] });
    await listed();
    expect(screen.queryByRole("button", { name: "Add a New Rounding Rule" })).not.toBeInTheDocument();
    expect(button("View")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
    expect(table.props.onToggleActive).toBeUndefined();
  });

  it("gives an editor the add button without the status switch", async () => {
    renderPanel({ permissions: ["add_rounding_rule", "edit_rounding_rule"] });
    await listed();
    expect(button("Add a New Rounding Rule")).toBeInTheDocument();
    expect(button("Edit")).toBeInTheDocument();
    expect(table.props.onToggleActive).toBeUndefined();
  });
});

describe("flipping a rule's status", () => {
  it("deactivates an active rule and reloads the list", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Deactivate"));
    await waitFor(() =>
      expect(api.UpdateRoundingRuleActiveness).toHaveBeenCalledWith({
        id: "rr-1",
        isActive: false,
        accessToken: "at",
        refreshToken: "rt",
      })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Rounding rule deactivated successfully",
      "success"
    );
    expect(api.GetRoundingRuleByTenantId).toHaveBeenCalledTimes(2);
  });

  it("activates an inactive rule", async () => {
    api.GetRoundingRuleByTenantId.mockResolvedValue({ data: [rule({ isActive: false })] });
    renderPanel();
    await listed();
    fireEvent.click(button("Activate"));
    await waitFor(() =>
      expect(api.UpdateRoundingRuleActiveness).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      )
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Rounding rule activated successfully",
      "success"
    );
  });

  it("reports a refused status change from the dropdown", async () => {
    api.UpdateRoundingRuleActiveness.mockRejectedValue(new Error("locked"));
    renderPanel();
    await listed();
    fireEvent.click(button("Deactivate"));
    await waitFor(() =>
      expect(toast.showToast).toHaveBeenCalledWith(
        "Failed to update rounding rule status",
        "error"
      )
    );
  });

  it("flips a rule from the table's own status switch", async () => {
    renderPanel();
    await listed();
    await act(async () => table.props.onToggleActive(table.props.data[0]));
    expect(api.UpdateRoundingRuleActiveness).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rr-1", isActive: false })
    );
    expect(toast.showToast).toHaveBeenCalledWith(
      "Rounding rule deactivated successfully",
      "success"
    );
  });

  it("activates from the switch when the rule is off", async () => {
    api.GetRoundingRuleByTenantId.mockResolvedValue({ data: [rule({ isActive: false })] });
    renderPanel();
    await listed();
    await act(async () => table.props.onToggleActive(table.props.data[0]));
    expect(toast.showToast).toHaveBeenCalledWith(
      "Rounding rule activated successfully",
      "success"
    );
  });

  it("reports a refused status change from the switch", async () => {
    api.UpdateRoundingRuleActiveness.mockRejectedValue(new Error("locked"));
    renderPanel();
    await listed();
    await act(async () => table.props.onToggleActive(table.props.data[0]));
    expect(toast.showToast).toHaveBeenCalledWith(
      "Failed to update rounding rule status",
      "error"
    );
  });
});

describe("opening the modal", () => {
  it("keeps it closed with an empty initial record until something opens it", async () => {
    renderPanel();
    await listed();
    expect(screen.queryByTestId("rule-modal")).not.toBeInTheDocument();
    expect(modal.props.initialData).toEqual({});
    expect(modal.props.mode).toBe("add");
  });

  it("opens blank in add mode from the add button", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Add a New Rounding Rule"));
    expect(await screen.findByTestId("rule-modal")).toHaveAttribute("data-mode", "add");
    expect(modal.props.initialData).toEqual({});
  });

  it("opens a row read-only in view mode", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("View"));
    expect(await screen.findByTestId("rule-modal")).toHaveAttribute("data-mode", "view");
    expect(modal.props.initialData).toMatchObject({ id: "rr-1" });
  });

  it("opens a row for editing", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Edit"));
    expect(await screen.findByTestId("rule-modal")).toHaveAttribute("data-mode", "edit");
  });

  it("resets to add mode when the modal is dismissed", async () => {
    renderPanel();
    await listed();
    fireEvent.click(button("Edit"));
    await screen.findByTestId("rule-modal");
    act(() => modal.props.onClose());
    expect(screen.queryByTestId("rule-modal")).not.toBeInTheDocument();
    expect(modal.props.mode).toBe("add");
    expect(modal.props.initialData).toEqual({});
  });
});

describe("saving a rule", () => {
  const standardForm = { ruleType: "standard", parentRole: "Midpoint Rule", active: true };
  const customForm = {
    ruleType: "custom",
    ruleName: "Quarter hour",
    description: "Round to the nearest quarter",
    minutes: 15,
    unit: "minutes",
    unitMinutes: 15,
    active: false,
  };

  const open = async (name) => {
    renderPanel();
    await listed();
    fireEvent.click(button(name));
    await screen.findByTestId("rule-modal");
  };

  const save = (form) => act(async () => modal.props.onSave(form));

  it("just closes the modal in view mode without saving anything", async () => {
    await open("View");
    await save(standardForm);
    expect(api.CreateTenantRoundingRule).not.toHaveBeenCalled();
    expect(screen.queryByTestId("rule-modal")).not.toBeInTheDocument();
    expect(modal.props.mode).toBe("add");
  });

  it("creates a standard rule with the description looked up by name", async () => {
    await open("Add a New Rounding Rule");
    await save(standardForm);
    expect(api.CreateTenantRoundingRule).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      ruleType: "standard",
      parentRole: "Midpoint Rule",
      ruleName: "Midpoint Rule",
      description: "Round up when at least half of unit is completed",
      isActive: true,
      accessToken: "at",
      refreshToken: "rt",
    });
    expect(toast.showToast).toHaveBeenCalledWith("Rounding rule saved successfully", "success");
    expect(api.GetRoundingRuleByTenantId).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("rule-modal")).not.toBeInTheDocument();
  });

  it("refuses a standard rule whose name is not one of the three known ones", async () => {
    await open("Add a New Rounding Rule");
    await expect(
      act(async () => {
        await modal.props.onSave({ ruleType: "standard", parentRole: "Made up rule" });
      })
    ).rejects.toThrow("Invalid standard rule selected");
    expect(api.CreateTenantRoundingRule).not.toHaveBeenCalled();
    expect(toast.showToast).toHaveBeenCalledWith("Failed to save rounding rule", "error");
    // The modal stays open so the choice can be corrected.
    expect(screen.getByTestId("rule-modal")).toBeInTheDocument();
  });

  it("creates a custom rule with the unit nested under roundingRule", async () => {
    await open("Add a New Rounding Rule");
    await save(customForm);
    expect(api.CreateTenantRoundingRule).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      ruleType: "custom",
      parentRole: null,
      ruleName: "Quarter hour",
      description: "Round to the nearest quarter",
      standardUnit: 15,
      roundingRule: { unit: "minutes", unitMinute: 15 },
      isActive: false,
      accessToken: "at",
      refreshToken: "rt",
    });
  });

  it("updates the selected rule instead of creating another one", async () => {
    await open("Edit");
    await save(customForm);
    expect(api.UpdateTenantRoundingRule).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rr-1", ruleName: "Quarter hour" })
    );
    expect(api.CreateTenantRoundingRule).not.toHaveBeenCalled();
  });

  it("hands the endpoint's response back to the modal", async () => {
    await open("Add a New Rounding Rule");
    let result;
    await act(async () => {
      result = await modal.props.onSave(customForm);
    });
    expect(result).toEqual({ id: "rr-new" });
  });

  it("reports a refused save and leaves the modal open", async () => {
    api.CreateTenantRoundingRule.mockRejectedValue(new Error("duplicate"));
    await open("Add a New Rounding Rule");
    await expect(
      act(async () => {
        await modal.props.onSave(customForm);
      })
    ).rejects.toThrow("duplicate");
    expect(toast.showToast).toHaveBeenCalledWith("Failed to save rounding rule", "error");
    expect(screen.getByTestId("rule-modal")).toBeInTheDocument();
    expect(screen.getByTestId("rule-modal")).toHaveAttribute("data-saving", "false");
  });

  it("marks the modal as saving while the request is in flight", async () => {
    let release;
    api.CreateTenantRoundingRule.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      })
    );
    await open("Add a New Rounding Rule");
    let pending;
    act(() => {
      pending = modal.props.onSave(customForm);
    });
    await waitFor(() =>
      expect(screen.getByTestId("rule-modal")).toHaveAttribute("data-saving", "true")
    );
    // The add button is disabled for the same reason.
    expect(button("Add a New Rounding Rule")).toBeDisabled();
    await act(async () => {
      release({});
      await pending;
    });
    expect(screen.queryByTestId("rule-modal")).not.toBeInTheDocument();
  });
});
