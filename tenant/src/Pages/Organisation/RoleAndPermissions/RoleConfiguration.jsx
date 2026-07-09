import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { FaArrowLeft, FaChevronDown, FaChevronUp } from "react-icons/fa";
import Button from "../../../Components/Button/Button";
import { SelectInput, TextInput } from "../../../Components/Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import usePersistedTab from "../../../hooks/usePersistedTab";
import {
  MODULE_OPTIONS,
  DATA_ACCESS_LEVELS,
  PERMISSIONS_CONFIG,
} from "../../../Data/permissionsConfig";
import {
  setBasicSettings,
  togglePermission,
  setGrantAll,
} from "../../../ReduxStore/features/roleDraftSlice";
import "../../Organisation/Organisation.css";

const RoleConfiguration = ({ onCancel, onSubmit, submitting }) => {
  const dispatch = useDispatch();
  const draft = useSelector((state) => state.roleDraft);

  const [activeTab, setActiveTab] = usePersistedTab("tenant:roleConfig", "basic");

  // Local state for Basic Settings (synced to Redux on Next)
  const [roleName, setRoleName] = useState(draft.roleName || "");
  const [selectedModules, setSelectedModules] = useState(
    draft.selectedModules || []
  );
  const [dataAccessLevel, setDataAccessLevel] = useState(
    draft.dataAccessLevel || ""
  );

  // Accordion expanded state for Permissions tab
  const [expandedModules, setExpandedModules] = useState({});

  /* ─── Module checkbox toggle ─── */
  const handleModuleToggle = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey)
        ? prev.filter((k) => k !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  /* ─── Basic Settings → Next ─── */
  const handleNext = () => {
    if (!roleName.trim()) {
      showToast("Role name is required", "error");
      return;
    }
    if (selectedModules.length === 0) {
      showToast("Please select at least one module", "error");
      return;
    }
    if (!dataAccessLevel) {
      showToast("Please select a data access level", "error");
      return;
    }
    dispatch(
      setBasicSettings({
        roleName: roleName.trim(),
        selectedModules,
        dataAccessLevel,
      })
    );
    setActiveTab("permissions");
  };

  /* ─── Permissions → Previous ─── */
  const handlePrevious = () => {
    setActiveTab("basic");
  };

  /* ─── Permissions → Submit ─── */
  const handleSubmit = () => {
    onSubmit(draft);
  };

  /* ─── Accordion toggle ─── */
  const toggleAccordion = (moduleKey) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  /* ─── Permission helpers ─── */
  const isPermChecked = (moduleKey, subcatKey, permKey) => {
    return !!draft.permissions?.[moduleKey]?.[subcatKey]?.[permKey];
  };

  const isAllGranted = (moduleKey, subcatKey, permissions) => {
    return permissions.every((p) => isPermChecked(moduleKey, subcatKey, p.key));
  };

  const handleTogglePerm = (moduleKey, subcatKey, permKey) => {
    dispatch(togglePermission({ moduleKey, subcatKey, permKey }));
  };

  const handleGrantAll = (moduleKey, subcatKey, permissions) => {
    const allChecked = isAllGranted(moduleKey, subcatKey, permissions);
    dispatch(
      setGrantAll({
        moduleKey,
        subcatKey,
        permKeys: permissions.map((p) => p.key),
        value: !allChecked,
      })
    );
  };

  /* ─── Only show modules selected in Basic Settings ─── */
  const activeModules = draft.selectedModules || [];

  return (
    <div className="role-config-container">
      {/* Back button */}
      <div className="program-column-header flex gap-4 items-center mb-4">
        <button className="back-button" onClick={onCancel}>
          <FaArrowLeft />
          <span className="primary-text">Back</span>
        </button>
      </div>

      {/* Tab switcher */}
      <div className="role-config-tabs">
        <button
          className={`role-config-tab ${activeTab === "basic" ? "role-config-tab-active" : ""}`}
          onClick={() => setActiveTab("basic")}
        >
          Basic Settings
        </button>
        <button
          className={`role-config-tab ${activeTab === "permissions" ? "role-config-tab-active" : ""}`}
          onClick={() => setActiveTab("permissions")}
        >
          Permissions
        </button>
      </div>

      {/* ─── BASIC SETTINGS TAB ─── */}
      {activeTab === "basic" && (
        <div className="role-config-content">
          <div className="role-field-group">
            <TextInput
              label="Role Name"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Type something"
            />
          </div>

          <div className="role-field-group">
            <label className="role-field-label">Select Module Access</label>
            <div className="role-module-list">
              {MODULE_OPTIONS.map((mod) => (
                <label key={mod.key} className="role-module-item">
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(mod.key)}
                    onChange={() => handleModuleToggle(mod.key)}
                  />
                  <span>{mod.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="role-field-group">
            <SelectInput
              label="Select Data Access Level"
              options={DATA_ACCESS_LEVELS}
              value={dataAccessLevel}
              onChange={(e) => setDataAccessLevel(e.target.value)}
              placeholder="Select"
            />
          </div>

          <div className="role-config-actions">
            <Button
              label="Cancel"
              variant="secondary"
              onClick={onCancel}
            />
            <Button
              label="Next"
              variant="primary"
              onClick={handleNext}
            />
          </div>
        </div>
      )}

      {/* ─── PERMISSIONS TAB ─── */}
      {activeTab === "permissions" && (
        <div className="role-config-content">
          <p className="role-permissions-subtitle">
            Set permissions for this role
          </p>

          <div className="role-permissions-list">
            {activeModules.map((moduleKey) => {
              const moduleConfig = PERMISSIONS_CONFIG[moduleKey];
              if (!moduleConfig) return null;
              const isExpanded = !!expandedModules[moduleKey];

              return (
                <div key={moduleKey} className="role-accordion">
                  {/* Accordion Header */}
                  <div
                    className="role-accordion-header"
                    onClick={() => toggleAccordion(moduleKey)}
                  >
                    <span className="role-accordion-title">
                      {moduleConfig.label}
                    </span>
                    {isExpanded ? (
                      <FaChevronUp className="role-accordion-icon" />
                    ) : (
                      <FaChevronDown className="role-accordion-icon" />
                    )}
                  </div>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="role-accordion-body">
                      {moduleConfig.subcategories.map((subcat) => (
                        <div key={subcat.key} className="role-subcategory">
                          {/* Subcategory badge + Grant all */}
                          <div className="role-subcat-header">
                            <span className="role-subcat-badge">
                              {subcat.label}
                            </span>
                            <label className="role-grant-all">
                              <input
                                type="checkbox"
                                checked={isAllGranted(
                                  moduleKey,
                                  subcat.key,
                                  subcat.permissions
                                )}
                                onChange={() =>
                                  handleGrantAll(
                                    moduleKey,
                                    subcat.key,
                                    subcat.permissions
                                  )
                                }
                              />
                              <span>Grant all permissions</span>
                            </label>
                          </div>

                          {/* 2-column permission grid */}
                          <div className="role-perm-grid">
                            {subcat.permissions.map((perm) => (
                              <label
                                key={perm.key}
                                className="role-perm-item"
                              >
                                <input
                                  type="checkbox"
                                  checked={isPermChecked(
                                    moduleKey,
                                    subcat.key,
                                    perm.key
                                  )}
                                  onChange={() =>
                                    handleTogglePerm(
                                      moduleKey,
                                      subcat.key,
                                      perm.key
                                    )
                                  }
                                />
                                <span>{perm.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="role-config-actions">
            <Button
              label="Previous"
              variant="secondary"
              onClick={handlePrevious}
            />
            <Button
              label="Submit"
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleConfiguration;
