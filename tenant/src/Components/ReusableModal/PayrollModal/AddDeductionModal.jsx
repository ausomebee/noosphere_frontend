import React from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { addDeductionSchema } from "../../../Data/schemas";

const AddDeductionModal = ({ isOpen, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addDeductionSchema),
    defaultValues: {
      deductionItem: "",
      unitType: "",
      amount: 0,
    },
  });

  const deductionOptions = [
    { value: "insurance", label: "Insurance" },
    { value: "loan", label: "Loan Deduction" },
    { value: "other", label: "Other Deductions" },
  ];

  const unitTypeOptions = [
    { value: "flat_rate", label: "Flat Rate" },
    { value: "percentage_based", label: "Percentage based" },
  ];

  const onSubmit = (data) => {
    onSave({
      type: data.deductionItem,
      unitType: data.unitType,
      amount: Number(data.amount),
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Deduction"
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="deductionItem"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Select Deduction"
              options={deductionOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select"
              className="w-full"
              error={errors.deductionItem?.message}
            />
          )}
        />
        <Controller
          name="unitType"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Unit Type"
              options={unitTypeOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select unit type"
              className="w-full"
              error={errors.unitType?.message}
            />
          )}
        />
        <TextInput
          label="Amount"
          type="number"
          {...control.register("amount")}
          error={errors.amount?.message}
          placeholder="Enter amount"
          className="w-full"
        />
      </div>
    </ReusableModal>
  );
};

export default AddDeductionModal;