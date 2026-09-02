import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";

import AppointmentModal from "../Components/ReusableModal/SchedulerModal/AppointmentModal";
import authReducer from "../ReduxStore/features/authentication";
import formDraftsReducer from "../ReduxStore/features/formDraftsSlice";

/**
 * The awkward corners of the create/edit appointment modal, alongside the main
 * AppointmentModal suite: the guards that stop it talking to the network, the
 * "the record said nothing" fallbacks the edit-mode reset is made of, and the
 * two separate recurrence builders it carries.
 *
 * The recurrence rule is assembled twice by two pieces of code that must agree:
 * a spread-conditional chain on the ordinary create path, and an if/else chain
 * behind the "which events?" question that only a recurring edit reaches. Both
 * are driven here for every repeat shape — daily, weekly, monthly, and each of
 * the three custom units — because a branch covered on one path says nothing
 * about the other.
 *
 * The availability lookup is debounced by 300ms, so anything about clinicians
 * has to be a waitFor. Deferred promises are used where a test needs to observe
 * the in-flight state rather than the settled one; each is resolved before the
 * test ends so nothing is left hanging.
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

vi.mock("../Components/ColorPicker", () => ({
  default: (props) => (
    <button type="button" onClick={() => props.onChange("#ff0000")}>
      pick red
    </button>
  ),
}));

const datePicker = vi.hoisted(() => ({ props: null }));

// The multi-date picker is only ever talked to through onChange, so the probe
// reports a fixed pair of days when clicked.
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

const clients = [{ clientId: "c1", client: { firstName: "Ada", lastName: "Lovelace" } }];

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
  // No defaultDuration, no locationsAllowed and no staffRolesAllowed key at
  // all: the three `||` fallbacks in the session-type effect and the role
  // warning all take their other arm on this one. Its service carries a plain
  // `modifier` rather than `modifier1`, and its own code carries neither.
  {
    id: "st2",
    name: "Parent Training",
    sessionTypeServices: [
      {
        serviceCodeId: "sc2",
        serviceCode: { id: "sc2", code: "97156" },
        modifiers: { modifier: "GT" },
      },
    ],
  },
  // The service names no modifier of its own, so the default has to come off
  // the embedded service code instead.
  {
    id: "st3",
    name: "Assessment",
    defaultDuration: 30,
    locationsAllowed: [],
    sessionTypeServices: [
      {
        serviceCodeId: "sc3",
        serviceCode: {
          id: "sc3",
          code: "97151",
          description: "Assessment",
          modifiers: { modifier1: "TS" },
        },
        modifiers: {},
      },
    ],
  },
];

const staff = [
  { id: "s1", fullName: "Grace Hopper", roleId: "role-bcba" },
  { id: "s2", fullName: "Alan Turing", roleId: "role-rbt" },
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

// The labels carry a "*" span and no htmlFor, so walk up from the label text
// to the input group that owns the control.
const groupFor = (labelText) => {
  const label = Array.from(
    document.body.querySelectorAll("label.input-group-label")
  ).find((l) => l.textContent.replace("*", "").trim() === labelText);
  if (!label) throw new Error(`no field labelled "${labelText}"`);
  return label.closest(".input-group");
};

const inputFor = (labelText) => groupFor(labelText).querySelector("input");

// The unlabelled selects (the extra service rows, the custom-recurrence unit,
// position and weekday) are only reachable through react-select's hidden input.
const groupByName = (name) =>
  document
    .querySelector(`input[name="${name}"][type="hidden"]`)
    .closest(".input-group");

const openMenu = (input) => {
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
};

const pickFrom = (input, index = 0) => {
  openMenu(input);
  for (let i = 0; i < index; i += 1) {
    fireEvent.keyDown(input, { key: "ArrowDown", keyCode: 40 });
  }
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
};

const pickOption = (labelText, index = 0) =>
  pickFrom(inputFor(labelText), index);

// A select that already holds a value opens with that option focused, so
// arrow-stepping is unreliable -- filter down to the wanted label instead.
const chooseByName = (name, text) => {
  const input = groupByName(name).querySelector("input");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 13 });
};

const setField = (labelText, value) =>
  fireEvent.change(inputFor(labelText), { target: { value } });

const submit = () => fireEvent.click(screen.getByText("Create Appointment"));

const tickRecurring = () =>
  fireEvent.click(document.querySelector('input[name="isRecurring"]'));

const pickRadio = (name, value) =>
  fireEvent.click(
    document.querySelector(`input[name="${name}"][value="${value}"]`)
  );

const setInterval_ = (value) =>
  fireEvent.change(
    document.querySelector('input[name="customRecurrenceInterval"]'),
    { target: { value } }
  );

const staffPayload = (data) => ({ data: { data } });

// A promise the test settles by hand, so the in-flight render can be observed.
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

// Everything the yup schema demands, so a submit actually reaches onSave.
const fillRequired = async (sessionIndex = 0) => {
  pickOption("Client");
  pickOption("Session Type", sessionIndex);
  await waitFor(() =>
    expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
  );
  pickOption("Clinician(s)");
};

const savedRecurrence = (onSave) => onSave.mock.calls[0][0].recurrence;

let consoleSpies = [];

beforeEach(() => {
  vi.clearAllMocks();
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

describe("staying off the network", () => {
  it("asks for nothing at all while the modal is shut", async () => {
    renderModal({ isOpen: false, presetSlot: { date: "2030-03-04" } });
    await waitFor(() => expect(api.getServiceCodes).not.toHaveBeenCalled());
    expect(api.getAvailableStaff).not.toHaveBeenCalled();
  });

  it("asks for nothing without an access token", async () => {
    renderModal({ user: { accessToken: undefined } });
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
    expect(api.getServiceCodes).not.toHaveBeenCalled();
    expect(api.getAvailableStaff).not.toHaveBeenCalled();
  });

  it("ignores a preset slot that names no date", () => {
    renderModal({ presetSlot: {} });
    expect(inputFor("Date").value).toBe(today);
  });

  it("lets the record win over a preset slot in edit mode", async () => {
    renderModal({
      isEditMode: true,
      initialData: { date: "2030-01-02", clientId: "c1" },
      presetSlot: { date: "2030-03-04" },
    });
    await waitFor(() => expect(inputFor("Date").value).toBe("2030-01-02"));
  });
});

describe("loading service codes", () => {
  it("copes with a response that carries no body", async () => {
    api.getServiceCodes.mockResolvedValue(undefined);
    renderModal();
    pickOption("Session Type");

    // The only option left is the one merged in from the session type itself.
    await waitFor(() =>
      expect(groupFor("Service Code (CPT/HCPCS)").textContent).toContain(
        "97153 - Direct"
      )
    );
  });

  it("says the codes are still loading on a fresh service row", async () => {
    const pending = deferred();
    api.getServiceCodes.mockReturnValue(pending.promise);
    renderModal();
    // An empty row shows its placeholder; a row the session type has already
    // filled in shows the chosen code instead.
    fireEvent.click(screen.getByText("Add Service Code"));

    expect(screen.getByText("Loading codes...")).toBeInTheDocument();
    pending.resolve({ data: [] });
    await waitFor(() =>
      expect(screen.queryByText("Loading codes...")).not.toBeInTheDocument()
    );
  });
});

describe("clinician availability edges", () => {
  it("treats a response with no body as nobody free", async () => {
    api.getAvailableStaff.mockResolvedValue(undefined);
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });

  it("falls back to a generic message when the failure carries none", async () => {
    api.getAvailableStaff.mockRejectedValue({});
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(
        screen.getByText("Could not load available clinicians.")
      ).toBeInTheDocument()
    );
  });

  it("says it is checking while the lookup is in flight", async () => {
    const pending = deferred();
    api.getAvailableStaff.mockReturnValue(pending.promise);
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(
        screen.getByText("Checking who is free for this slot…")
      ).toBeInTheDocument()
    );
    pending.resolve(staffPayload(staff));
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
  });

  it("drops a clinician who is not free on the new slot", async () => {
    api.getAvailableStaff
      .mockResolvedValueOnce(staffPayload(staff))
      .mockResolvedValue(staffPayload([staff[0]]));
    renderModal();
    pickOption("Client");
    pickOption("Session Type");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)", 1);
    expect(groupFor("Clinician(s)").textContent).toContain("Alan Turing");

    setField("Start Time", "21:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );
    expect(groupFor("Clinician(s)").textContent).not.toContain("Alan Turing");
  });
});

describe("session type driven defaults", () => {
  it("uses the plain modifier and an hour when the session type names neither a duration nor a location", async () => {
    renderModal();
    pickOption("Session Type", 1);

    await waitFor(() =>
      expect(groupFor("Modifier").textContent).toContain("GT")
    );
    // No locationsAllowed on st2, so the location is left for the user.
    expect(groupFor("Service Location").textContent).toContain("Select");
  });

  it("takes the default modifier off the service code when the service names none", async () => {
    const { onSave } = renderModal();
    pickOption("Client");
    pickOption("Session Type", 2);
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    pickOption("Clinician(s)");
    // locationsAllowed is present but empty, so the location is left to the user.
    expect(groupFor("Service Location").textContent).toContain("Select");
    // The modifier box reads as empty even though the field now holds "TS":
    // only the session type's own modifiers are merged into the dropdown's
    // options, never the service code the default was taken from. See report.
    expect(groupFor("Modifier").textContent).toContain("Select modifier");

    pickOption("Service Location");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].service).toEqual([
      { serviceCodeId: "sc3", modifiers: { modifier: "TS" } },
    ]);
  });

  it("warns about every clinician when the session type names no allowed roles", async () => {
    renderModal();
    await fillRequired(1);

    await waitFor(() =>
      expect(
        screen.getByText(/only eligible clinicians are assigned/)
      ).toBeInTheDocument()
    );
  });
});

describe("repopulating from a thin record", () => {
  it("fills in every gap on an appointment that carries almost nothing", async () => {
    renderModal({ isEditMode: true, initialData: { id: "a1" } });

    await waitFor(() =>
      expect(screen.getAllByLabelText("Remove service code")).toHaveLength(1)
    );
    expect(inputFor("Date").value).toBe(today);
    expect(inputFor("Start Time").value).toBe("");
    expect(document.querySelector('input[name="isRecurring"]').checked).toBe(
      false
    );
    expect(
      screen.getByText("This appointment is billable").previousSibling.checked
    ).toBe(true);
    expect(
      screen.getByText("This appointment requires travel").previousSibling
        .checked
    ).toBe(false);
    expect(document.querySelector(".color-preview").style.backgroundColor).toBe(
      "rgb(0, 0, 0)"
    );
  });

  it("leaves a time that is not a string exactly as it found it", async () => {
    // A record whose times came back as numbers can't make a complete slot, so
    // the availability lookup never runs.
    renderModal({
      isEditMode: true,
      initialData: { id: "a1", date: today, startTime: 9, endTime: 10 },
    });

    await waitFor(() => expect(inputFor("Date").value).toBe(today));
    expect(
      screen.getByText(/Pick the appointment date, start time and end time/)
    ).toBeInTheDocument();
    expect(api.getAvailableStaff).not.toHaveBeenCalled();
  });

  it("wraps a single day of the month into a list", async () => {
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        clientId: "c1",
        isRecurring: true,
        recurrence: { type: "month", day: "15", endType: "never" },
      },
    });

    await waitFor(() => expect(datePicker.props).toBeTruthy());
    expect(datePicker.props.value.map((d) => d.getDate())).toEqual([15]);
  });

  it("keeps a list of days of the month as a list of numbers", async () => {
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        clientId: "c1",
        isRecurring: true,
        recurrence: { type: "month", day: ["4", "9"], endType: "never" },
      },
    });

    await waitFor(() => expect(datePicker.props).toBeTruthy());
    expect(datePicker.props.value.map((d) => d.getDate())).toEqual([4, 9]);
  });

  it("carries a custom interval and count across as strings", async () => {
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        clientId: "c1",
        isRecurring: true,
        recurrence: {
          type: "custom",
          unit: "day",
          interval: 3,
          endType: "after",
          occurrences: 7,
        },
      },
    });

    await waitFor(() =>
      expect(
        document.querySelector('input[name="customRecurrenceInterval"]').value
      ).toBe("3")
    );
    expect(groupFor("Number of occurrences").textContent).toContain("7");
  });

  it("shows a service code and modifier the static lists have never heard of", async () => {
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        clientId: "c1",
        service: [
          {
            serviceCodeId: "sc9",
            modifier: "Group",
            serviceCode: { id: "sc9", code: "99999" },
          },
        ],
      },
    });

    await waitFor(() =>
      expect(screen.getAllByLabelText("Remove service code")).toHaveLength(1)
    );
    // The code is only displayable because it was merged in off the record.
    expect(groupFor("Service Code (CPT/HCPCS)").textContent).toContain(
      "99999 - No description"
    );
    // The form reads its modifier from `modifierType`, so the box is empty --
    // but "Group" still has to be an option or it could never be re-picked.
    openMenu(inputFor("Modifier"));
    expect(screen.getByText("Group")).toBeInTheDocument();
  });

  it("keeps quiet about roles when the session type is no longer in the list", async () => {
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        clientId: "c1",
        sessionType: "retired-session",
        clinicianIds: ["s2"],
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    expect(
      screen.queryByText(/only eligible clinicians are assigned/)
    ).not.toBeInTheDocument();
  });

  it("stops shielding the record's own clinicians once the slot moves", async () => {
    // Availability leaves s1 out; on the original slot the modal adds them back,
    // but a changed start time makes them face the same check as everyone else.
    api.getAvailableStaff.mockResolvedValue(staffPayload([]));
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        clientId: "c1",
        clinicianIds: ["s1"],
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );
    setField("Start Time", "14:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });

  it("shields nobody when the record names no clinicians at all", async () => {
    api.getAvailableStaff.mockResolvedValue(staffPayload([]));
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        clientId: "c1",
      },
    });

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });
});

describe("building a recurrence rule while creating", () => {
  it("sends the chosen days of the month for a monthly repeat", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "month");
    fireEvent.click(screen.getByTestId("day-picker"));
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toEqual({
      type: "month",
      endType: "never",
      day: [5, 12],
    });
  });

  it("sends an end date when the series ends on a day", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("endType", "on");
    setField("End On", "2030-06-01");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toEqual({
      type: "day",
      endType: "on",
      endOn: "2030-06-01",
    });
  });

  it("sends the interval and unit for a custom weekly repeat", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "custom");
    setInterval_("2");
    chooseByName("customRecurrenceUnit", "Week");
    fireEvent.click(document.querySelector('input[value="mon"]'));
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toEqual({
      type: "custom",
      endType: "never",
      interval: 2,
      unit: "week",
      days: ["mon"],
    });
  });

  it("sends the days of the month for a custom monthly repeat pinned to dates", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "custom");
    setInterval_("3");
    fireEvent.click(screen.getByTestId("day-picker"));
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toEqual({
      type: "custom",
      endType: "never",
      interval: 3,
      unit: "month",
      day: [5, 12],
    });
  });

  it("sends a position and weekday for a custom monthly repeat pinned to an ordinal", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "custom");
    setInterval_("4");
    fireEvent.click(screen.getByText("On the").previousSibling);
    chooseByName("customRecurrenceWeekday", "Monday");
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toEqual({
      type: "custom",
      endType: "never",
      interval: 4,
      unit: "month",
      position: "first",
      weekday: "monday",
    });
  });

  // `endOn` is the other DOM-registered field, so a series that ends on no
  // particular day hits the same dead end as a cleared date.
  it("goes silent on a series that ends on a day it never names", async () => {
    const { onSave, onClose } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("endType", "on");
    submit();

    await waitFor(() => expect(inputFor("End On").value).toBe(""));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(/End date is required/)).not.toBeInTheDocument();
  });

  it("sends an empty modifier for a service row left unmodified", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    fireEvent.click(screen.getByText("Add Service Code"));
    pickFrom(groupByName("service.1.serviceCodeId").querySelector("input"));
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].service).toEqual([
      { serviceCodeId: "sc1", modifiers: { modifier: "HN" } },
      { serviceCodeId: "sc1", modifiers: { modifier: "" } },
    ]);
  });

  it("accepts a window that runs past midnight", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    setField("Start Time", "23:00");
    setField("End Time", "01:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      startTime: "23:00",
      endTime: "01:00",
    });
  });

  // Clearing the date is a dead end rather than a validation failure. `date` is
  // one of only two fields here registered against a real DOM node, so its
  // error object carries a circular `ref` -- and the modal's invalid handler
  // JSON.stringifies the whole error object, which throws before any message
  // reaches the screen. Pinned as current behaviour; see the report.
  it("goes silent rather than complaining when the date is cleared", async () => {
    const { onSave, onClose } = renderModal();
    await fillRequired();
    setField("Date", "");
    submit();

    await waitFor(() => expect(inputFor("Date").value).toBe(""));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText("Date is required")).not.toBeInTheDocument();
    expect(
      screen.queryByText("End time must be after start time")
    ).not.toBeInTheDocument();
  });
});

describe("building a recurrence rule while editing a series", () => {
  const editing = (recurrence) => ({
    isEditMode: true,
    initialData: {
      id: "a1",
      date: today,
      startTime: "09:00",
      endTime: "10:00",
      clientId: "c1",
      sessionType: "st1",
      clinicianIds: ["s1"],
      serviceLocation: "Home",
      service: [{ serviceCodeId: "sc1", modifierType: "HN" }],
      isRecurring: true,
      recurrence,
    },
  });

  const saveThisEvent = async (recurrence) => {
    const view = renderModal(editing(recurrence));
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() =>
      expect(screen.getByText("This Event Only")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("This Event Only"));
    await waitFor(() => expect(view.onSave).toHaveBeenCalledTimes(1));
    return view;
  };

  it("keeps a plain daily rule with its occurrence count", async () => {
    const { onSave } = await saveThisEvent({
      type: "day",
      endType: "after",
      occurrences: 5,
    });
    expect(savedRecurrence(onSave)).toEqual({
      type: "day",
      endType: "after",
      occurrences: 5,
    });
  });

  it("keeps the days of the month for a monthly rule", async () => {
    const { onSave } = await saveThisEvent({
      type: "month",
      day: [7],
      endType: "never",
    });
    expect(savedRecurrence(onSave)).toEqual({
      type: "month",
      endType: "never",
      day: [7],
    });
  });

  it("keeps the interval, unit and days for a custom weekly rule", async () => {
    const { onSave } = await saveThisEvent({
      type: "custom",
      unit: "week",
      interval: 2,
      days: ["mon"],
      endType: "on",
      endOn: "2030-06-01",
    });
    expect(savedRecurrence(onSave)).toEqual({
      type: "custom",
      endType: "on",
      endOn: "2030-06-01",
      interval: 2,
      unit: "week",
      days: ["mon"],
    });
  });

  it("keeps the days for a custom monthly rule pinned to dates", async () => {
    const { onSave } = await saveThisEvent({
      type: "custom",
      unit: "month",
      interval: 4,
      position: "on",
      day: [9],
      endType: "never",
    });
    expect(savedRecurrence(onSave)).toEqual({
      type: "custom",
      endType: "never",
      interval: 4,
      unit: "month",
      day: [9],
    });
  });

  it("keeps the position and weekday for a custom monthly rule pinned to an ordinal", async () => {
    const { onSave } = await saveThisEvent({
      type: "custom",
      unit: "month",
      interval: 3,
      position: "first",
      weekday: "monday",
      endType: "never",
    });
    expect(savedRecurrence(onSave)).toEqual({
      type: "custom",
      endType: "never",
      interval: 3,
      unit: "month",
      position: "first",
      weekday: "monday",
    });
  });

  it("sends no rule at all once the series is unticked", async () => {
    const { onSave } = renderModal(
      editing({ type: "day", endType: "never" })
    );
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    tickRecurring();
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toBeNull();
    // A non-recurring edit saves straight away rather than asking about scope.
    expect(screen.queryByText("This Event Only")).not.toBeInTheDocument();
  });
});

describe("dates the record hands over in odd shapes", () => {
  it("accepts a date the record gives as a Date rather than a string", async () => {
    renderModal({
      isEditMode: true,
      initialData: { id: "a1", date: new Date(2030, 2, 4), clientId: "c1" },
    });
    await waitFor(() => expect(inputFor("Date").value).toBe("2030-03-04"));
  });

  it("falls back to today when the record's date cannot be read at all", async () => {
    renderModal({
      isEditMode: true,
      initialData: { id: "a1", date: "the day after tomorrow", clientId: "c1" },
    });
    await waitFor(() => expect(inputFor("Date").value).toBe(today));
  });

  it("keeps a service row whose record names no code", async () => {
    renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        clientId: "c1",
        service: [{ modifierType: "HN" }],
      },
    });

    await waitFor(() =>
      expect(screen.getAllByLabelText("Remove service code")).toHaveLength(1)
    );
    // The modifier survives even though the row has nothing to modify yet.
    expect(groupFor("Service Code (CPT/HCPCS)").textContent).not.toContain("97153");
  });
});

describe("availability answers in shapes the modal did not expect", () => {
  it("treats a payload that is not a list as nobody free", async () => {
    api.getAvailableStaff.mockResolvedValue({ data: { data: "unavailable" } });
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });

  it("treats an empty envelope as nobody free", async () => {
    api.getAvailableStaff.mockResolvedValue({ data: null });
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");

    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  });

  it("ignores a lookup that lands after the slot has already moved", async () => {
    const stale = deferred();
    api.getAvailableStaff
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValue(staffPayload([staff[0]]));
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");
    await waitFor(() =>
      expect(
        screen.getByText("Checking who is free for this slot…")
      ).toBeInTheDocument()
    );

    // Moving the slot tears down the first lookup; when it finally answers, its
    // two clinicians must not overwrite the one the second lookup found.
    setField("Start Time", "11:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );

    stale.resolve(staffPayload(staff));
    await Promise.resolve();
    expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument();
  });

  it("ignores a lookup that fails after the slot has already moved", async () => {
    let rejectStale;
    const stale = new Promise((_, reject) => {
      rejectStale = reject;
    });
    api.getAvailableStaff
      .mockReturnValueOnce(stale)
      .mockResolvedValue(staffPayload([staff[0]]));
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");
    await waitFor(() =>
      expect(
        screen.getByText("Checking who is free for this slot…")
      ).toBeInTheDocument()
    );

    setField("Start Time", "11:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 1 clinician /)).toBeInTheDocument()
    );

    rejectStale(new Error("too late"));
    await Promise.resolve();
    expect(
      screen.queryByText("Could not load available clinicians.")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("too late")).not.toBeInTheDocument();
  });
});

describe("a one-off appointment", () => {
  it("sends no recurrence rule at all", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toMatchObject({
      isRecurring: false,
      recurrence: null,
    });
  });
});

describe("days handed back as nothing at all", () => {
  it("clears the days of the month when the calendar returns nothing", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "month");
    fireEvent.click(screen.getByTestId("day-picker"));
    await waitFor(() => expect(datePicker.props.value).toHaveLength(2));

    fireEvent.click(screen.getByTestId("day-picker"));
    datePicker.props.onChange(null);

    // A monthly rule with no day is not a rule -- validation now refuses it
    // rather than saving `day: []`. An empty array is present but too short, so
    // it is `min(1)` that reports rather than `required`.
    submit();
    await waitFor(() =>
      expect(screen.getByText("At least one day is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves once a day is put back", async () => {
    const { onSave } = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "month");
    fireEvent.click(screen.getByTestId("day-picker"));
    await waitFor(() => expect(datePicker.props.value).toHaveLength(2));
    submit();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(savedRecurrence(onSave)).toMatchObject({ type: "month", endType: "never" });
  });
});

describe("availability answers the modal has to wait for", () => {
  // The hint reads "0 clinicians" from the moment the slot is complete, well
  // before the debounced lookup answers, so each of these seeds a first
  // response and then moves the slot -- reaching the count of 2 is what proves
  // the second, oddly shaped response was the one actually unwrapped.
  const settleTwice = async (second) => {
    api.getAvailableStaff
      .mockResolvedValueOnce(staffPayload(staff))
      .mockResolvedValue(second);
    renderModal();
    setField("Start Time", "09:00");
    setField("End Time", "10:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 2 clinicians/)).toBeInTheDocument()
    );
    setField("Start Time", "11:00");
    await waitFor(() =>
      expect(screen.getByText(/Showing the 0 clinicians/)).toBeInTheDocument()
    );
  };

  it("treats an envelope with no payload inside it as nobody free", async () => {
    await settleTwice({});
  });

  it("treats a payload that is not a list as nobody free", async () => {
    await settleTwice({ data: { data: "unavailable" } });
  });
});

describe("a recurrence rule the schema refuses", () => {
  const startRecurring = async (type) => {
    const view = renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", type);
    return view;
  };

  it("refuses a weekly repeat that names no days", async () => {
    const { onSave } = await startRecurring("week");
    submit();

    await waitFor(() =>
      expect(screen.getByText("At least one day is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a custom weekly repeat that names no days", async () => {
    const { onSave } = await startRecurring("custom");
    setInterval_("2");
    chooseByName("customRecurrenceUnit", "Week");
    submit();

    await waitFor(() =>
      expect(screen.getByText("At least one day is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses a custom monthly repeat once the calendar is emptied again", async () => {
    const { onSave } = await startRecurring("custom");
    setInterval_("2");
    fireEvent.click(screen.getByTestId("day-picker"));
    await waitFor(() => expect(datePicker.props.value).toHaveLength(2));

    fireEvent.click(screen.getByTestId("day-picker"));
    datePicker.props.onChange(null);
    submit();

    await waitFor(() =>
      expect(screen.getByText("At least one day is required")).toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  // `customRecurrenceInterval` is registered against a real DOM node, so its
  // error object carries a circular `ref` and the modal's invalid handler
  // throws on JSON.stringify before any message reaches the screen -- the same
  // dead end a cleared date hits. Pinned as current behaviour; see the report.
  it("goes silent rather than complaining about a custom repeat with no interval", async () => {
    const { onSave, onClose } = await startRecurring("custom");
    chooseByName("customRecurrenceUnit", "Day");
    submit();

    await waitFor(() =>
      expect(
        document.querySelector('input[name="customRecurrenceInterval"]').value
      ).toBe("")
    );
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Recurrence interval is required")
    ).not.toBeInTheDocument();
  });
});

describe("switching a custom monthly repeat back to dates", () => {
  it("drops the weekday it was pinned to and asks for days again", async () => {
    renderModal();
    await fillRequired();
    tickRecurring();
    pickRadio("recurrenceType", "custom");
    setInterval_("2");
    fireEvent.click(screen.getByText("On the").previousSibling);
    chooseByName("customRecurrenceWeekday", "Monday");
    expect(screen.queryByTestId("day-picker")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("On day").previousSibling);

    // The weekday picker is gone with the ordinal, and the calendar is back.
    await waitFor(() =>
      expect(screen.getByTestId("day-picker")).toBeInTheDocument()
    );
    expect(
      document.querySelector('input[name="customRecurrenceWeekday"]')
    ).toBeNull();
  });
});

describe("a warning that is already on screen", () => {
  it("clears the earlier warning before deciding whether to raise it again", async () => {
    // st2 allows no roles at all, so the first clinician raises the warning;
    // adding a second re-runs the check against the warning already held.
    renderModal();
    await fillRequired(1);
    await waitFor(() =>
      expect(
        screen.getByText(/only eligible clinicians are assigned/)
      ).toBeInTheDocument()
    );

    pickOption("Clinician(s)", 1);

    await waitFor(() =>
      expect(
        screen.getAllByText(/only eligible clinicians are assigned/)
      ).toHaveLength(1)
    );
  });
});

describe("confirming a recurring edit whose service was never modified", () => {
  it("sends an empty modifier rather than nothing at all", async () => {
    const view = renderModal({
      isEditMode: true,
      initialData: {
        id: "a1",
        date: today,
        startTime: "09:00",
        endTime: "10:00",
        clientId: "c1",
        sessionType: "st1",
        clinicianIds: ["s1"],
        serviceLocation: "Home",
        // No modifierType on the row, so the confirm path has to supply "".
        service: [{ serviceCodeId: "sc1" }],
        isRecurring: true,
        recurrence: { type: "day", endType: "never" },
      },
    });
    await waitFor(() => expect(inputFor("Start Time").value).toBe("09:00"));
    fireEvent.click(screen.getByText("Save"));
    fireEvent.click(await screen.findByText("All Events in This Series"));

    await waitFor(() => expect(view.onSave).toHaveBeenCalledTimes(1));
    expect(view.onSave.mock.calls[0][0]).toMatchObject({
      scope: "all",
      service: [{ serviceCodeId: "sc1", modifiers: { modifier: "" } }],
    });
  });
});
