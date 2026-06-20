import React, { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
import { addIncomeSchema } from "../../../Data/schemas";
import payrollApi from "../../../api/payrollApi";
import { showToast, showApiError } from "../../../Helper/ShowToast";

const AddIncomeItemModal = ({ isOpen, onClose, onSave, tenantId, accessToken, refreshToken, prefetchedItems, loading = false }) => {
  const [fetchedItems, setFetchedItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(addIncomeSchema),
    defaultValues: {
      incomeItem: "",
    },
  });

  // Only fetch if no prefetchedItems provided
  useEffect(() => {
    if (isOpen && tenantId && (!prefetchedItems || prefetchedItems.length === 0)) {
      const fetchIncomeItems = async () => {
        setLoadingItems(true);
        try {
          const response = await payrollApi.GetIncomeItemsByTenantId({
            tenantId,
            accessToken,
            refreshToken,
          });
          const data = response?.data || response || [];
          setFetchedItems(Array.isArray(data) ? data : []);
        } catch (error) {
          showApiError(error, "LOAD_INCOME_ITEMS");
          setFetchedItems([]);
        } finally {
          setLoadingItems(false);
        }
      };
      fetchIncomeItems();
    }
  }, [isOpen, tenantId, accessToken, refreshToken, prefetchedItems]);

  const items = prefetchedItems && prefetchedItems.length > 0 ? prefetchedItems : fetchedItems;

  const { incomeOptions, incomeItemsMap } = useMemo(() => {
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
    return { incomeOptions: options, incomeItemsMap: map };
  }, [items]);

  const onSubmit = (data) => {
    const selectedItem = incomeItemsMap[data.incomeItem];
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
      title="Add Income Item"
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={handleClose}
      primaryButtonLoading={loading}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        {loadingItems ? (
          <p className="text-gray-500 text-center py-4">Loading income items...</p>
        ) : (
          <Controller
            name="incomeItem"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Select Income Item"
                options={incomeOptions}
                emptyHint="No income items found. Create one in Payroll → Payroll Settings."
                value={field.value}
                onChange={(value) => field.onChange(value)}
                placeholder="Select income item"
                className="w-full"
                error={errors.incomeItem?.message}
              />
            )}
          />
        )}
      </div>
    </ReusableModal>
  );
};

export default AddIncomeItemModal;
