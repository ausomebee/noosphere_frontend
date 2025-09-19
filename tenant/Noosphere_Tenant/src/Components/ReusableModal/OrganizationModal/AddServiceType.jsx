import React, {useState} from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput, TextareaInput, CheckboxInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus } from "react-icons/fa";

// Validation schema
const serviceTypeSchema = yup.object({
  code: yup.string().required("Code is required"),
  serviceDescription: yup.string().optional(),
  unitType: yup.string().required("Unit type is required"),
  unitDuration: yup.string().required("Unit duration is required"),
  rate: yup.string().required("Rate is required"),
  rateCurrency: yup.string().required("Rate currency is required"),
  roundingRule: yup.string().required("Rounding rule is required"),
  modifier: yup.string().optional(),
  ratePerUnit: yup.string().optional(),
  billable: yup.boolean().default(false),
});

// Sample state options (replace with actual data)
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
];

const AddServiceType = ({ isOpen, onClose, onSave, mode = "add", initialData = {} }) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(serviceTypeSchema),
    defaultValues: mode === "edit" ? { ...initialData } : {
      code: "",
      serviceDescription: "",
      unitType: "",
      unitDuration: "",
      rate: "",
      rateCurrency: "",
      roundingRule: "",
      modifier: "",
      ratePerUnit: "",
      billable: false,
    },
  });

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error("Error saving service type:", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title={mode === "edit" ? "Edit Service Type" : "Add a Service Type"}
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleFormSubmit)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
      size="medium"
      primaryButtonLoading={submitting}
    >
      <div className="space-y-4">
        <div>
          <TextInput
            label="Code"
            {...register("code")}
            placeholder="Start typing to search"
            width="full"
            error={errors.code?.message} // Fixed from domainName
          />
        </div>
        <div>
          <TextareaInput
            label="Description"
            {...register("serviceDescription")}
            placeholder="Enter service description"
            width="full"
            error={errors.serviceDescription?.message} // Fixed from domainDescription
          />
        </div>
        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <Controller
              name="unitType"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Unit Type"
                  options={stateOptions} // Replace with actual unit type options
                  error={errors.unitType?.message}
                  placeholder="Select unit type"
                  {...field}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="Unit Duration"
              {...register("unitDuration")} // Fixed from city
              error={errors.unitDuration?.message}
              placeholder="Enter unit duration"
              width="full"
            />
          </div>
        </div>
        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <TextInput
              label="Rate"
              {...register("rate")} // Fixed from city
              error={errors.rate?.message}
              placeholder="Enter rate"
              width="full"
            />
          </div>
          <div className="">
            <Controller
              name="rateCurrency"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Rate Currency"
                  options={stateOptions} // Replace with actual currency options
                  error={errors.rateCurrency?.message}
                  placeholder="Select currency"
                  {...field}
                />
              )}
            />
          </div>
        </div>

        <div className="">
          <Controller
            name="roundingRule"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Rounding Rule"
                options={stateOptions} // Replace with actual rounding rule options
                error={errors.roundingRule?.message}
                placeholder="Select rounding rule"
                {...field}
              />
            )}
          />
        </div>
        <p className="text-base text-gray-400 font-semibold">Modifiers</p>

        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <TextInput
              label="Modifier"
              type="text"
              {...register("modifier")} // Fixed from expiryDate
              error={errors.modifier?.message}
              placeholder="Enter modifier"
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="Rate per Unit"
              type="text"
              {...register("ratePerUnit")} // Fixed from expiryDate
              error={errors.ratePerUnit?.message}
              placeholder="Enter rate per unit"
            />
          </div>
        </div>
        {/* Button to add more modifiers (placeholder) */}
        <Button icon={<FaPlus />} variant="secondary" label="Add" />

        <div className="py-2 px-2 rounded-md bg-gray-150 mt-2">
          <Controller
            name="billable"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="This service is billable"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default AddServiceType;