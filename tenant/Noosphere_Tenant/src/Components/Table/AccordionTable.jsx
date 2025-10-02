import React, { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { SelectInput, TextInput } from "../Input/Inputs";
import Pagination from "./Pagination";
import "./AccordionTable.css";
import Button from "../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";

const AccordionTable = ({
  data,
  columns,
  itemsPerPage = 10,
  tableName = "Table",
  loading = false,
  onServiceDataChange,
  initialServiceData = {},
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [serviceRows, setServiceRows] = useState({});

  const { control, watch, setValue, getValues, handleSubmit } = useForm({
    defaultValues: {
      services: initialServiceData || {},
    },
  });

  const serviceCodeOptions = [
    { value: "H2002", label: "H2002" },
    { value: "H2003", label: "H2003" },
    { value: "H2004", label: "H2004" },
  ];

  const modifierOptions = [
    { value: "BT", label: "BT" },
    { value: "GT", label: "GT" },
    { value: "HT", label: "HT" },
  ];

  const toggleRow = (rowIndex) => {
    setExpandedRow(expandedRow === rowIndex ? null : rowIndex);
  };

  const onSubmit = (globalRowIndex) => (data) => {
    const rowServices = data.services[globalRowIndex];
    console.log(`Submitting data for row ${globalRowIndex}:`, rowServices);
    // Add your submission logic here
  };

  const addServiceRow = (globalRowIndex, e) => {
    e?.stopPropagation();
    const currentRowCount = serviceRows[globalRowIndex] || 1;
    const newRowCount = currentRowCount + 1;

    setServiceRows((prev) => ({
      ...prev,
      [globalRowIndex]: newRowCount,
    }));

    const currentServices = getValues(`services.${globalRowIndex}`) || [];
    const newService = {
      serviceCode: "",
      modifiers: "",
      units: "",
      unitRate: "",
    };

    const updatedServices = [...currentServices, newService];
    setValue(`services.${globalRowIndex}`, updatedServices);
  };

  const removeServiceRow = (globalRowIndex, serviceIndex, e) => {
    e?.stopPropagation();
    const currentServices = getValues(`services.${globalRowIndex}`) || [];
    if (currentServices.length <= 1) return;

    const updatedServices = currentServices.filter((_, index) => index !== serviceIndex);
    setServiceRows((prev) => ({
      ...prev,
      [globalRowIndex]: Math.max(updatedServices.length, 1),
    }));

    setValue(`services.${globalRowIndex}`, updatedServices);
  };

  const getServiceDataForRow = (globalRowIndex) => {
    const rowCount = serviceRows[globalRowIndex] || 1;
    const existingData = getValues(`services.${globalRowIndex}`) || [];

    if (existingData.length < rowCount) {
      const emptyRows = Array(rowCount - existingData.length)
        .fill()
        .map(() => ({
          serviceCode: "",
          modifiers: "",
          units: "",
          unitRate: "",
        }));
      return [...existingData, ...emptyRows];
    }

    return existingData.slice(0, rowCount);
  };

  React.useEffect(() => {
    const initialServiceRows = {};
    Object.keys(initialServiceData).forEach((key) => {
      initialServiceRows[key] = Math.max(
        initialServiceData[key]?.length || 1,
        1
      );
    });
    setServiceRows(initialServiceRows);
  }, [initialServiceData]);

  const pagination = useMemo(() => {
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = data.slice(startIndex, endIndex);

    return { totalItems, totalPages, startIndex, endIndex, currentData };
  }, [data, currentPage, itemsPerPage]);

  const { totalPages, currentData } = pagination;

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRow(null);
  };

  const coloredColumns = ["Diagnosis Code", "Description", "Authorization"];

  const renderCellContent = (col, row) => {
    const shouldColor = coloredColumns.includes(col.header);
    const textColor = shouldColor ? "#004ABA" : "inherit";
    const fontWeight = shouldColor ? "bold" : "normal";

    if (typeof col.render === "function") {
      return <span style={{ color: textColor, fontWeight: fontWeight }}>{col.render(row)}</span>;
    }

    if (col.type === "stage_completion" || col.key === "utilization") {
      const percentage = parseInt(row[col.key]) || 0;
      return (
        <div className="progress-container" style={{ color: textColor, fontWeight: fontWeight }}>
          <div className="progress-bars">
            <div
              className={`progress-fills ${percentage >= 80 ? "high" : ""}`}
              style={{
                width: `${percentage}%`,
                backgroundColor: percentage >= 80 ? "#D92D20" : "#004ABA",
              }}
            />
            <div
              className="progress-remaining"
              style={{
                width: `${100 - percentage}%`,
                backgroundColor: "#f7f7f7",
              }}
            />
          </div>
          <span className="progress-texts">{`${percentage}%`}</span>
        </div>
      );
    }

    const value = row[col.key];
    if (value === null || value === undefined) return <span style={{ color: textColor, fontWeight: fontWeight }}>N/A</span>;
    if (typeof value === "object") return <span style={{ color: textColor, fontWeight: fontWeight }}>{JSON.stringify(value)}</span>;

    return <span style={{ color: textColor, fontWeight: fontWeight }}>{value}</span>;
  };

  const formServices = watch("services");

  React.useEffect(() => {
    if (onServiceDataChange) {
      onServiceDataChange(formServices);
    }
  }, [formServices, onServiceDataChange]);

  return (
    <div className="accordion-table-container">
      <div className="accordion-table-wrapper">
        {loading.LOADING ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="accordion-table">
            <thead>
              <tr>
                <th className="expand-column"></th>
                {columns.map((col, index) => (
                  <th key={index}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="empty-state">
                    <div className="empty-content">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                      <p>No {tableName} data available</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((row, rowIndex) => {
                  const isExpanded = expandedRow === rowIndex;
                  const globalRowIndex =
                    (currentPage - 1) * itemsPerPage + rowIndex;
                  const rowServices = getServiceDataForRow(globalRowIndex);

                  return (
                    <React.Fragment key={globalRowIndex}>
                      <tr
                        className={`accordion-main-row ${
                          isExpanded ? "expanded" : ""
                        }`}
                        onClick={() => toggleRow(rowIndex)}
                      >
                        <td className="expand-cell">
                          <button
                            className={`expand-button ${
                              isExpanded ? "expanded" : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(rowIndex);
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </td>
                        {columns.map((col, colIndex) => (
                          <td key={colIndex} className="accordion-cell">
                            {renderCellContent(col, row)}
                          </td>
                        ))}
                      </tr>

                      {isExpanded && (
                        <tr className="accordion-content-row">
                          <td colSpan={columns.length + 1}>
                            <div className="accordion-content">
                              <div className="service-section">
                                <div className="service-header">
                                  <h4>Service Codes</h4>
                                </div>

                                <form
                                  onSubmit={handleSubmit(onSubmit(globalRowIndex))}
                                  className="service-codes-table"
                                >
                                  <table className="inner-service-table">
                                    <tbody>
                                      {rowServices.map((service, serviceIndex) => (
                                        <tr
                                          key={serviceIndex}
                                          className="service-row"
                                        >
                                          <td>
                                            <Controller
                                              name={`services.${globalRowIndex}.${serviceIndex}.serviceCode`}
                                              control={control}
                                              render={({ field }) => (
                                                <SelectInput
                                                  label="Service Code"
                                                  options={serviceCodeOptions}
                                                  value={serviceCodeOptions.find(
                                                    (opt) => opt.value === field.value
                                                  )}
                                                  onChange={(selectedOption) => {
                                                    field.onChange(
                                                      selectedOption?.value || ""
                                                    );
                                                  }}
                                                  placeholder="Select Service Code"
                                                  isSearchable={true}
                                                />
                                              )}
                                            />
                                          </td>
                                          <td>
                                            <Controller
                                              name={`services.${globalRowIndex}.${serviceIndex}.modifiers`}
                                              control={control}
                                              render={({ field }) => (
                                                <SelectInput
                                                  label="Modifiers"
                                                  options={modifierOptions}
                                                  value={modifierOptions.find(
                                                    (opt) => opt.value === field.value
                                                  )}
                                                  onChange={(selectedOption) => {
                                                    field.onChange(
                                                      selectedOption?.value || ""
                                                    );
                                                  }}
                                                  placeholder="Select Modifier"
                                                />
                                              )}
                                            />
                                          </td>
                                          <td>
                                            <Controller
                                              name={`services.${globalRowIndex}.${serviceIndex}.units`}
                                              control={control}
                                              render={({ field }) => (
                                                <TextInput
                                                  label="Units"
                                                  {...field}
                                                  type="number"
                                                  placeholder="Units"
                                                />
                                              )}
                                            />
                                          </td>
                                          <td>
                                            <Controller
                                              name={`services.${globalRowIndex}.${serviceIndex}.unitRate`}
                                              control={control}
                                              render={({ field }) => (
                                                <TextInput
                                                  label="Unit Rate"
                                                  {...field}
                                                  type="number"
                                                  placeholder="Unit Rate"
                                                />
                                              )}
                                            />
                                          </td>
                                          <td className="action-cell">
                                            {rowServices.length > 1 && (
                                              <button
                                                type="button"
                                                className="delete-btn"
                                                onClick={(e) =>
                                                  removeServiceRow(
                                                    globalRowIndex,
                                                    serviceIndex,
                                                    e
                                                  )
                                                }
                                                title="Remove service code"
                                              >
                                                <FaTrash />
                                              </button>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  <div className="mt-6 flex gap-4">
                                    <Button
                                      label="Add Service Code"
                                      icon={<FaPlus />}
                                      variant="secondary"
                                      onClick={(e) => addServiceRow(globalRowIndex, e)}
                                    />
                                    <Button
                                      type="submit"
                                      label="Submit Services"
                                      variant="primary"
                                    />
                                  </div>
                                </form>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {currentData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default AccordionTable;