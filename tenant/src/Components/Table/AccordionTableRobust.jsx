// src/components/Table/AccordionTableRobust.jsx

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { SelectInput, TextInput } from "../Input/Inputs";
import Pagination from "./Pagination";
import Button from "../Button/Button";
import { FaPlus, FaTrash, FaEllipsisV, FaSave } from "react-icons/fa";
import { showToast } from "../../Helper/ShowToast";
import "./AccordionTableRobust.css";

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
  onSave, // New prop for saving changes
  serviceCodes = [],
  loadingServiceCodes = false,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const initialDataRef = useRef(initialServiceData);

  const {
    control,
    watch,
    setValue,
    getValues,
    reset,
    formState: { isDirty },
  } = useForm({
    defaultValues: { services: initialServiceData },
  });

  const modifierOptions = [
    { value: "", label: "None" },
    { value: "HM", label: "HM - Less than Bachelor's" },
    { value: "HN", label: "HN - Bachelor's Degree" },
    { value: "HO", label: "HO - Master's Degree" },
    { value: "HP", label: "HP - Doctoral Level" },
  ];

  const perOptions = [
    { value: "day", label: "Per Day" },
    { value: "week", label: "Per Week" },
    { value: "month", label: "Per Month" },
    { value: "year", label: "Per Year" },
  ];

  const formServices = watch("services");

  // Only call onServiceDataChange when formServices actually changes
  useEffect(() => {
    if (formServices && Object.keys(formServices).length > 0) {
      onServiceDataChange?.(formServices);
    }
  }, [formServices]);

  // Reset form when initialServiceData changes
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

  // Check for changes
  useEffect(() => {
    const subscription = watch((value) => {
      setHasChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Close dropdown when clicking outside
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

  const toggleRow = (idx) => {
    setExpandedRow(expandedRow === idx ? null : idx);
  };

  const toggleDropdown = (idx, e) => {
    e.stopPropagation();
    setDropdownOpen(dropdownOpen === idx ? null : idx);
  };

  const addServiceRow = (authId, e) => {
    e?.stopPropagation();
    const current = getValues(`services.${authId}`) || [];
    setValue(
      `services.${authId}`,
      [
        ...current,
        { serviceCode: "", modifier: "", units: "", per: "", utilization: 0 },
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
    setSaving(true);
    try {
      const currentData = getValues("services");
      console.log("Saving changes:", currentData);

      // Call the onSave prop with the updated service data
      if (onSave) {
        await onSave(currentData);
        showToast("Changes saved successfully", "success");
        setHasChanges(false);
      } else {
        showToast("Save functionality not implemented", "warning");
      }
    } catch (error) {
      console.error("Failed to save changes:", error);
      showToast("Failed to save changes", "error");
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
    return {
      totalPages,
      currentData: data.slice(start, start + itemsPerPage),
    };
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
                      <button
                        className="robust-action-dots"
                        onClick={(e) => toggleDropdown(idx, e)}
                      >
                        <FaEllipsisV />
                      </button>

                      {isDropdownOpen && (
                        <div className="robust-dropdown">
                          <button
                            onClick={() => {
                              onEdit?.(row);
                              setDropdownOpen(null);
                            }}
                            disabled={used}
                          >
                            Edit Authorization
                          </button>
                          <button
                            onClick={() => {
                              onDeactivate?.(row);
                              setDropdownOpen(null);
                            }}
                            disabled={used}
                          >
                            Deactivate Authorization
                          </button>
                          <button
                            onClick={() => {
                              onDelete?.(row);
                              setDropdownOpen(null);
                            }}
                            disabled={used}
                            className="robust-danger"
                          >
                            Delete Authorization
                          </button>
                          {used && (
                            <div className="robust-note">
                              Cannot modify — services already utilized
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
                                          placeholder="Select service code"
                                          isDisabled={!isEditMode || used}
                                          isLoading={loadingServiceCodes}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            setHasChanges(true);
                                          }}
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
                                          onChange={(e) => {
                                            field.onChange(e);
                                            setHasChanges(true);
                                          }}
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
                                          onChange={(e) => {
                                            field.onChange(e);
                                            setHasChanges(true);
                                          }}
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
                                          onChange={(e) => {
                                            field.onChange(e);
                                            setHasChanges(true);
                                          }}
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
                                          title="Remove service code"
                                        >
                                          <FaTrash />
                                        </button>
                                      )}
                                  </div>
                                ))
                              ) : (
                                <div className="robust-no-services">
                                  No service codes found for this authorization
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
                              {hasChanges && isEditMode && (
                                <div className="flex justify-end mb-4">
                                  <Button
                                    label={
                                      saving ? "Saving..." : "Save Changes"
                                    }
                                    icon={<FaSave className="w-4 h-4" />}
                                    variant="primary"
                                    onClick={handleSaveChanges}
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
