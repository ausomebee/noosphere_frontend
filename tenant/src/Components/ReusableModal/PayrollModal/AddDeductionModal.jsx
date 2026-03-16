import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { addDeductionSchema } from "../../../Data/schemas";
import payrollApi from "../../../api/payrollApi";
import { showToast } from "../../../Helper/ShowToast";

const AddDeductionModal = ({ isOpen, onClose, onSave, tenantId, accessToken, refreshToken, prefetchedItems, loading = false }) => {
  const [fetchedItems, setFetchedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addDeductionSchema),
    defaultValues: {
      deductionItem: "",
    },
  });

  // Only fetch if no prefetchedItems provided
  useEffect(() => {
    if (isOpen && tenantId && (!prefetchedItems || prefetchedItems.length === 0)) {
      const fetchDeductions = async () => {
        setLoadingItems(true);
        try {
          const response = await payrollApi.GetDeductionsByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          });
          const data = response?.data || response || [];
          setFetchedItems(Array.isArray(data) ? data : []);
        } catch (error) {
          showToast(error.message || "Failed to fetch deductions", "error");
          setFetchedItems([]);
        } finally {
          setLoadingItems(false);
        }
      };
      fetchDeductions();
    }
  }, [isOpen, tenantId, accessToken, refreshToken, prefetchedItems]);

  const items = prefetchedItems && prefetchedItems.length > 0 ? prefetchedItems : fetchedItems;

  const { deductionOptions, deductionItemsMap } = useMemo(() => {
    const map = {};
    const options = items
      .filter((item) => item.isActive !== false)
      .map((item) => {
        map[item.id] = item;
        const rateLabel = item.type === "Flat Rate"
          ? `$${item.rate?.rate || 0}`
          : item.type === "Percentage based"
          ? `${item.rate?.unit || 0}%`
          : item.type === "Time based"
          ? `$${item.rate?.unit || 0} per ${item.rate?.duration || "hour"}`
          : "";
        return {
          value: item.id,
          label: `${item.name} (${rateLabel})`,
        };
      });
    return { deductionOptions: options, deductionItemsMap: map };
  }, [items]);

  const onSubmit = (data) => {
    const selectedItem = deductionItemsMap[data.deductionItem];
    if (selectedItem) {
      onSave(selectedItem);
    }
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
      primaryButtonLoading={loading}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        {loadingItems ? (
          <p className="text-gray-500 text-center py-4">Loading deductions...</p>
        ) : (
          <Controller
            name="deductionItem"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Select Deduction"
                options={deductionOptions}
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="Select deduction"
                className="w-full"
                error={errors.deductionItem?.message}
              />
            )}
          />
        )}
      </div>
    </ReusableModal>
  );
};

export default AddDeductionModal;
