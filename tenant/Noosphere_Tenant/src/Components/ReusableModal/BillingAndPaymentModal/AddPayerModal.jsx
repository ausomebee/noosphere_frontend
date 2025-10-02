import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextareaInput, TextInput, CheckboxInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";

// Validation schema
const payerSchema = yup.object().shape({
  payerName: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Payer Name is required"),
  }),
  email: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().email("Invalid email").required("Email is required"),
  }),
  phoneNumber: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Phone Number is required"),
  }),
  insuranceType: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Insurance Type is required"),
  }),
  tplCode: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("TPL Code is required"),
  }),
  carrierPayerId: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Carrier Payer ID is required"),
  }),
  address: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Address is required"),
  }),
  city: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("City is required"),
  }),
  state: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("State is required"),
  }),
  zip: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("ZIP is required"),
  }),
  country: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Country is required"),
  }),
  code: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Service Code is required"),
  }),
  description: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Description is required"),
  }),
  unitType: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Unit Type is required"),
  }),
  unitDuration: yup
    .number()
    .typeError("Must be a number")
    .min(1, "Must be 1 or greater")
    .when("mode", {
      is: "view",
      then: yup.number().optional(),
      otherwise: yup.number().required("Unit Duration is required"),
    }),
  unitCurrency: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Unit Currency is required"),
  }),
  ratePerUnit: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater")
    .when("mode", {
      is: "view",
      then: yup.number().optional(),
      otherwise: yup.number().required("Rate per Unit is required"),
    }),
  roundingRule: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Rounding Rule is required"),
  }),
  modifiers: yup.array().of(
    yup.object().shape({
      modifier: yup.string().when("mode", {
        is: "view",
        then: yup.string().optional(),
        otherwise: yup.string().required("Modifier is required"),
      }),
      ratePerUnit: yup
        .number()
        .typeError("Must be a number")
        .min(0, "Must be 0 or greater")
        .when("mode", {
          is: "view",
          then: yup.number().optional(),
          otherwise: yup.number().required("Rate per Unit is required"),
        }),
    })
  ),
  billable: yup.boolean().when("mode", {
    is: "view",
    then: yup.boolean().optional(),
    otherwise: yup.boolean().required("Billable is required"),
  }),
});

// Utility function to transform table data to form data
const transformPayerToFormData = (data, mode) => ({
  mode,
  payerName: data.payerName || "",
  email: data.email || "",
  phoneNumber: data.phoneNumber || "",
  insuranceType: data.insureType || "",
  tplCode: data.tplCode || "",
  carrierPayerId: data.carrierPayerId || "",
  address: data.address || "",
  city: data.city || "",
  state: data.state || "",
  zip: data.zip || "",
  country: data.country || "",
  code: data.code || "",
  description: data.description || "",
  unitType: data.unitType || "",
  unitDuration: data.unitDuration || 0,
  unitCurrency: data.unitCurrency || "",
  ratePerUnit: data.ratePerUnit || 0,
  roundingRule: data.roundingRule || "",
  modifiers: Array.isArray(data.modifiers)
    ? data.modifiers.map((m) => ({
        modifier: m.modifier || "",
        ratePerUnit: m.ratePerUnit || 0,
      }))
    : [{ modifier: "", ratePerUnit: 0 }],
  billable: data.billable !== undefined ? data.billable : false,
});

const AddPayerModal = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState("Payer Info");
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const countryOptions = [
    { value: "US", label: "United States" },
    { value: "UK", label: "United Kingdom" },
  ];

  const stateOptions = [
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
  ];

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(payerSchema),
    defaultValues: transformPayerToFormData(initialData, mode),
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "modifiers",
  });

  useEffect(() => {
    if (isOpen) {
      reset(transformPayerToFormData(initialData, mode));
      setHasChanges(false);
    }
  }, [isOpen, mode, initialData, reset]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === "change" && mode !== "view") {
        setHasChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, mode]);

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      await onSave(data);
      reset(transformPayerToFormData(initialData, mode));
      onClose();
    } catch (error) {
      console.error("Error saving payer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset(transformPayerToFormData(initialData, mode));
    onClose();
  };

  const handleNext = () => {
    setActiveTab("Service Code");
  };

  const handlePrevious = () => {
    setActiveTab("Payer Info");
  };

  const unitTypeOptions = [
    { value: "Adaptive behavior treatment", label: "Adaptive behavior treatment" },
    {
      value: "Adaptive behavior treatment with protocol modification",
      label: "Adaptive behavior treatment with protocol modification",
    },
    {
      value: "Behavior Identification supporting assessment",
      label: "Behavior Identification supporting assessment",
    },
    { value: "Comprehensive adaptive behavior", label: "Comprehensive adaptive behavior" },
  ];

  const currencyOptions = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
  ];

  const roundingRuleOptions = [
    { value: "Nearest", label: "Nearest" },
    { value: "Up", label: "Up" },
    { value: "Down", label: "Down" },
  ];

  const modifierOptions = [
    { value: "M23.9", label: "M23.9" },
    { value: "M45.9", label: "M45.9" },
    { value: "M67.8", label: "M67.8" },
  ];

  const insuranceTypeOptions = [
    { value: "Group Health Plan", label: "Group Health Plan" },
    { value: "Medicaid", label: "Medicaid" },
    { value: "Tricare", label: "Tricare" },
    { value: "Medicare", label: "Medicare" },
    { value: "Champ VA", label: "Champ VA" },
  ];

  const buildTabs = () => [
    ...(mode !== "view"
      ? [
          {
            name: "Payer Info",
            content: (
              <div className="space-y-4">
                <TextInput
                  label="Payer Name"
                  {...register("payerName")}
                  error={errors.payerName?.message}
                  placeholder="Enter Payer Name"
                  disabled={mode === "view"}
                />
                <TextInput
                  label="Email"
                  type="email"
                  {...register("email")}
                  error={errors.email?.message}
                  placeholder="Enter Email"
                  disabled={mode === "view"}
                />
                <TextInput
                  label="Phone Number"
                  type="tel"
                  {...register("phoneNumber")}
                  error={errors.phoneNumber?.message}
                  placeholder="Enter Phone Number"
                  disabled={mode === "view"}
                />
                <Controller
                  name="insuranceType"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Insurance Type"
                      placeholder="Select Insurance Type"
                      options={insuranceTypeOptions}
                      width="full"
                      isSearchable={false}
                      error={errors.insuranceType?.message}
                      disabled={mode === "view"}
                      {...field}
                    />
                  )}
                />
                <TextInput
                  label="TPL Code"
                  {...register("tplCode")}
                  error={errors.tplCode?.message}
                  placeholder="Enter TPL Code"
                  disabled={mode === "view"}
                />
                <TextInput
                  label="Carrier Payer ID"
                  {...register("carrierPayerId")}
                  error={errors.carrierPayerId?.message}
                  placeholder="Enter Carrier Payer ID"
                  disabled={mode === "view"}
                />
                <div className="flex gap-4 border-t pt-5">
                  <div className="flex-1">
                    <TextInput
                      label="Address"
                      {...register("address")}
                      error={errors.address?.message}
                      placeholder="Enter Address"
                      disabled={mode === "view"}
                    />
                  </div>
                  <TextInput
                    label="City"
                    {...register("city")}
                    error={errors.city?.message}
                    placeholder="Enter City"
                    disabled={mode === "view"}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Controller
                      name="state"
                      control={control}
                      render={({ field }) => (
                        <SelectInput
                          label="State"
                          options={stateOptions}
                          error={errors.state?.message}
                          placeholder="Select state"
                          disabled={mode === "view"}
                          {...field}
                        />
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <TextInput
                      label="ZIP"
                      {...register("zip")}
                      error={errors.zip?.message}
                      placeholder="Enter ZIP"
                      disabled={mode === "view"}
                    />
                  </div>
                  <div className="flex-1">
                    <Controller
                      name="country"
                      control={control}
                      render={({ field }) => (
                        <SelectInput
                          label="Country"
                          options={countryOptions}
                          error={errors.country?.message}
                          placeholder="Select country"
                          disabled={mode === "view"}
                          {...field}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            ),
          },
        ]
      : []),
    {
      name: "Service Code",
      content: (
        <div className="space-y-4">
          <TextInput
            label="Service Code"
            {...register("code")}
            error={errors.code?.message}
            placeholder="Enter Service Code"
            disabled={mode === "view"}
          />
          <TextareaInput
            label="Description"
            {...register("description")}
            error={errors.description?.message}
            placeholder="Enter a description"
            disabled={mode === "view"}
          />
          <div className="flex gap-4 items-center mb-2">
            <div className="flex-1">
              <Controller
                name="unitType"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Unit Type"
                    options={unitTypeOptions}
                    error={errors.unitType?.message}
                    disabled={mode === "view"}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="flex-1">
              <TextInput
                label="Unit Duration"
                type="number"
                {...register("unitDuration")}
                error={errors.unitDuration?.message}
                placeholder="Enter Unit Duration (mins)"
                disabled={mode === "view"}
              />
            </div>
          </div>
          <div className="flex gap-4 items-center mb-2">
            <div className="">
              <Controller
                name="unitCurrency"
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Unit Currency"
                    options={currencyOptions}
                    error={errors.unitCurrency?.message}
                    disabled={mode === "view"}
                    {...field}
                  />
                )}
              />
            </div>
            <div className="flex-1">
              <TextInput
                label="Rate per Unit"
                type="number"
                {...register("ratePerUnit")}
                error={errors.ratePerUnit?.message}
                placeholder="Enter Rate per Unit"
                disabled={mode === "view"}
              />
            </div>
          </div>
          <Controller
            name="roundingRule"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Rounding Rule"
                options={roundingRuleOptions}
                error={errors.roundingRule?.message}
                placeholder="Select rounding rule"
                disabled={mode === "view"}
                {...field}
              />
            )}
          />
          <p className="text-base text-gray-600 font-semibold">Modifiers</p>
          {fields.map((item, index) => (
            <div key={item.id} className="flex gap-4 items-center mb-2">
              <div className="flex-1">
                <Controller
                  name={`modifiers[${index}].modifier`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Modifier"
                      options={modifierOptions}
                      error={errors.modifiers?.[index]?.modifier?.message}
                      disabled={mode === "view"}
                      {...field}
                    />
                  )}
                />
              </div>
              <div className="flex-1">
                <TextInput
                  label="Rate per Unit"
                  type="number"
                  {...register(`modifiers[${index}].ratePerUnit`)}
                  error={errors.modifiers?.[index]?.ratePerUnit?.message}
                  placeholder="Enter Rate per Unit"
                  disabled={mode === "view"}
                />
              </div>
              {mode !== "view" && fields.length > 1 && (
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => remove(index)}
                  aria-label="Remove Modifier"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add"
            onClick={() => append({ modifier: "", ratePerUnit: 0 })}
            disabled={mode === "view"}
          />
          <div className="py-2 px-2 rounded-md bg-gray-150 mt-6 mb-6">
            <Controller
              name="billable"
              control={control}
              render={({ field }) => (
                <CheckboxInput
                  label="This service is billable"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={mode === "view"}
                />
              )}
            />
          </div>
        </div>
      ),
    },
  ];

  const getPrimaryButtonText = () => {
    if (mode === "view") return "Close";
    if (mode === "edit" && hasChanges) return "Save Changes";
    if (mode === "edit" && !hasChanges) return "Next";
    return activeTab === "Service Code" ? "Save Payer" : "Next";
  };

  const getSecondaryButtonText = () => {
    if (mode === "view") return null;
    return activeTab === "Payer Info" ? "Cancel" : "Previous";
  };

  const getPrimaryButtonAction = () => {
    if (mode === "view") return handleClose;
    if (activeTab === "Service Code") return handleSubmit(handleFormSubmit);
    return handleNext;
  };

  return (
    <ReusableModal
      key={isOpen ? "open" : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === "view"
          ? "View Payer"
          : mode === "edit"
          ? "Edit a Payer"
          : "Add a Payer"
      }
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      tabs={buildTabs()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={getPrimaryButtonAction()}
      onSecondaryButtonClick={
        activeTab === "Payer Info" || mode === "view" ? handleClose : handlePrevious
      }
      size="md"
      primaryButtonLoading={submitting}
    />
  );
};

export default AddPayerModal;