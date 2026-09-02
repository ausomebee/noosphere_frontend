import { describe, it, expect } from "vitest";
import { payerSchema, transformPayerToFormData } from "../Components/ReusableModal/BillingAndPaymentModal/addPayerSchema";

/**
 * The yup schema and record-to-form transform behind the Add/Edit Payer modal.
 *
 * Every top-level field is conditional on a `mode` field carried inside the
 * form values themselves: in "view" mode the whole payer becomes optional so a
 * read-only render never lights up in red. The service code rows repeat that
 * `when("mode", ...)` pattern, but `when` only ever looks at a sibling and a row
 * has no `mode` of its own — so those conditions always take the required arm
 * whatever the form's mode is. Both halves of that are pinned down below.
 *
 * The transform is a pure mapper, so its tests feed it the API's own record
 * shape and read the form values back; every field has a fallback, and the
 * service code list falls back to a single blank row.
 */

// A row that satisfies every one of the service code conditions, so tests can
// knock out the single field they are about.
const serviceCodeRow = (over = {}) => ({
  serviceCodeId: "sc-1",
  codeSelection: "97153",
  code: "97153",
  description: "Adaptive behaviour treatment",
  unitCurrency: "USD",
  ratePerUnit: 65,
  roundingRule: "rr-1",
  modifiers: [{ modifier: "HN", ratePerUnit: 5 }],
  billable: true,
  ...over,
});

const payer = (over = {}) => ({
  mode: "add",
  payerName: "Blue Shield",
  email: "claims@blueshield.com",
  phoneNumber: "08012345678",
  insuranceType: "type-1",
  tplCode: "TPL-9",
  carrierPayerId: "CP-77",
  address: "1 Marina Road",
  city: "Lagos",
  state: "California",
  zip: "10001",
  country: "United States",
  serviceCodes: [serviceCodeRow()],
  ...over,
});

// Collecting every message at once keeps a test's assertions about the field it
// names rather than whichever failure yup happened to reach first.
const errorsFor = async (value) => {
  try {
    await payerSchema.validate(value, { abortEarly: false });
    return [];
  } catch (err) {
    return err.errors;
  }
};

describe("a complete payer", () => {
  it("passes and comes back cast", async () => {
    const value = await payerSchema.validate(payer());
    expect(value.payerName).toBe("Blue Shield");
    expect(value.serviceCodes).toHaveLength(1);
    expect(value.serviceCodes[0].ratePerUnit).toBe(65);
  });

  it("casts a rate typed as a string into a number", async () => {
    const value = await payerSchema.validate(
      payer({ serviceCodes: [serviceCodeRow({ ratePerUnit: "65.5" })] })
    );
    expect(value.serviceCodes[0].ratePerUnit).toBe(65.5);
  });
});

describe("the payer's own fields", () => {
  it("names every compulsory field that is missing", async () => {
    expect(await errorsFor({ mode: "add", serviceCodes: [serviceCodeRow()] })).toEqual(
      expect.arrayContaining([
        "Payer Name is required",
        "Email is required",
        "Phone Number is required",
        "Insurance Type is required",
        "TPL Code is required",
        "Carrier Payer ID is required",
        "Address is required",
        "City is required",
        "State is required",
        "ZIP is required",
        "Country is required",
      ])
    );
  });

  it("rejects an address that is not an email", async () => {
    expect(await errorsFor(payer({ email: "claims(at)blueshield" }))).toEqual([
      "Invalid email",
    ]);
  });

  it("treats an empty string as a missing field", async () => {
    expect(await errorsFor(payer({ payerName: "", city: "" }))).toEqual(
      expect.arrayContaining(["Payer Name is required", "City is required"])
    );
  });

  it("drops every one of those demands in view mode", async () => {
    const errors = await errorsFor({ mode: "view", serviceCodes: [serviceCodeRow()] });
    expect(errors).toEqual([]);
  });

  it("stops checking the email format in view mode too", async () => {
    const errors = await errorsFor({
      mode: "view",
      email: "not an address",
      serviceCodes: [serviceCodeRow()],
    });
    expect(errors).toEqual([]);
  });

  it("still demands everything in edit mode", async () => {
    expect(await errorsFor({ mode: "edit", serviceCodes: [serviceCodeRow()] })).toEqual(
      expect.arrayContaining(["Payer Name is required", "Country is required"])
    );
  });

  it("still demands everything when no mode is set at all", async () => {
    expect(await errorsFor({ serviceCodes: [serviceCodeRow()] })).toEqual(
      expect.arrayContaining(["Payer Name is required"])
    );
  });
});

describe("the service code list", () => {
  it("insists on at least one row", async () => {
    expect(await errorsFor(payer({ serviceCodes: [] }))).toEqual([
      "At least one service code is required",
    ]);
  });

  it("insists on one even in view mode", async () => {
    expect(await errorsFor({ mode: "view", serviceCodes: [] })).toEqual([
      "At least one service code is required",
    ]);
  });

  it("lets a payload with no list at all through", async () => {
    // `min` only fires on a list that is actually present, so an absent key is
    // a different failure mode from an empty array.
    const withoutList = payer();
    delete withoutList.serviceCodes;
    expect(await errorsFor(withoutList)).toEqual([]);
  });

  it("checks every row, not just the first", async () => {
    const errors = await errorsFor(
      payer({
        serviceCodes: [serviceCodeRow(), serviceCodeRow({ code: "", unitCurrency: "" })],
      })
    );
    expect(errors).toEqual(
      expect.arrayContaining(["Code is required", "Unit Currency is required"])
    );
  });
});

describe("a single service code row", () => {
  const rowErrors = (over) => errorsFor(payer({ serviceCodes: [serviceCodeRow(over)] }));

  it("names each compulsory field on the row", async () => {
    const errors = await errorsFor(payer({ serviceCodes: [{}] }));
    expect(errors).toEqual(
      expect.arrayContaining([
        "Service Code is required",
        "Code is required",
        "Unit Currency is required",
        "Rate per Unit is required",
        "Rounding Rule is required",
        "Billable is required",
      ])
    );
  });

  it("keeps demanding them in view mode", async () => {
    // The row's conditions look for a sibling `mode`, which a row never has, so
    // the form's own mode cannot reach them. A read-only payer with an
    // incomplete row therefore still fails validation.
    const errors = await errorsFor({ mode: "view", serviceCodes: [{}] });
    expect(errors).toEqual(expect.arrayContaining(["Code is required"]));
  });

  it("accepts a row with no description", async () => {
    expect(await rowErrors({ description: undefined })).toEqual([]);
  });

  it("accepts a row that is explicitly not billable", async () => {
    expect(await rowErrors({ billable: false })).toEqual([]);
  });

  it("accepts a row with no service code id", async () => {
    expect(await rowErrors({ serviceCodeId: null })).toEqual([]);
  });
});

describe("a row's rate", () => {
  const rateErrors = (ratePerUnit) =>
    errorsFor(payer({ serviceCodes: [serviceCodeRow({ ratePerUnit })] }));

  it("rejects a rate that is not a number", async () => {
    expect(await rateErrors("free")).toEqual(["Must be a number"]);
  });

  it("rejects a blank rate as unparseable rather than missing", async () => {
    // There is no empty-string transform on this field, so a cleared box casts
    // to NaN and trips the type error before the required check is reached.
    expect(await rateErrors("")).toEqual(["Must be a number"]);
  });

  it("rejects a negative rate", async () => {
    expect(await rateErrors(-1)).toEqual(["Must be 0 or greater"]);
  });

  it("accepts a rate of exactly zero", async () => {
    expect(await rateErrors(0)).toEqual([]);
  });

  it("reports a missing rate as missing", async () => {
    const row = serviceCodeRow();
    delete row.ratePerUnit;
    expect(await errorsFor(payer({ serviceCodes: [row] }))).toEqual([
      "Rate per Unit is required",
    ]);
  });
});

describe("a row's modifiers", () => {
  const withModifiers = (modifiers) =>
    errorsFor(payer({ serviceCodes: [serviceCodeRow({ modifiers })] }));

  it("accepts a row with no modifier list", async () => {
    expect(await withModifiers(undefined)).toEqual([]);
  });

  it("accepts a row with an empty modifier list", async () => {
    expect(await withModifiers([])).toEqual([]);
  });

  it("accepts a modifier with no name", async () => {
    expect(await withModifiers([{ ratePerUnit: 3 }])).toEqual([]);
  });

  it("treats a cleared modifier rate as no rate at all", async () => {
    // The transform swaps an empty string for undefined so a half-filled
    // modifier row does not report a type error the user cannot act on.
    expect(await withModifiers([{ modifier: "HN", ratePerUnit: "" }])).toEqual([]);
  });

  it("accepts a modifier rate that is explicitly null", async () => {
    expect(await withModifiers([{ modifier: "HN", ratePerUnit: null }])).toEqual([]);
  });

  it("rejects a modifier rate that is not a number", async () => {
    expect(await withModifiers([{ modifier: "HN", ratePerUnit: "lots" }])).toEqual([
      "Must be a number",
    ]);
  });

  it("rejects a negative modifier rate", async () => {
    expect(await withModifiers([{ modifier: "HN", ratePerUnit: -2 }])).toEqual([
      "Must be 0 or greater",
    ]);
  });

  it("accepts a modifier rate of zero", async () => {
    expect(await withModifiers([{ modifier: "HN", ratePerUnit: 0 }])).toEqual([]);
  });
});

describe("turning a stored payer into form values", () => {
  it("maps a complete record across", () => {
    const form = transformPayerToFormData(
      {
        payerName: "Blue Shield",
        email: "claims@blueshield.com",
        phone: "08012345678",
        insuranceTypeId: "type-1",
        tplCode: "TPL-9",
        carrierPayerId: "CP-77",
        address: "1 Marina Road",
        city: "Lagos",
        state: "California",
        zip: "10001",
        country: "United States",
        serviceCodes: [
          {
            serviceCodeId: "sc-1",
            code: "97153",
            description: "Adaptive behaviour treatment",
            unitCurrency: "USD",
            ratePerUnit: 65,
            roundingRuleId: "rr-1",
            modifiers: [{ modifier: "HN", ratePerUnit: 5 }],
            billable: true,
          },
        ],
      },
      "edit"
    );
    expect(form).toEqual({
      mode: "edit",
      payerName: "Blue Shield",
      email: "claims@blueshield.com",
      phoneNumber: "08012345678",
      insuranceType: "type-1",
      tplCode: "TPL-9",
      carrierPayerId: "CP-77",
      address: "1 Marina Road",
      city: "Lagos",
      state: "California",
      zip: "10001",
      country: "United States",
      serviceCodes: [
        {
          serviceCodeId: "sc-1",
          codeSelection: "97153",
          code: "97153",
          description: "Adaptive behaviour treatment",
          unitCurrency: "USD",
          ratePerUnit: 65,
          roundingRule: "rr-1",
          modifiers: [{ modifier: "HN", ratePerUnit: 5 }],
          billable: true,
        },
      ],
    });
  });

  it("blanks every field an empty record leaves out", () => {
    const form = transformPayerToFormData({}, "add");
    expect(form).toEqual({
      mode: "add",
      payerName: "",
      email: "",
      phoneNumber: "",
      insuranceType: undefined,
      tplCode: "",
      carrierPayerId: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      serviceCodes: [
        {
          serviceCodeId: null,
          codeSelection: "",
          code: "",
          description: "",
          unitCurrency: "",
          ratePerUnit: 0,
          roundingRule: "",
          modifiers: [{ modifier: "", ratePerUnit: 0 }],
          billable: false,
        },
      ],
    });
  });

  it("falls back to one blank row when the list is empty", () => {
    expect(transformPayerToFormData({ serviceCodes: [] }, "add").serviceCodes).toEqual([
      expect.objectContaining({ codeSelection: "", code: "" }),
    ]);
  });

  it("falls back to one blank row when the list is not a list", () => {
    expect(transformPayerToFormData({ serviceCodes: null }, "add").serviceCodes).toEqual([
      expect.objectContaining({ codeSelection: "", code: "" }),
    ]);
  });

  it("marks a row with no code as a custom one", () => {
    // The picker's value doubles as "which catalogue code is this", so a row
    // that came from nowhere has to be flagged rather than left blank.
    const [row] = transformPayerToFormData(
      { serviceCodes: [{ description: "Ad hoc", ratePerUnit: 40 }] },
      "edit"
    ).serviceCodes;
    expect(row.codeSelection).toBe("custom");
    expect(row.code).toBe("");
    expect(row.serviceCodeId).toBeNull();
  });

  it("gives a row with no modifiers one blank modifier to edit", () => {
    const [row] = transformPayerToFormData(
      { serviceCodes: [{ code: "97153", modifiers: undefined }] },
      "edit"
    ).serviceCodes;
    expect(row.modifiers).toEqual([{ modifier: "", ratePerUnit: 0 }]);
  });

  it("keeps a row's empty modifier list empty", () => {
    const [row] = transformPayerToFormData(
      { serviceCodes: [{ code: "97153", modifiers: [] }] },
      "edit"
    ).serviceCodes;
    expect(row.modifiers).toEqual([]);
  });

  it("blanks the parts of a modifier that are missing", () => {
    const [row] = transformPayerToFormData(
      { serviceCodes: [{ code: "97153", modifiers: [{}] }] },
      "edit"
    ).serviceCodes;
    expect(row.modifiers).toEqual([{ modifier: "", ratePerUnit: 0 }]);
  });

  it("keeps a row explicitly marked unbillable", () => {
    const [row] = transformPayerToFormData(
      { serviceCodes: [{ code: "97153", billable: false }] },
      "edit"
    ).serviceCodes;
    expect(row.billable).toBe(false);
  });

  it("defaults a row with no billable flag to unbillable", () => {
    const [row] = transformPayerToFormData({ serviceCodes: [{ code: "97153" }] }, "edit")
      .serviceCodes;
    expect(row.billable).toBe(false);
  });

  it("zeroes a rate the record does not carry", () => {
    const [row] = transformPayerToFormData(
      { serviceCodes: [{ code: "97153", ratePerUnit: null }] },
      "edit"
    ).serviceCodes;
    expect(row.ratePerUnit).toBe(0);
  });

  it("produces values the schema then accepts", () => {
    const form = transformPayerToFormData(
      {
        payerName: "Blue Shield",
        email: "claims@blueshield.com",
        phone: "08012345678",
        insuranceTypeId: "type-1",
        tplCode: "TPL-9",
        carrierPayerId: "CP-77",
        address: "1 Marina Road",
        city: "Lagos",
        state: "California",
        zip: "10001",
        country: "United States",
        serviceCodes: [
          {
            serviceCodeId: "sc-1",
            code: "97153",
            unitCurrency: "USD",
            ratePerUnit: 65,
            roundingRuleId: "rr-1",
            billable: true,
          },
        ],
      },
      "edit"
    );
    return expect(payerSchema.validate(form)).resolves.toMatchObject({ mode: "edit" });
  });
});
