import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput } from "../../Input/Inputs";
import { newPayrollSchema } from "../../../Data/schemas";
import PreviewPayrollModal from "./PreviewPayrollModal";
import useAuth from "../../../hooks/useAuth";

import { showValidationErrors as onValidationError } from "../../../Helper/formErrors";
const COMPENSATION_OPTIONS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "SALARIED", label: "Salaried" },
  { value: "DAILY", label: "Daily" },
];

const NewPayrollModal = ({ isOpen, onClose, onSave }) => {
  const { tenantId, accessToken, refreshToken } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(newPayrollSchema),
    defaultValues: {
      compensationType: "",
      from: "",
      to: "",
    },
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [payrollData, setPayrollData] = useState(null);

  const watchedValues = watch();

  const onSubmit = (data) => {
    setPayrollData(data);
    setIsPreviewOpen(true);
  };

  const handlePreviewSave = () => {
    setIsPreviewOpen(false);
    reset();
    onSave();
  };

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <>
      <ReusableModal
        isOpen={isOpen && !isPreviewOpen}
        onClose={handleClose}
        title="New Payroll"
        primaryButtonText="Next"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSubmit(onSubmit, onValidationError)}
        onSecondaryButtonClick={handleClose}
        primaryButtonLoading={false}
        size="medium"
      >
        <div className="flex flex-col gap-4">
          <Controller
            name="compensationType"
            control={control}
            render={({ field }) => (
              <SelectInput
                required
                label="Compensation Type"
                options={COMPENSATION_OPTIONS}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="Select compensation type"
                className="w-full"
                error={errors.compensationType?.message}
              />
            )}
          />
          <div className="flex gap-4">
            <div className="flex-1">
              <Controller
                name="from"
                control={control}
                render={({ field }) => (
                  <TextInput
                    required
                    label="Start Date"
                    type="date"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    className="rounded-20px"
                    width="full"
                    error={errors.from?.message}
                    placeholder="Select a starting date"
                  />
                )}
              />
            </div>
            <div className="flex-1">
              <Controller
                name="to"
                control={control}
                render={({ field }) => (
                  <TextInput
                    required
                    label="End Date"
                    type="date"
                    value={field.value}
                    onChange={(value) => field.onChange(value)}
                    className="rounded-20px"
                    width="full"
                    error={errors.to?.message}
                    placeholder="Select an ending date"
                    min={watchedValues.from}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </ReusableModal>
      <PreviewPayrollModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        payrollData={payrollData}
        onSave={handlePreviewSave}
        tenantId={tenantId}
        accessToken={accessToken}
        refreshToken={refreshToken}
      />
    </>
  );
};

export default NewPayrollModal;
