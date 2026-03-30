import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextareaInput, TextInput, CheckboxInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";
import { showToast } from "../../../Helper/ShowToast";
import { currencyOptions, modifierOptions, stateOptions, countryOptions } from "../../../Data/selectOptions";
import { payerSchema, transformPayerToFormData } from "./addPayerSchema";

const AddPayerModal = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
  onDelete,
  insuranceTypes = [],
  serviceCodes = [],
  roundingRules = [],
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState("Payer Info");
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(payerSchema),
    context: {mode},
    defaultValues: transformPayerToFormData(initialData, mode),
  });

  const { fields: serviceCodeFields, append: appendServiceCode, remove: removeServiceCode } =
    useFieldArray({
      control,
      name: "serviceCodes",
    });

  // ✅ Build options
  const insuranceTypeOptions = insuranceTypes
    .filter((it) => it.isActive)
    .map((it) => ({ value: it.id, label: it.name }));

  const serviceCodeOptions = [
    ...serviceCodes.map((sc) => ({
      value: sc.code,
      label: `${sc.code} - ${sc.description}`,
      description: sc.description,
      modifiers: sc.modifiers || [],
      id: sc.id, // 👈 include serviceCodeId
    })),
    { value: "custom", label: "Others (Custom)", description: "", modifiers: [], id: null },
  ];

  const roundingRuleOptions = roundingRules
    .map((rr) => ({ value: rr.id, label: rr.ruleName }));

  // ✅ Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      reset(transformPayerToFormData(initialData, mode));
      setHasChanges(false);
    }
  }, [isOpen, mode, initialData, reset]);

  // ✅ Watch service code selection
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === "change" && mode !== "view") {
        setHasChanges(true);
      }
      if (name && name.includes("serviceCodes") && name.includes("codeSelection")) {
        const index = parseInt(name.match(/\[(\d+)\]/)[1], 10);
        const selectedCode = value.serviceCodes?.[index]?.codeSelection;
        const selectedOption = serviceCodeOptions.find((opt) => opt.value === selectedCode);
        if (selectedOption && selectedCode !== "custom") {
          setValue(`serviceCodes[${index}].code`, selectedOption.value);
          setValue(`serviceCodes[${index}].description`, selectedOption.description);
          setValue(`serviceCodes[${index}].serviceCodeId`, selectedOption.id || null); // 👈 store ID
          setValue(
            `serviceCodes[${index}].modifiers`,
            selectedOption.modifiers.map((m) => ({
              modifier: m.modifier || "",
              ratePerUnit: m.ratePerUnit || 0,
            }))
          );
        } else if (selectedCode === "custom") {
          setValue(`serviceCodes[${index}].code`, "");
          setValue(`serviceCodes[${index}].description`, "");
          setValue(`serviceCodes[${index}].serviceCodeId`, null);
          setValue(`serviceCodes[${index}].modifiers`, [{ modifier: "", ratePerUnit: 0 }]);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, mode, setValue, serviceCodeOptions]);

  // ✅ Submit handler
  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      const cleanedData = {
        ...data,
        serviceCodes: data.serviceCodes.map((sc) => ({
          serviceCodeId: sc.serviceCodeId || "",
          code: sc.code,
          description: sc.description,
          unitCurrency: sc.unitCurrency,
          ratePerUnit: sc.ratePerUnit,
          roundingRuleId: sc.roundingRule,
          modifiers: sc.modifiers,
          billable: sc.billable,
        })),
      };
      await onSave(cleanedData);
      reset(transformPayerToFormData(initialData, mode));
      onClose();
    } catch (error) {
      console.error("Error saving payer:", error);
      showToast("Failed to save payer", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  // ✅ Other handlers
  const handleClose = () => {
    reset(transformPayerToFormData(initialData, mode));
    onClose();
  };
  const handleNext = () => setActiveTab("Service Code");
  const handlePrevious = () => setActiveTab("Payer Info");


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
        <div className="space-y-6">
          {serviceCodeFields.map((field, index) => (
            <div key={field.id} className="space-y-4 border-b pb-4">
              <div className="flex justify-between items-center mt-6">
                <p className="text-base text-gray-600 font-semibold">Service Code {index + 1}</p>
                {mode !== "view" && serviceCodeFields.length > 1 && (
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeServiceCode(index)}
                    aria-label="Remove Service Code"
                  >
                    <FaTrash />
                  </button>
                )}
              </div>
              <Controller
                name={`serviceCodes[${index}].codeSelection`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Service Code"
                    options={serviceCodeOptions}
                    error={errors.serviceCodes?.[index]?.codeSelection?.message}
                    placeholder="Select Service Code"
                    disabled={mode === "view"}
                    {...field}
                  />
                )}
              />
              {watch(`serviceCodes[${index}].codeSelection`) === "custom" && (
                <TextInput
                  label="Custom Code"
                  {...register(`serviceCodes[${index}].code`)}
                  error={errors.serviceCodes?.[index]?.code?.message}
                  placeholder="Enter Custom Code"
                  disabled={mode === "view"}
                />
              )}
              <TextareaInput
                label="Description"
                {...register(`serviceCodes[${index}].description`)}
                error={errors.serviceCodes?.[index]?.description?.message}
                placeholder="Enter a description"
                disabled={mode === "view"}
              />
              <Controller
                name={`serviceCodes[${index}].roundingRule`}
                control={control}
                render={({ field }) => (
                  <SelectInput
                    label="Rounding Rule"
                    options={roundingRuleOptions}
                    error={errors.serviceCodes?.[index]?.roundingRule?.message}
                    placeholder="Select rounding rule"
                    disabled={mode === "view"}
                    {...field}
                  />
                )}
              />
              <div className="flex gap-4 items-center">
                <div className="">
                  <Controller
                    name={`serviceCodes[${index}].unitCurrency`}
                    control={control}
                    render={({ field }) => (
                      <SelectInput
                        label="Unit Currency"
                        options={currencyOptions}
                        error={errors.serviceCodes?.[index]?.unitCurrency?.message}
                        disabled={mode === "view"}
                        {...field}
                        placeholder="select"
                      />
                    )}
                  />
                </div>
                <div className="flex-1">
                  <TextInput
                    label="Rate per Unit"
                    type="number"
                    {...register(`serviceCodes[${index}].ratePerUnit`)}
                    error={errors.serviceCodes?.[index]?.ratePerUnit?.message}
                    placeholder="Enter Rate per Unit"
                    disabled={mode === "view"}
                  />
                </div>
              </div>
              
              <p className="text-base text-gray-600 font-semibold">Modifiers</p>
              <Controller
                name={`serviceCodes[${index}].modifiers`}
                control={control}
                render={({ field }) => {
                  const { fields: modifierFields, append: appendModifier, remove: removeModifier } = useFieldArray({
                    control,
                    name: `serviceCodes[${index}].modifiers`,
                  });
                  return (
                    <div>
                      {modifierFields.map((modField, modIndex) => (
                        <div key={modField.id} className="flex gap-4 items-center mb-2">
                          <div className="flex-1">
                            <Controller
                              name={`serviceCodes[${index}].modifiers[${modIndex}].modifier`}
                              control={control}
                              render={({ field: modField }) => (
                                <SelectInput
                                  label="Modifier"
                                  options={modifierOptions}
                                  error={errors.serviceCodes?.[index]?.modifiers?.[modIndex]?.modifier?.message}
                                  disabled={mode === "view"}
                                  {...modField}
                                />
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <TextInput
                              label="Rate per Unit"
                              type="number"
                              {...register(`serviceCodes[${index}].modifiers[${modIndex}].ratePerUnit`)}
                              error={errors.serviceCodes?.[index]?.modifiers?.[modIndex]?.ratePerUnit?.message}
                              placeholder="Enter Rate per Unit"
                              disabled={mode === "view"}
                            />
                          </div>
                          {mode !== "view" && modifierFields.length > 1 && (
                            <button
                              type="button"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => removeModifier(modIndex)}
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
                        label="Add Modifier"
                        onClick={() => appendModifier({ modifier: "", ratePerUnit: 0 })}
                        disabled={mode === "view"}
                      />
                    </div>
                  );
                }}
              />
              <div className="py-2 px-2 rounded-md bg-gray-150 mt-6 mb-6">
                <Controller
                  name={`serviceCodes[${index}].billable`}
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
          ))}
          <div className="mt-6">
          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add Service Code"
            onClick={() => appendServiceCode({
              codeSelection: "",
              code: "",
              description: "",
              unitCurrency: "",
              ratePerUnit: 0,
              roundingRule: "",
              modifiers: [{ modifier: "", ratePerUnit: 0 }],
              billable: false,
            })}
            disabled={mode === "view"}
          />
          </div>

            {/* <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
            <pre>
              {JSON.stringify(
                errors,
                (k, v) => (v instanceof HTMLElement ? "[DOM]" : v),
                2
              )}
            </pre>
          </div> */}
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
    if (activeTab === "Service Code") return handleSubmit(handleFormSubmit, onValidationError);
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
      primaryButtonLoading={submitting || loading}
    />
  );
};

export default AddPayerModal;