import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../LoadingSpinner";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { addStaffSchema } from "../../../Data/schemas";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import payrollApi from "../../../api/payrollApi";

const AddStaffModal = ({
  isOpen,
  onClose,
  onSave,
  isMultiple = true,
  compensationType,
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(addStaffSchema),
    defaultValues: {
      selectedStaff: [],
    },
  });

  useEffect(() => {
    if (isOpen && compensationType && tenantId) {
      const fetchStaff = async () => {
        setLoadingStaff(true);
        try {
          const response = await payrollApi.GetStaffByPaymentSchedule({
            tenantId,
            paymentSchedule: compensationType,
            accessToken,
            refreshToken,
          });
          const data = response?.data || response || [];
          const options = Array.isArray(data)
            ? data
                .filter((staff) => staff.active !== false)
                .map((staff) => ({
                  value: staff.id,
                  label: staff.fullName || `${staff.firstName || ""} ${staff.lastName || ""}`.trim() || "Unknown",
                }))
            : [];
          setStaffOptions(options);
        } catch (error) {
          showApiError(error, "LOAD_PAYROLL_STAFF");
          setStaffOptions([]);
        } finally {
          setLoadingStaff(false);
        }
      };
      fetchStaff();
    }
  }, [isOpen, compensationType, tenantId, accessToken, refreshToken]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await onSave(data.selectedStaff);
      reset();
    } catch {
      showToast("Failed to add staff", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
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
      onPrimaryButtonClick={handleSubmit(onSubmit, onValidationError)}
      onSecondaryButtonClick={handleClose}
      size="medium"
      primaryButtonLoading={isLoading}
    >
      <div className="flex flex-col gap-4">
        {loadingStaff ? (
          <LoadingSpinner />
        ) : (
          <Controller
            name="selectedStaff"
            control={control}
            render={({ field }) => (
              <SelectInput
                required
                label="Select Employees"
                options={staffOptions}
                emptyHint="No staff found. Create one in Organisation → Staff & Teams."
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="Select employees"
                className="w-full"
                error={errors.selectedStaff?.message}
                isMulti={isMultiple}
              />
            )}
          />
        )}
      </div>
    </ReusableModal>
  );
};

export default AddStaffModal;
