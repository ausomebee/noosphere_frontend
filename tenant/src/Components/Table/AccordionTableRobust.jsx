// src/components/Table/AccordionTableRobust.jsx

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { SelectInput, TextInput } from "../Input/Inputs";
import Pagination from "./Pagination";
import Button from "../Button/Button";
import { FaPlus, FaTrash, FaEllipsisV, FaSave } from "react-icons/fa";
import { showToast } from "../../Helper/ShowToast";
import "./AccordionTableRobust.css";
import { modifierOptions, perOptions } from "../../Data/selectOptions";

const AccordionTableRobust = ({
  data = [],
  columns = [],
  itemsPerPage = 10,
  initialServiceData = {},
  onServiceDataChange,
  isEditMode = false,
  onEdit,
  onDeactivate,
  onDelete,
  onSave,
  serviceCodes = [],
  loadingServiceCodes = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);

  // Reset pagination when data changes (e.g. tab switch)
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef(initialServiceData);
  const actionButtonRefs = useRef({});

  const { control, watch, setValue, getValues, reset } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    defaultValues: { services: initialServiceData },
  });

  const formServices = watch("services");

  useEffect(() => {
    if (formServices) onServiceDataChange?.(formServices);
  }, [formServices, onServiceDataChange]);

  useEffect(() => {
    if (
      JSON.stringify(initialDataRef.current) !==
      JSON.stringify(initialServiceData)
    ) {
      reset({ services: initialServiceData });
      initialDataRef.current = initialServiceData;
      setHasChanges(false);
    }
  }, [initialServiceData, reset]);

  useEffect(() => {
    const subscription = watch(() => setHasChanges(true));
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownOpen !== null &&
        !event.target.closest(".robust-action-cell")
      ) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const toggleRow = (idx) => setExpandedRow(expandedRow === idx ? null : idx);
  const toggleDropdown = (idx, e) => {
    e.stopPropagation();
    if (dropdownOpen === idx) {
      setDropdownOpen(null);
      return;
    }
    const button = actionButtonRefs.current[idx];
    if (button) {
      const rect = button.getBoundingClientRect();
      const dropdownWidth = 220;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const dropdownHeight = 130;
      let top = spaceBelow >= dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4;
      let left = rect.right - dropdownWidth;
      if (left < 4) left = 4;
      setDropdownPosition({ top, left });
    }
    setDropdownOpen(idx);
  };

  const addServiceRow = (authId, e) => {
    e?.stopPropagation();
    const current = getValues(`services.${authId}`) || [];
    setValue(
      `services.${authId}`,
      [
        ...current,
        {
          serviceCode: "",
          modifier: "",
          units: "",
          per: "SESSION",
          utilization: 0,
        },
      ],
      { shouldDirty: true }
    );
  };

  const removeServiceRow = (authId, sIdx, e) => {
    e?.stopPropagation();
    const current = getValues(`services.${authId}`) || [];
    if (current.length <= 1) {
      showToast("At least one service code is required", "warning");
      return;
    }
    setValue(
      `services.${authId}`,
      current.filter((_, i) => i !== sIdx),
      { shouldDirty: true }
    );
  };

  const handleSaveChanges = async () => {
    if (expandedRow === null) {
      showToast("Please expand an authorization to save changes", "warning");
      return;
    }

    const row = pagination.currentData[expandedRow];
    const authId = row.id;
    const currentServices = getValues(`services.${authId}`) || [];

    const invalid = currentServices.some(
      (s) => !s.serviceCode || !s.units || parseInt(s.units) <= 0
    );
    if (invalid) {
      showToast("Please fill service code and units for all rows", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = { [authId]: currentServices };
      if (onSave) await onSave(payload);
      setHasChanges(false);
    } catch {
      // Error handled in parent
    } finally {
      setSaving(false);
    }
  };

  const hasUtilization = (authId) => {
    const services = getValues(`services.${authId}`) || [];
    return services.some((s) => (s.utilization || 0) > 0);
  };

  const getUtilizationColor = (p) => {
    if (p >= 90) return "#D92D20";
    if (p >= 70) return "#F79009";
    return "#004ABA";
  };

  const getAverageUtilization = (authId) => {
    const services = getValues(`services.${authId}`) || [];
    if (services.length === 0) return 0;
    const total = services.reduce((sum, s) => sum + (s.utilization || 0), 0);
    return Math.round(total / services.length);
  };

  const pagination = useMemo(() => {
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    return { totalPages, currentData: data.slice(start, start + itemsPerPage) };
  }, [data, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRow(null);
    setDropdownOpen(null);
  };

  return (
    <div className="robust-accordion-container">
      <div className="robust-accordion-wrapper">
        <table className="robust-accordion-table">
          <thead>
            <tr>
              <th className="robust-expand-col"></th>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
              <th className="robust-action-header">Action</th>
            </tr>
          </thead>
          <tbody>
            {pagination.currentData.map((row, idx) => {
              const isExpanded = expandedRow === idx;
              const isDropdownOpen = dropdownOpen === idx;
              const authId = row.id;
              const services = getValues(`services.${authId}`) || [];
              const used = hasUtilization(authId);
              const avgUtilization = getAverageUtilization(authId);

              return (
                <React.Fragment key={authId}>
                  <tr
                    className={`robust-main-row ${
                      isExpanded ? "robust-expanded" : ""
                    }`}
                    onClick={() => toggleRow(idx)}
                  >
                    <td className="robust-expand-cell">
                      <button
                        className={`robust-expand-btn ${
                          isExpanded ? "robust-expanded" : ""
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(idx);
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </td>

                    {columns.map((col) => (
                      <td key={col.key} className="robust-cell">
                        {col.key === "utilization" ? (
                          <div className="robust-utilization-column-wrapper">
                            <div className="robust-utilization-column-bar">
                              <div
                                className="robust-utilization-column-fill"
                                style={{
                                  width: `${
                                    row.utilization || avgUtilization
                                  }%`,
                                  backgroundColor: getUtilizationColor(
                                    row.utilization || avgUtilization
                                  ),
                                }}
                              />
                            </div>
                            <span className="robust-utilization-column-text">
                              {row.utilization || avgUtilization}%
                            </span>
                          </div>
                        ) : col.render ? (
                          col.render(row)
                        ) : (
                          row[col.key]
                        )}
                      </td>
                    ))}

                    <td
                      className="robust-action-cell"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(onEdit || onDeactivate || onDelete) && (
                        <button
                          className="robust-action-dots"
                          ref={(el) => { actionButtonRefs.current[idx] = el; }}
                          onClick={(e) => toggleDropdown(idx, e)}
                        >
                          <FaEllipsisV />
                        </button>
                      )}

                      {isDropdownOpen && (
                        <div
                          className="robust-dropdown"
                          style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
                        >
                          {onEdit && (
                            <button
                              onClick={() => {
                                onEdit(row);
                                setDropdownOpen(null);
                              }}
                              disabled={used}
                            >
                              Edit Authorization
                            </button>
                          )}
                          {onDeactivate && (
                            <button
                              onClick={() => {
                                onDeactivate(row);
                                setDropdownOpen(null);
                              }}
                            >
                              {row.isActive === false ? "Activate" : "Deactivate"} Authorization
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => {
                                onDelete(row);
                                setDropdownOpen(null);
                              }}
                              className="robust-danger"
                            >
                              Delete Authorization
                            </button>
                          )}
                          {onEdit && used && (
                            <div className="robust-note">
                              Edit disabled — services already utilized
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="robust-content-row">
                      <td colSpan={columns.length + 2}>
                        <div className="robust-content">
                          <div className="robust-service-section">
                            <h4 className="robust-section-title">
                              Service Codes ({services.length})
                            </h4>

                            <div className="robust-service-table">
                              {services.length > 0 ? (
                                services.map((service, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="robust-service-row"
                                  >
                                    <Controller
                                      name={`services.${authId}.${sIdx}.serviceCode`}
                                      control={control}
                                      render={({ field }) => (
                                        <SelectInput
                                          label="Service code"
                                          {...field}
                                          options={serviceCodes}
                                          emptyHint="No service codes found. Create one in Billing & Payments → Settings → Service Codes."
                                          placeholder="Select service code"
                                          isDisabled={!isEditMode || used}
                                          isLoading={loadingServiceCodes}
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`services.${authId}.${sIdx}.modifier`}
                                      control={control}
                                      render={({ field }) => (
                                        <SelectInput
                                          label="Modifiers"
                                          {...field}
                                          options={modifierOptions}
                                          placeholder="Select modifier"
                                          isDisabled={!isEditMode || used}
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`services.${authId}.${sIdx}.units`}
                                      control={control}
                                      render={({ field }) => (
                                        <TextInput
                                          label="Units"
                                          {...field}
                                          type="number"
                                          placeholder="Enter units"
                                          disabled={!isEditMode || used}
                                        />
                                      )}
                                    />
                                    <Controller
                                      name={`services.${authId}.${sIdx}.per`}
                                      control={control}
                                      render={({ field }) => (
                                        <SelectInput
                                          label="Per"
                                          {...field}
                                          options={perOptions}
                                          placeholder="Select per"
                                          isDisabled={!isEditMode || used}
                                        />
                                      )}
                                    />
                                    <div className="robust-utilization-wrapper">
                                      <label>Utilization</label>
                                      <div className="robust-utilization">
                                        <div
                                          className="robust-utilization-fill"
                                          style={{
                                            width: `${
                                              service.utilization || 0
                                            }%`,
                                            backgroundColor:
                                              getUtilizationColor(
                                                service.utilization || 0
                                              ),
                                          }}
                                        />
                                      </div>
                                      <span className="robust-utilization-text">
                                        {service.utilization || 0}%
                                      </span>
                                    </div>

                                    {isEditMode &&
                                      services.length > 1 &&
                                      !used && (
                                        <button
                                          className="robust-remove-btn"
                                          onClick={(e) =>
                                            removeServiceRow(authId, sIdx, e)
                                          }
                                          title="Remove"
                                        >
                                          <FaTrash />
                                        </button>
                                      )}
                                  </div>
                                ))
                              ) : (
                                <div className="robust-no-services">
                                  No service codes assigned
                                </div>
                              )}

                              {isEditMode && !used && (
                                <div className="robust-add-row">
                                  <Button
                                    label="Add Service Code"
                                    icon={<FaPlus />}
                                    variant="secondary"
                                    onClick={(e) => addServiceRow(authId, e)}
                                  />
                                </div>
                              )}

                              {hasChanges && isEditMode && !used && (
                                <div className="flex justify-end mt-4">
                                  <Button
                                    label="Save Changes"
                                    icon={<FaSave className="w-4 h-4" />}
                                    variant="primary"
                                    onClick={handleSaveChanges}
                                    loading={saving}
                                    disabled={saving}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length > itemsPerPage && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default AccordionTableRobust;
