import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { TextInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { newPayrollSchema } from "../../../Data/schemas";
import PreviewPayrollModal from "./PreviewPayrollModal";

const NewPayrollModal = ({ isOpen, onClose, onSave }) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm({
    resolver: yupResolver(newPayrollSchema),
    defaultValues: {
      from: "",
      to: "",
    },
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const watchedValues = watch();

  const onSubmit = (data) => {
    setIsLoading(true);
    setTimeout(() => {
      setPayrollData(data);
      setIsPreviewOpen(true);
      setIsLoading(false);
    }, 1000);
  };

  const onError = (errors) => {
    console.log("Form errors:", errors);
  };

  const handlePreviewSave = (data) => {
    onSave(data);
    setIsPreviewOpen(false);
    handleClose();
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
        onPrimaryButtonClick={handleSubmit(onSubmit, onError)}
        onSecondaryButtonClick={handleClose}
        primaryButtonLoading={isLoading}
        size="medium"
      >
        <div className="flex gap-4">
          <div className="flex-1">
            <Controller
              name="from"
              control={control}
              render={({ field }) => (
                <TextInput
                  label="From *"
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
                  label="To *"
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
      </ReusableModal>
      <PreviewPayrollModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        payrollData={payrollData}
        onSave={handlePreviewSave}
      />
    </>
  );
};

export default NewPayrollModal;