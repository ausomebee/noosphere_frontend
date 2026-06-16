import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddRoundingRule from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddRoundingRule";
import api from "../../../../api/billingAndPaymentsApi";
import useAuth from "../../../../hooks/useAuth";
import usePermissions from "../../../../hooks/usePermissions";
import { showToast } from "../../../../Helper/ShowToast";

// Standard rule descriptions
const standardRuleDescriptions = {
  "8 Minute Rule": "Round up when time is more than 8 min into the next 15 min block",
  "Midpoint Rule": "Round up when at least half of unit is completed",
  "Exact Time Reporting": "Bill only what was delivered",
};

const RoundingRules = () => {
  const navigate = useNavigate();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [tableData, setTableData] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [mode, setMode] = useState("add");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch rounding rules
  useEffect(() => {
    fetchRoundingRules();
  }, [tenantId, accessToken, refreshToken]);

  const fetchRoundingRules = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await api.GetRoundingRuleByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const data = response.data || [];
      const transformedData = data
        .map((item) => ({
          id: item.id,
          roundingRule: item.ruleName,
          description: item.description,
          isActive: item.isActive,
          hasActions: true,
          fullData: item,
        }));

      setTableData(transformedData);
    } catch (error) {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { header: "Rounding Rule", key: "roundingRule", type: "text" },
    { header: "Description", key: "description", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const getActionsForRow = (row) => [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View",
          onClick: () => {
            setSelectedRow(row);
            setMode("view");
            setIsModalOpen(true);
          },
        },
        hasPermission("edit_rounding_rule") && {
          label: "Edit",
          onClick: () => {
            setSelectedRow(row);
            setMode("edit");
            setIsModalOpen(true);
          },
        },
        hasPermission("deactivate_rounding_rule") && {
          label: row.isActive ? "Deactivate" : "Activate",
          onClick: async () => {
            try {
              await api.UpdateRoundingRuleActiveness({
                id: row.id,
                isActive: !row.isActive,
                accessToken,
                refreshToken,
              });
              await fetchRoundingRules();
              showToast(
                `Rounding rule ${row.isActive ? "deactivated" : "activated"} successfully`,
                "success"
              );
            } catch (error) {
              showToast("Failed to update rounding rule status", "error");
            }
          },
          className: "remove",
        },
      ].filter(Boolean),
      className: "more-dropdown",
    },
  ];

  const handleSave = async (formData) => {
    if (mode === "view") {
      setIsModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      return;
    }

    setSaving(true);
    try {
      let apiPayload;

      if (formData.ruleType === "standard") {
        const description = standardRuleDescriptions[formData.parentRole];
        if (!description) throw new Error("Invalid standard rule selected");

        apiPayload = {
          tenantId,
          ruleType: "standard",
          parentRole: formData.parentRole,
          ruleName: formData.parentRole,
          description,
          isActive: formData.active,
        };
      } else {
        // Custom rule with unit + unitMinute inside roundingRule
        apiPayload = {
          tenantId,
          ruleType: "custom",
          parentRole: null,
          ruleName: formData.ruleName,
          description: formData.description,
          standardUnit: formData.minutes,
          roundingRule: {
            unit: formData.unit,
            unitMinute: formData.unitMinutes, // ✅ fixed mapping
          },
          isActive: formData.active,
        };
      }

      let response;
      if (mode === "edit" && selectedRow) {
        apiPayload.id = selectedRow.id;
        response = await api.UpdateTenantRoundingRule({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      } else {
        response = await api.CreateTenantRoundingRule({
          ...apiPayload,
          accessToken,
          refreshToken,
        });
      }

      await fetchRoundingRules();
      setIsModalOpen(false);
      setSelectedRow(null);
      setMode("add");
      showToast("Rounding rule saved successfully", "success");
      return response;
    } catch (error) {
      showToast("Failed to save rounding rule", "error");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="text-20px mt-6 text-gray-400">
        Setup and manage how time is rounded for your sessions
      </h2>

      {hasPermission("add_rounding_rule") && (
        <div className="justify-end flex mt-6">
          <Button
            label="Add a New Rounding Rule"
            variant="secondary"
            icon={<FaPlus />}
            onClick={() => {
              setSelectedRow(null);
              setMode("add");
              setIsModalOpen(true);
            }}
            disabled={saving}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={getActionsForRow}
          tableName="Rounding Rules"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          loading={loading}
        />
      </div>

      <AddRoundingRule
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRow(null);
          setMode("add");
        }}
        onSave={handleSave}
        mode={mode}
        initialData={selectedRow?.fullData || {}}
        onDelete={[]}
        loading={saving}
      />
    </div>
  );
};

export default RoundingRules;
