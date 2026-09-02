import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AppointmentModal from "../Components/ReusableModal/SchedulerModal/AppointmentModal";
import authReducer from "../ReduxStore/features/authentication";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The scheduler's create/edit appointment modal. It is a single yup schema over
 * a form whose shape changes as you fill it in: picking a session type rewrites
 * the service-code rows, the start/end times and the service location; ticking
 * "recurring" grows a whole second form of day, month and custom-interval
 * fields; and the clinician list is not a static roster but the answer from an
 * availability endpoint that is re-queried, debounced, whenever the date or
 * either time changes.
 *
 * Two things make it awkward to drive. The availability lookup sits behind a
 * 300ms debounce, so every clinician assertion has to be a waitFor rather than a
 * synchronous read. And every picker here is react-select, not a native select,
 * so options are chosen by keyboard; the labels carry a separate "*" span and
 * are not tied to their controls, which is why fields are located by walking up
 * from the label element to its input group.
 *
 * The two APIs, the colour picker and the multi-date picker are all mocked. The
 * date picker is kept as a probe rather than dropped entirely so its onChange
 * and the mapDays callback can still be called directly.
 */

const api = vi.hoisted(() => ({
  getServiceCodes: vi.fn(),
  getAvailableStaff: vi.fn(),
}));

vi.mock("../api/billingAndPaymentsApi", () => ({
  default: { GetTenantServiceCodeByTenantId: api.getServiceCodes },
}));

vi.mock("../api/AppointmentApi", () => ({
  default: { GetAvailableTenantStaff: api.getAvailableStaff },
}));

const colorPicker = vi.hoisted(() => ({ props: null }));

vi.mock("../Components/ColorPicker", () => ({
  default: (props) => {
    colorPicker.props = props;
    return (
      <div data-testid="color-picker">
        <button type="button" onClick={() => props.onChange("#ff0000")}>
          pick red
        </button>
        <button type="button" onClick={props.onClose}>
          dismiss picker
        </button>
      </div>
    );
  },
}));

const datePicker = vi.hoisted(() => ({ props: null }));

// react-multi-date-picker renders a calendar this component only ever talks to
// through onChange and mapDays, so the probe exposes exactly those two.
vi.mock("react-multi-date-picker", () => ({
  default: (props) => {
    datePicker.props = props;
    return (
      <button
        type="button"
        data-testid="day-picker"
        onClick={() => props.onChange([{ day: 5 }, { day: 12 }])}
      >
        choose days
      </button>
    );
  },
}));

const today = new Date().toISOString().split("T")[0];

// Two clients: one with both name parts, one with none, so the "Unknown Client"
// fallback in clientOptions is exercised by the same fixture.
const clients = [
  { clientId: "c1", client: { firstName: "Ada", lastName: "Lovelace" } },
  { clientId: "c2", client: {} },
];

const sessionTypes = [
  {
    id: "st1",
    name: "Direct Therapy",
    defaultDuration: 45,
    staffRolesAllowed: ["role-bcba"],
    locationsAllowed: ["Home"],
    sessionTypeServices: [
      {
        serviceCodeId: "sc1",
        serviceCode: { id: "sc1", code: "97153", description: "Direct" },
        modifiers: { modifier1: "HN" },
      },
    ],
  },
  // No sessionTypeServices at all, which is the branch that empties the rows.
  { id: "st2", name: "Assessment", staffRolesAllowed: [] },
];

const staff = [
  { id: "s1", fullName: "Grace Hopper", roleId: "role-bcba" },
  { id: "s2", firstName: "Alan", lastName: "Turing", roleId: "role-rbt" },
];

const makeStore = (user = {}) =>
  configureStore({
    reducer: { authentication: authReducer, formDrafts: formDraftsReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: true,
        loading: false,
        error: null,
        token: "t",
        refreshToken: "rt",
        user: {
          id: "u1",
          tenantId: "tenant-1",
          accessToken: "access-1",
          refreshToken: "refresh-1",
          ...user,
        },
      },
    },
  });

const renderModal = ({ user, ...props } = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const view = render(
    <Provider store={makeStore(user)}>
      <AppointmentModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        clients={clients}
        sessionTypes={sessionTypes}
        staff={staff}
        {...props}
      />
    </Provider>
  );
  return { ...view, onSave, onClose };
};

// Labels here are plain <label> siblings with a "*" span appended and no
// htmlFor, so there is no accessible name to query by -- walk up from the text.
const groupFor = (labelText) => {
  const label = Array.from(
    document.body.querySelectorAll("label.input-group-label")
  ).find((l) => l.textContent.replace("*", "").trim() === labelText);
  if (!label) throw new Error(`no field labelled "${labelText}"`);
  return label.closest(".input-group");
};

const inputFor = (labelText) => groupFor(labelText).querySelector("input");

// The unlabelled selects (the custom-recurrence unit, position and weekday) can
// only be reached through the hidden input react-select renders for the field.
const groupByName = (name) =>
  document
    .querySelector(`input[name="${name}"][type="hidden"]`)
    .closest(".input-group");

const openMenu = (input) => {
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const pickOption = (labelText, index = 0) => {
  const input = inputFor(labelText);
  openMenu(input);
  for (let i = 0; i < index; i += 1) {
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  }
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
};

// Arrow-stepping is no use on a select that already has a value -- react-select
// opens with the current option focused -- so filter down to the wanted label
// and take it with Enter.
const chooseByName = (name, text) => {
  const input = groupByName(name).querySelector("input");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
};

const setField = (labelText, value) =>
  fireEvent.change(inputFor(labelText), { target: { value } });

const submit = () => fireEvent.click(screen.getByText("Create Appointment"));

const staffPayload = (data) => ({ data: { data } });

let consoleSpies = [];

beforeEach(() => {
  vi.clearAllMocks();
  colorPicker.props = null;
  datePicker.props = null;
  Element.prototype.scrollIntoView = vi.fn();
  api.getServiceCodes.mockResolvedValue({ data: [] });
  api.getAvailableStaff.mockResolvedValue(staffPayload(staff));
  consoleSpies = [
    vi.spyOn(console, "error").mockImplementation(() => {}),
    vi.spyOn(console, "group").mockImplementation(() => {}),
    vi.spyOn(console, "groupEnd").mockImplementation(() => {}),
  ];
});

afterEach(() => {
  consoleSpies.forEach((spy) => spy.mockRestore());
});

describe("appointment modal shell", () => {
  it("opens on the create form", () => {
    renderModal();
    expect(screen.getByText("Create a New Appointment")).toBeInTheDocument();
    expect(screen.getByText("Create Appointment")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  it("renames itself and its primary button in edit mode", () => {
    renderModal({ isEditMode: true, initialData: { clientId: "c1" } });
    expect(screen.getByText("Edit Appointment")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("takes the date from a calendar slot without touching the times", () => {
    renderModal({ presetSlot: { date: "2030-03-04" } });
    expect(inputFor("Date").value).toBe("2030-03-04");
    expect(inputFor("Start Time").value).toBe("");
  });

  it("lists a client with no name as unknown", () => {
    renderModal();
    openMenu(inputFor("Client"));
    expect(screen.getByText("Unknown Client")).toBeInTheDocument();
  });
});

describe("service code loading", () => {
  it("offers the tenant's active codes on a service row", async () => {
    api.getServiceCodes.mockResolvedValue({
      data: [
        { id: "sc9", code: "97155", description: "Protocol", isActive: true },
        // Both of these must be filtered out before reaching the dropdown.
        { id: "sc8", code: "97156", description: "Guidance", isActive: false },
        { id: "sc7", code: "97157", isActive: true, isDeleted: true },
      ],
    });
    renderModal();
    pickOption("Session Type");

    await waitFor(() =>
      expect(groupFor("Service Code (CPT/HCPCS)")).toBeTruthy()
    );
    openMenu(inputFor("Service Code (CPT/HCPCS)"));
    expect(screen.getByText("97155 - Protocol")).toBeInTheDocument();
    expect(screen.queryByText("97156 - Guidance")).not.toBeInTheDocument();
    expect(screen.queryByText(/97157/)).not.toBeInTheDocument();
  });

  it("labels a code that carries no description", async () => {
    api.getServiceCodes.mockResolvedValue({
      data: [{ id: "sc9", code: "97155", isActive: true }],
    });
    renderModal();
    pickOption("Session Type");

    await waitFor(() =>
      expect(groupFor("Service Code (CPT/HCPCS)")).toBeTruthy()
    );
    openMenu(inputFor("Service Code (CPT/HCPCS)"));
    expect(screen.getByText("97155 - No description")).toBeInTheDocument();
  });

  it("stays usable when the codes endpoint fails", async () => {
    api.getServiceCodes.mockRejectedValue(new Error("boom"));
    renderModal();
    await waitFor(() =>
      expect(console.error).toHaveBeenCalledWith(
        "Failed to load service codes:",
        expect.any(Error)
      )
    );
    expect(screen.getByText("Create a New Appointment")).toBeInTheDocument();
  });

  it("does not ask for codes without a tenant", () => {
    renderModal({ user: { tenantId: undefined } });
    expect(api.getServiceCodes).not.toHaveBeenCalled();
  });

  it("displays a code the session type references but the tenant list omits", async () => {
    // The tenant fetch comes back empty, so the only way the field can show
    // anything is the merge of the session type's own embedded serviceCode.
    api.getServiceCodes.mockResolvedValue({ data: [] });
    renderModal();
    pickOption("Session Type");

    await waitFor(() =>
      expect(groupFor("Service Code (CPT/HCPCS)").textContent).toContain(
        "97153 - Direct"
      )
    );
  });
});

describe("clinician availability", () => {
  it("waits for a full slot before querying", () => {
    renderModal();
    expect(api.getAvailableStaff).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Pick the appointment date, start time and end time/)
    ).toBeInTheDocument();
  });

  it("queries the endpoint once the date and both times are set", async () => {
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(api.getAvailableStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          date: today,
          startTime: "09:00",
          endTime: "10:00",
        })
      )
    );
  });

  it("lists the clinicians the endpoint returned", async () => {
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    openMenu(inputFor("Clinician(s)"));
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    // No fullName on this record, so the name parts are joined instead.
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
  });

  it("accepts an unwrapped array from the endpoint", async () => {
    api.getAvailableStaff.mockResolvedValue({ data: [staff[0]] });
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );
  });

  it("treats a payload that is not a list as nobody free", async () => {
    api.getAvailableStaff.mockResolvedValue({ data: { data: { oops: true } } });
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });

  it("drops a clinician the endpoint marks inactive", async () => {
    api.getAvailableStaff.mockResolvedValue(
      staffPayload([{ id: "s3", fullName: "Idle Ida", active: false }])
    );
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });

  it("names a clinician with no name parts at all", async () => {
    api.getAvailableStaff.mockResolvedValue(staffPayload([{ id: "s4" }]));
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );
    openMenu(inputFor("Clinician(s)"));
    expect(screen.getByText("Unknown Clinician")).toBeInTheDocument();
  });

  it("shows the endpoint's own message when the lookup fails", async () => {
    api.getAvailableStaff.mockRejectedValue(new Error("availability is down"));
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText("availability is down")).toBeInTheDocument()
    );
  });

  it("stops querying when a time is cleared again", async () => {
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");
    await waitFor(() => expect(api.getAvailableStaff).toHaveBeenCalled());

    setField("End Time", "");
    await waitFor(() =>
      expect(
        screen.getByText(/Pick the appointment date, start time and end time/)
      ).toBeInTheDocument()
    );
  });

  it("keeps the edited appointment's own clinicians while it sits on its original slot", async () => {
    // Availability legitimately excludes s1 -- this very appointment is what
    // makes them look busy -- so the modal has to add them back.
    api.getAvailableStaff.mockResolvedValue(staffPayload([]));
    renderModal({
      isEditMode: true,
      initialData: {
        date: today,
        startTime: "09:00:00",
        endTime: "10:00:00",
        clientId: "c1",
        sessionType: "st1",
        clinicianIds: ["s1"],
        serviceLocation: "Home",
        service: [{ serviceCodeId: "sc1", modifierType: "HN" }],
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("warns when an assigned clinician's role is not allowed for the session type", async () => {
    renderModal();
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    // Alan Turing is an RBT and st1 only allows role-bcba.
    pickOption("Clinician(s)", 1);

    await waitFor(() =>
      expect(
        screen.getByText(/only eligible clinicians are assigned/)
      ).toBeInTheDocument()
    );
  });
});

describe("session type driven defaults", () => {
  it("fills the service row, the times and the location", async () => {
    renderModal();
    pickOption("Session Type");

    await waitFor(() => expect(inputFor("Start Time").value).not.toBe(""));
    expect(inputFor("End Time").value).not.toBe("");
    expect(groupFor("Service Location").textContent).toContain("Home");
    expect(groupFor("Service Code (CPT/HCPCS)").textContent).toContain(
      "97153 - Direct"
    );
    expect(groupFor("Modifier").textContent).toContain("HN");
  });

  it("empties the rows for a session type with no services", async () => {
    renderModal();
    pickOption("Session Type", 1);
    await waitFor(() =>
      expect(
        screen.getByText("No services defined for this session type.")
      ).toBeInTheDocument()
    );
  });

  it("starts with no service rows at all", () => {
    renderModal();
    expect(
      screen.getByText("No services defined for this session type.")
    ).toBeInTheDocument();
  });

  it("adds and removes service rows by hand", async () => {
    renderModal();
    pickOption("Session Type");
    await waitFor(() =>
      expect(
        screen.getAllByLabelText("Remove service code")
      ).toHaveLength(1)
    );

    fireEvent.click(screen.getByText("Add Service Code"));
    expect(screen.getAllByLabelText("Remove service code")).toHaveLength(2);

    fireEvent.click(screen.getAllByLabelText("Remove service code")[1]);
    expect(screen.getAllByLabelText("Remove service code")).toHaveLength(1);
  });
});

describe("recurrence options", () => {
  const tickRecurring = () =>
    fireEvent.click(document.querySelector('input[name="isRecurring"]'));

  const pickRadio = (name, value) =>
    fireEvent.click(
      document.querySelector(`input[name="${name}"][value="${value}"]`)
    );

  it("stays hidden until the event is marked recurring", () => {
    renderModal();
    expect(screen.queryByText("Repeats every")).not.toBeInTheDocument();
    tickRecurring();
    expect(screen.getAllByText("Repeats every").length).toBeGreaterThan(0);
  });

  it("toggles a weekday on and off for a weekly repeat", () => {
    renderModal();
    tickRecurring();
    pickRadio("recurrenceType", "week");

    const tue = document.querySelector('input[value="tue"]');
    fireEvent.click(tue);
    expect(tue.checked).toBe(true);
    fireEvent.click(tue);
    expect(tue.checked).toBe(false);
  });

  it("collects days of the month for a monthly repeat", () => {
    renderModal();
    tickRecurring();
    pickRadio("recurrenceType", "month");

    fireEvent.click(screen.getByTestId("day-picker"));
    // The picker reports Date-like objects; the modal keeps only their days.
    expect(datePicker.props.value.map((d) => d.getDate())).toEqual([5, 12]);
  });

  it("highlights only the days already chosen", () => {
    renderModal();
    tickRecurring();
    pickRadio("recurrenceType", "month");
    fireEvent.click(screen.getByTestId("day-picker"));

    expect(datePicker.props.mapDays({ date: { day: 5 } })).toEqual({
      className: "highlight-selected",
    });
    expect(datePicker.props.mapDays({ date: { day: 6 } })).toEqual({
      className: "",
    });
  });

  it("asks for an interval and a unit for a custom repeat", () => {
    renderModal();
    tickRecurring();
    pickRadio("recurrenceType", "custom");

    expect(document.querySelector('input[name="customRecurrenceInterval"]')).toBeTruthy();
    // The default unit is month, so the position radios come with it.
    expect(screen.getByText("On day")).toBeInTheDocument();
    expect(screen.getByText("On the")).toBeInTheDocument();
  });

  it("swaps the month fields for weekday checkboxes on a custom weekly repeat", () => {
    renderModal();
    tickRecurring();
    pickRadio("recurrenceType", "custom");
    chooseByName("customRecurrenceUnit", "Week");

    expect(screen.queryByText("On day")).not.toBeInTheDocument();
    expect(document.querySelector('input[value="mon"]')).toBeTruthy();
  });

  it("offers a position and a weekday once the repeat is not on a fixed day", () => {
    renderModal();
    tickRecurring();
    pickRadio("recurrenceType", "custom");
    fireEvent.click(screen.getByText("On the").previousSibling);

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.queryByTestId("day-picker")).not.toBeInTheDocument();
  });

  it("asks for an end date when the series ends on a day", () => {
    renderModal();
    tickRecurring();
    pickRadio("endType", "on");
    expect(inputFor("End On")).toBeTruthy();
  });

  it("asks for a count when the series ends after n events", () => {
    renderModal();
    tickRecurring();
    pickRadio("endType", "after");
    expect(groupFor("Number of occurrences")).toBeTruthy();
  });
});

describe("colour picker", () => {
  it("opens from the swatch and keeps the chosen colour", () => {
    renderModal();
    fireEvent.click(screen.getByText("Change"));
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();

    fireEvent.click(screen.getByText("pick red"));
    expect(document.querySelector(".color-preview").style.backgroundColor).toBe(
      "rgb(255, 0, 0)"
    );
  });

  it("opens from the keyboard and closes again", () => {
    renderModal();
    const swatch = document.querySelector(".color-preview");
    fireEvent.keyDown(swatch, { key: "Enter" });
    expect(screen.getByTestId("color-picker")).toBeInTheDocument();

    fireEvent.click(screen.getByText("dismiss picker"));
    expect(screen.queryByTestId("color-picker")).not.toBeInTheDocument();
  });

  it("ignores an unrelated key on the swatch", () => {
    renderModal();
    fireEvent.keyDown(document.querySelector(".color-preview"), { key: "a" });
    expect(screen.queryByTestId("color-picker")).not.toBeInTheDocument();
  });
});

describe("submitting", () => {
  it("refuses an empty form and names the missing fields", async () => {
    const { onSave } = renderModal();
    submit();

    await waitFor(() =>
      expect(screen.getByText("Client is required")).toBeInTheDocument()
    );
    expect(screen.getByText("Session type is required")).toBeInTheDocument();
    expect(screen.getByText("Start time is required")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a service row left blank", async () => {
    const { onSave } = renderModal();
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)");
    fireEvent.click(screen.getByText("Add Service Code"));
    submit();

    await waitFor(() =>
      expect(screen.getByText("Service code is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a complete one-off appointment and closes", async () => {
    const { onSave, onClose } = renderModal();
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // yup casts `date` on the way through, so the payload carries a Date
    // object rather than the yyyy-MM-dd string the field holds.
    expect(onSave.mock.calls[0][0].date).toBeInstanceOf(Date);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        client: "c1",
        sessionType: "st1",
        clinicians: ["s1"],
        service: [{ serviceCodeId: "sc1", modifiers: { modifier: "HN" } }],
        serviceLocation: "Home",
        isRecurring: false,
        recurrence: null,
        billable: true,
        requiresTravel: false,
        colorCode: "#000000",
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("carries the weekly recurrence rule into the payload", async () => {
    const { onSave } = renderModal();
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)");

    fireEvent.click(document.querySelector('input[name="isRecurring"]'));
    fireEvent.click(
      document.querySelector('input[name="recurrenceType"][value="week"]')
    );
    fireEvent.click(document.querySelector('input[value="wed"]'));
    fireEvent.click(
      document.querySelector('input[name="endType"][value="after"]')
    );
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].recurrence).toEqual({
      type: "week",
      endType: "after",
      occurrences: 1,
      days: ["wed"],
    });
  });

  it("marks the appointment unbillable and travelling", async () => {
    const { onSave } = renderModal();
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)");

    fireEvent.click(
      screen.getByText("This appointment is billable").previousSibling
    );
    fireEvent.click(
      screen.getByText("This appointment requires travel").previousSibling
    );
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      billable: false,
      requiresTravel: true,
    });
  });

  it("leaves the modal open when the parent's save rejects", async () => {
    const { onSave, onClose } = renderModal();
    onSave.mockRejectedValue(new Error("server said no"));
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("editing a recurring appointment", () => {
  const recurringInitialData = {
    date: today,
    startTime: "09:00:00",
    endTime: "10:00:00",
    clientId: "c1",
    sessionType: "st1",
    clinicianIds: ["s1"],
    serviceLocation: "Home",
    service: [{ serviceCodeId: "sc1", modifierType: "UB" }],
    isRecurring: true,
    billable: false,
    requiresTravel: true,
    colorCode: "#123456",
    recurrence: {
      type: "week",
      days: ["mon"],
      endType: "on",
      endOn: "2030-01-01",
    },
  };

  const openEdit = () =>
    renderModal({ isEditMode: true, initialData: recurringInitialData });

  it("repopulates every field from the appointment", async () => {
    openEdit();
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    expect(inputFor("End Time").value).toBe("10:00");
    expect(groupFor("Client").textContent).toContain("Ada Lovelace");
    // "UB" is not in the static modifier list, so it has to be merged in as an
    // option or react-select would render the field as empty.
    expect(groupFor("Modifier").textContent).toContain("UB");
    expect(document.querySelector('input[name="isRecurring"]').checked).toBe(
      true
    );
  });

  it("locks the client picker", async () => {
    openEdit();
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    expect(inputFor("Client").disabled).toBe(true);
  });

  it("asks which events to change instead of saving straight away", async () => {
    const { onSave } = openEdit();
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(screen.getByText("This Event Only")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a single occurrence with the scope attached", async () => {
    const { onSave, onClose } = openEdit();
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(screen.getByText("This Event Only")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("This Event Only"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      scope: "this",
      recurrence: {
        type: "week",
        endType: "on",
        endOn: "2030-01-01",
        days: ["mon"],
      },
      billable: false,
      requiresTravel: true,
      colorCode: "#123456",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("saves the whole series when asked", async () => {
    const { onSave } = openEdit();
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(screen.getByText("All Events in This Series")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("All Events in This Series"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].scope).toBe("all");
  });

  it("goes back to the form from the scope question", async () => {
    openEdit();
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(screen.getByText("Go Back")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Go Back"));

    expect(screen.queryByText("This Event Only")).not.toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
  });

  it("falls back to a blank service row when the appointment has none", async () => {
    renderModal({
      isEditMode: true,
      initialData: { ...recurringInitialData, service: [] },
    });
    await waitFor(() =>
      expect(screen.getAllByLabelText("Remove service code")).toHaveLength(1)
    );
    expect(
      screen.queryByText("No services defined for this session type.")
    ).not.toBeInTheDocument();
  });
});
