import React, { useState, useEffect, useCallback } from "react";
import useAuth from "../../../../hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaPlus } from "react-icons/fa";
import AddPayerModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddPayerModal";
import { FiEdit3 } from "react-icons/fi";
import Button from "../../../../Components/Button/Button";
import CustomTable from "../../../../Components/Table/CustomTable";
import AddSingleServiceCodeModal from "../../../../Components/ReusableModal/BillingAndPaymentModal/AddSingleServiceCode";
import { showToast } from "../../../../Helper/ShowToast";
import api from "../../../../api/billingAndPaymentsApi";
import { formatCurrency } from "../../../../Helper/Formatters";
import "../../BillingPayment.css";


const SingleViewPayer = () => {
  const { tenantId, accessToken, refreshToken } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [payerData, setPayerData] = useState(null);
  const [rawPayerServiceCodes, setRawPayerServiceCodes] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [insuranceTypeTableData, setInsuranceTypeTableData] = useState([]);
  const [roundingRuleTableData, setRoundingRuleTableData] = useState([]);
  const [serviceCodeTableData, setServiceCodeTableData] = useState([]);
  const [loadingPayer, setLoadingPayer] = useState(true);
  const [insuranceTypeLoading, setInsuranceTypeLoading] = useState(true);
  const [roundingRuleLoading, setRoundingRuleLoading] = useState(true);
  const [serviceCodeLoading, setServiceCodeLoading] = useState(true);
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [isServiceCodeModalOpen, setIsServiceCodeModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [payerSaving, setPayerSaving] = useState(false);

  const fetchInsuranceTypes = useCallback(async () => {
    setInsuranceTypeLoading(true);
    try {
      const response = await api.GetInsuranceTypeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response.data || [];
      const transformedData = data.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        isActive: item.isActive,
        fullData: item,
      }));
      setInsuranceTypeTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setInsuranceTypeLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchRoundingRules = useCallback(async () => {
    setRoundingRuleLoading(true);
    try {
      const response = await api.GetRoundingRuleByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response.data || [];
      const transformedData = data
        .filter((item) => item.isActive)
        .map((item) => ({
          id: item.id,
          ruleName: item.ruleName,
          description: item.description,
          fullData: item,
        }));
      setRoundingRuleTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setRoundingRuleLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchServiceCodes = useCallback(async () => {
    setServiceCodeLoading(true);
    try {
      const response = await api.GetTenantServiceCodeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const data = response.data || [];
      const transformedData = data
        .filter((item) => item.isActive)
        .map((item) => ({
          id: item.id,
          code: item.code,
          description: item.description,
          modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
        }));
      setServiceCodeTableData(transformedData);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setServiceCodeLoading(false);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchPayerData = useCallback(async () => {
    try {
      setLoadingPayer(true);
      const response = await api.GetSInglePayerById({ id, accessToken, refreshToken });
      const payer = response[0];

      if (!payer) {
        throw new Error("Payer not found");
      }

      const insuranceTypeMap = new Map(
        insuranceTypeTableData.map((it) => [it.id, it.name])
      );
      const insuranceTypeName = insuranceTypeMap.get(payer.insuranceTypeId) || "Unknown";

      const mappedPayerData = {
        id: payer.id,
        payerName: payer.payerName,
        email: payer.email,
        insuranceType: payer.insuranceTypeId,
        insuranceTypeName,
        phoneNumber: payer.phone,
        tplCode: payer.tplCode,
        carrierPayerId: payer.carrierPayerId,
        address: payer.address,
        city: payer.city,
        state: payer.state,
        zip: payer.zip,
        country: payer.country,
        isActive: payer.isActive,
        PayerServiceCodes: Array.isArray(payer.PayerServiceCodes) ? payer.PayerServiceCodes : [],
        serviceCodes: Array.isArray(payer.serviceCodes) ? payer.serviceCodes : [],
        fullData: payer,
      };
      setPayerData(mappedPayerData);
      setRawPayerServiceCodes(mappedPayerData.PayerServiceCodes);

      const serviceCodeMap = new Map(
        mappedPayerData.serviceCodes.map((sc) => [sc.serviceCodeId, sc]) || []
      );

      const transformedServices = mappedPayerData.PayerServiceCodes.map((psc) => {
        const serviceCode = serviceCodeMap.get(psc.serviceCodeId) || {};
        return {
          id: psc.id,
          name: serviceCode.description || "Unknown",
          code: serviceCode.code || "Unknown",
          rates: formatCurrency(psc.ratePerUnit, psc.unitCurrency),
          modifiers: Array.isArray(psc.modifiers) ? psc.modifiers.map((m) => m.modifier).join(", ") : "",
          isActive: psc.isActive,
          hasActions: true,
          description: serviceCode.description || "",
          unitCurrency: psc.unitCurrency || "USD",
          ratePerUnit: psc.ratePerUnit || 0,
          roundingRule: psc.roundingRuleId || "",
          billable: psc.billable !== undefined ? psc.billable : false,
          modifiersData: Array.isArray(psc.modifiers) ? psc.modifiers : [],
          serviceCodeId: psc.serviceCodeId || "",
          fullData: { ...psc, serviceCode },
        };
      }) || [];

      setTableData(transformedServices);
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoadingPayer(false);
    }
  }, [id, insuranceTypeTableData, accessToken, refreshToken]);

  useEffect(() => {
    if (tenantId) {
      fetchInsuranceTypes();
    }
  }, [tenantId, fetchInsuranceTypes]);

  useEffect(() => {
    if (tenantId) {
      fetchRoundingRules();
    }
  }, [tenantId, fetchRoundingRules]);

  useEffect(() => {
    if (tenantId) {
      fetchServiceCodes();
    }
  }, [tenantId, fetchServiceCodes]);

  useEffect(() => {
    if (id && tenantId && insuranceTypeTableData.length >= 0) {
      fetchPayerData();
    }
  }, [id, tenantId, insuranceTypeTableData, fetchPayerData]);

  const columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Rate", key: "rates", type: "text" },
    { header: "Code", key: "code", type: "text" },
    { header: "Modifiers", key: "modifiers", type: "text" },
    { header: "Status", key: "isActive", type: "active" },
  ];

  const getServiceCodeActionsForRow = (row) => [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "Edit",
          onClick: () => {

            setSelectedService(row);
            setIsServiceCodeModalOpen(true);
          },
        },
        {
          label: row.isActive ? "Deactivate" : "Activate",
          onClick: async () => {
            try {
              await api.UpdatePayerServiceCodeActiveness({
                id: row.id,
                isActive: !row.isActive,
                accessToken,
                refreshToken,
              });
              await fetchPayerData();
              showToast(`Service code ${row.isActive ? "deactivated" : "activated"} successfully`, "success");
            } catch {
              showToast("Failed to update service code status", "error");
              await fetchPayerData();
            }
          },
          className: "remove",
        },
      ],
      className: "more-dropdown",
    },
  ];

  const handlePayerSave = async (data) => {
    setPayerSaving(true);
    try {
      const insuranceTypeId = data.insuranceType;
      if (!insuranceTypeId) {
        throw new Error("Invalid insurance type selected");
      }

      const apiPayload = {
        tenantId,
        id: payerData.id,
        payerName: data.payerName,
        email: data.email,
        phone: data.phoneNumber,
        insuranceTypeId,
        tplCode: data.tplCode,
        carrierPayerId: data.carrierPayerId,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        PayerServiceCodes: rawPayerServiceCodes,
        isActive: payerData.isActive,
      };

      await api.UpdatePayer({
        ...apiPayload,
        accessToken,
        refreshToken,
      });

      await fetchPayerData();
      setShowPayerModal(false);
      showToast("Payer updated successfully", "success");
    } catch (error) {
      showToast("Failed to update payer", "error");

      throw error;
    } finally {
      setPayerSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowPayerModal(false);
  };

  const handleServiceCodeSave = async (data) => {
    try {
      let updatedRawPayerServiceCodes;
      if (selectedService) {
        updatedRawPayerServiceCodes = rawPayerServiceCodes.map((psc) =>
          psc.id === selectedService.id
            ? {
                ...psc,
                serviceCodeId: data.serviceCodeId || psc.serviceCodeId,
                unitCurrency: data.unitCurrency,
                ratePerUnit: data.ratePerUnit,
                roundingRuleId: data.roundingRule,
                billable: data.billable,
                modifiers: Array.isArray(data.modifiers) ? data.modifiers : [],
                isActive: selectedService.isActive,
              }
            : psc
        );

        setTableData(
          tableData.map((item) =>
            item.id === selectedService.id
              ? {
                  ...item,
                  name: data.description || item.name,
                  code: data.code || item.code,
                  rates: formatCurrency(data.ratePerUnit, data.unitCurrency),
                  modifiers: Array.isArray(data.modifiers) ? data.modifiers.map((m) => m.modifier).join(", ") : "",
                  unitCurrency: data.unitCurrency,
                  ratePerUnit: data.ratePerUnit,
                  roundingRule: data.roundingRule,
                  billable: data.billable,
                  modifiersData: Array.isArray(data.modifiers) ? data.modifiers : [],
                  serviceCodeId: data.serviceCodeId || item.serviceCodeId,
                }
              : item
          )
        );
      } else {
        const newPayerServiceCode = {
          payerId: payerData.id,
          serviceCodeId: data.serviceCodeId || "",
          unitCurrency: data.unitCurrency,
          ratePerUnit: data.ratePerUnit,
          roundingRuleId: data.roundingRule,
          billable: data.billable,
          modifiers: Array.isArray(data.modifiers) ? data.modifiers : [],
          isActive: true,
          isDeleted: false,
        };
        updatedRawPayerServiceCodes = [...rawPayerServiceCodes, newPayerServiceCode];

        const serviceCode = serviceCodeTableData.find((sc) => sc.id === data.serviceCodeId) || {};
        const newTableService = {
          id: `temp-${Date.now()}`,
          name: serviceCode.description || data.description || "Unknown",
          code: serviceCode.code || data.code || "Unknown",
          rates: formatCurrency(data.ratePerUnit, data.unitCurrency),
          modifiers: Array.isArray(data.modifiers) ? data.modifiers.map((m) => m.modifier).join(", ") : "",
          isActive: true,
          hasActions: true,
          description: serviceCode.description || data.description || "",
          unitCurrency: data.unitCurrency,
          ratePerUnit: data.ratePerUnit,
          roundingRule: data.roundingRule,
          billable: data.billable,
          modifiersData: Array.isArray(data.modifiers) ? data.modifiers : [],
          serviceCodeId: data.serviceCodeId,
          fullData: { ...newPayerServiceCode, serviceCode },
        };
        setTableData([...tableData, newTableService]);
      }
      setRawPayerServiceCodes(updatedRawPayerServiceCodes);

      const apiPayload = {
        tenantId,
        id: payerData.id,
        payerName: payerData.payerName,
        email: payerData.email,
        phone: payerData.phoneNumber,
        insuranceTypeId: payerData.insuranceType,
        tplCode: payerData.tplCode,
        carrierPayerId: payerData.carrierPayerId,
        address: payerData.address,
        city: payerData.city,
        state: payerData.state,
        zip: payerData.zip,
        country: payerData.country,
        PayerServiceCodes: updatedRawPayerServiceCodes,
        isActive: payerData.isActive,
      };

      await api.UpdatePayer({
        ...apiPayload,
        accessToken,
        refreshToken,
      });

      setIsServiceCodeModalOpen(false);
      setSelectedService(null);
      showToast("Service code updated successfully", "success");
    } catch (error) {
      showToast("Failed to update service code", "error");
      console.error("Service code update error:", error);
    }
  };

  const transformTableDataToServiceCode = (tableRow) => {
    const modifiers = Array.isArray(tableRow.modifiersData)
      ? tableRow.modifiersData.map((m) => ({
          modifier: m.modifier || "",
          ratePerUnit: m.ratePerUnit || 0,
        }))
      : [];
    return {
      code: tableRow.code || "",
      description: tableRow.description || "",
      unitCurrency: tableRow.unitCurrency || "USD",
      ratePerUnit: tableRow.ratePerUnit || 0,
      roundingRule: tableRow.roundingRule || "",
      modifiers,
      billable: tableRow.billable !== undefined ? tableRow.billable : false,
      serviceCodeId: tableRow.serviceCodeId || "",
    };
  };

  return (
    <>
      <div className="program-column-header flex gap-4 items-center">
        <div onClick={() => navigate(-1)}>
          <button className="back-button">
            <FaArrowLeft />
            <span className="primary-text">Back</span>
          </button>
        </div>
        <div className="breadcrumb-trail">
          <span className="breadcrumb-segment">Payers</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-current">
            {payerData?.payerName || "Unknown Payer"}
          </span>
        </div>
      </div>
      <h2 className="font-bold text-lg text-gray-700-em mb-4 mt-6">
        Payer Information
      </h2>
      <div className="billing-info-card flex justify-between">
        {loadingPayer ? (
          <div className="flex justify-center items-center w-full py-8">
            <div>Loading...</div>
          </div>
        ) : (
          <>
            <OrgGrid data={payerData || {}} />
            <div>
              <div
                className="bg-white-bg p-5 rounded-md self-start cursor-pointer"
                onClick={() => setShowPayerModal(true)}
              >
                <FiEdit3 size={32} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="billing-status-row">
        <h2 className="font-bold text-lg text-gray-700-em mb-4">Authorization</h2>
        <div>
          <Button
            label="Add Service Code"
            variant="secondary"
            icon={<FaPlus />}
            onClick={() => {
              setSelectedService(null);
              setIsServiceCodeModalOpen(true);
            }}
            disabled={payerSaving || roundingRuleLoading || serviceCodeLoading}
          />
        </div>
      </div>
      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={getServiceCodeActionsForRow}
          tableName="Authorizations"
          itemsPerPage={5}
          showActions={true}
          showCheckbox={false}
        />
      </div>

      <AddPayerModal
        isOpen={showPayerModal}
        onClose={handleCloseModal}
        onSave={handlePayerSave}
        mode="edit"
        initialData={payerData?.fullData || {}}
        onDelete={() => setShowPayerModal(false)}
        loading={payerSaving}
        insuranceTypes={insuranceTypeTableData}
        serviceCodes={serviceCodeTableData}
        roundingRules={roundingRuleTableData}
      />

      {isServiceCodeModalOpen && (
        <AddSingleServiceCodeModal
          isOpen={isServiceCodeModalOpen}
          onClose={() => {
            setIsServiceCodeModalOpen(false);
            setSelectedService(null);
          }}
          onSave={handleServiceCodeSave}
          mode={selectedService ? "edit" : "add"}
          initialData={selectedService ? transformTableDataToServiceCode(selectedService) : {}}
          roundingRules={roundingRuleTableData}
          serviceCodes={serviceCodeTableData}
        />
      )}
    </>
  );
};

const OrgGrid = ({ data }) => {
  const {
    payerName,
    email,
    insuranceTypeName,
    phoneNumber,
    tplCode,
    carrierPayerId,
    address,
    city,
    state,
    zip,
  } = data;

  const fullAddress = address && city && state && zip
    ? `${address}, ${city}, ${state} ${zip}`
    : address || "--";

  return (
    <div className="billing-grid-3">
      <div className="flex flex-col gap-2">
        <Field label="Payer Name" value={payerName || "--"} />
        <Field label="Payer Email" value={email || "--"} />
      </div>
      <div className="flex flex-col gap-2">
        <Field label="Insurance Type" value={insuranceTypeName || "--"} />
        <Field label="Phone" value={phoneNumber || "--"} />
      </div>
      <div className="flex flex-col gap-2">
        <Field label="TPL Code" value={tplCode || "--"} />
        <Field label="Carrier Payer ID" value={carrierPayerId || "--"} />
      </div>
      <div className="flex flex-col gap-2 billing-grid-full-span">
        <Field label="Address" value={fullAddress} />
      </div>
    </div>
  );
};

const Field = ({ label, value, isLink }) => (
  <div className="items-center gap-4">
    <p className="text-sm text-gray-400">{label}</p>
    {isLink && value !== "--" ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="font-semibold text-blue-600"
      >
        {value}
      </a>
    ) : (
      <p className="font-semibold text-gray-600">{value}</p>
    )}
  </div>
);

export default SingleViewPayer;