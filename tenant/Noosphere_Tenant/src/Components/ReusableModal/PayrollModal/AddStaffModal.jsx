import React from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { addStaffSchema } from "../../../Data/schemas";
import { mockEmployees } from "../../../Data/mockData";


const AddStaffModal = ({ isOpen, onClose, onSave, isMultiple = true }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addStaffSchema),
    defaultValues: {
      selectedStaff: [],
    },
  });

  const onSubmit = (data) => {
    onSave(data.selectedStaff);
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
      title="Add Staff to Payroll"
      primaryButtonText="Add Selected"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="selectedStaff"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Select Employees"
              options={mockEmployees.map((emp) => ({
                value: emp.id,
                label: emp.name,
              }))}
              value={field.value}
              onChange={(value) => field.onChange(value)}
              placeholder="Select employees"
              className="w-full"
              error={errors.selectedStaff?.message}
              isMulti={isMultiple}
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default AddStaffModal;