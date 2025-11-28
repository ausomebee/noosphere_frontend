import React from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { addIncomeSchema } from "../../../Data/schemas";

const AddIncomeItemModal = ({ isOpen, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addIncomeSchema),
    defaultValues: {
      incomeItem: "",
      unitType: "",
      amount: 0,
    },
  });

  const incomeOptions = [
    { value: "overwork_commission", label: "Overwork Commission" },
    { value: "capital_compensation", label: "Capital Compensation" },
    { value: "extraordinary_work", label: "Extraordinary Work" },
  ];

  const unitTypeOptions = [
    { value: "flat_rate", label: "Flat Rate" },
    { value: "percentage_based", label: "Percentage based" },
    { value: "hourly_rate", label: "Hourly Rate" },
    { value: "hourly_rate_with_overtime", label: "Hourly Rate with Overtime" },
  ];

  const onSubmit = (data) => {
    onSave({
      type: data.incomeItem,
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
      title="Add Income Item"
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="incomeItem"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Select Income Item"
              options={incomeOptions}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select"
              className="w-full"
              error={errors.incomeItem?.message}
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

export default AddIncomeItemModal;