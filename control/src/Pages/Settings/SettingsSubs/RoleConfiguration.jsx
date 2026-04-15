import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { TextInput, SelectInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import roleApi from "../../../api/roleApis";
import {
  permissionsConfig,
  moduleAccessOptions,
  dataAccessLevelOptions,
} from "../../../Data/permissionsConfig";
import { Skeleton } from "../../../Components/LoadingSpinner";
import "./RoleConfiguration.css";

const RoleConfiguration = () => {
  const navigate = useNavigate();
  const { roleId } = useParams();
  const { accessToken, refreshToken, userId } = useAuth();
  const isEditing = Boolean(roleId);

  const [activeTab, setActiveTab] = useState("basic");
  const [saving, setSaving] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);

  const [roleName, setRoleName] = useState("");
  const [selectedModules, setSelectedModules] = useState([]);
  const [dataAccessLevel, setDataAccessLevel] = useState("");
  const [permissions, setPermissions] = useState({});
  const [existingModuleAccessMap, setExistingModuleAccessMap] = useState({});
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    if (!roleId) return;
    const fetchRole = async () => {
      try {
        setLoadingRole(true);
        const res = await roleApi.GetRoleById({ id: roleId, accessToken, refreshToken });
        const role = res.data;
        setRoleName(role.name || "");
        setDataAccessLevel(role.dataAccessLevel || "");

        const modules = [];
        const perms = {};
        const accessMap = {};

        if (role.roleModuleAccesses?.length) {
          role.roleModuleAccesses.forEach((access) => {
            const configModule = permissionsConfig.find((m) =>
              m.sections.some((s) => s.key === access.module || s.name === access.module)
            );
            if (configModule && !modules.includes(configModule.key)) {
              modules.push(configModule.key);
            }
            accessMap[access.module] = access.id;
            if (access.permissions) {
              access.permissions.forEach((p) => { perms[p] = true; });
            }
          });
        }

        setSelectedModules(modules);
        setPermissions(perms);
        setExistingModuleAccessMap(accessMap);
      } catch (err) {
        showToast(err.message || "Failed to load role", "error");
      } finally {
        setLoadingRole(false);
      }
    };
    fetchRole();
  }, [roleId]);

  const handleModuleToggle = (moduleKey) => {
    setSelectedModules((prev) =>
      prev.includes(moduleKey) ? prev.filter((k) => k !== moduleKey) : [...prev, moduleKey]
    );
  };

  const handlePermissionToggle = (permKey) => {
    setPermissions((prev) => ({ ...prev, [permKey]: !prev[permKey] }));
  };

  const handleGrantAll = (section, checked) => {
    const updates = {};
    section.permissions.forEach((p) => { updates[p.key] = checked; });
    setPermissions((prev) => ({ ...prev, ...updates }));
  };

  const isSectionAllGranted = (section) =>
    section.permissions.every((p) => permissions[p.key]);

  const toggleAccordion = (moduleKey) => {
    setExpandedModules((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const buildModuleAccesses = () => {
    const accesses = [];
    permissionsConfig.forEach((module) => {
      if (!selectedModules.includes(module.key)) return;
      module.sections.forEach((section) => {
        const sectionPerms = section.permissions
          .filter((p) => permissions[p.key])
          .map((p) => p.key);
        if (sectionPerms.length === 0) return;
        const entry = { module: section.key, permissions: sectionPerms };
        if (isEditing && existingModuleAccessMap[section.key]) {
          entry.id = existingModuleAccessMap[section.key];
        }
        accesses.push(entry);
      });
    });
    return accesses;
  };

  const handleNext = () => {
    if (!roleName.trim()) { showToast("Role name is required", "error"); return; }
    if (selectedModules.length === 0) { showToast("Please select at least one module", "error"); return; }
    if (!dataAccessLevel) { showToast("Please select a data access level", "error"); return; }
    setActiveTab("permissions");
  };

  const handleSave = async () => {
    if (!roleName.trim()) { showToast("Role name is required", "error"); return; }
    if (!dataAccessLevel) { showToast("Data access level is required", "error"); return; }
    const moduleAccesses = buildModuleAccesses();
    try {
      setSaving(true);
      if (isEditing) {
        await roleApi.UpdateRole({ id: roleId, name: roleName.trim(), dataAccessLevel, moduleAccesses, accessToken, refreshToken });
        showToast("Role updated successfully", "success");
      } else {
        await roleApi.CreateRole({ name: roleName.trim(), dataAccessLevel, createdByAdminId: userId, moduleAccesses, accessToken, refreshToken });
        showToast("Role created successfully", "success");
      }
      navigate("/settings/roles-permissions");
    } catch (err) {
      showToast(err.message || "Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="role-config-container">

      {/* Back */}
      <div className="role-config-back-row">
        <button className="role-back-button" onClick={() => navigate("/settings/roles-permissions")}>
          <FaArrowLeft />
          <span>Back</span>
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

      {/* ── BASIC SETTINGS ── */}
      {activeTab === "basic" && (
        <div className="role-config-content">
          {loadingRole ? (
            <>
              <div className="role-field-group">
                <Skeleton width="100%" height="40px" />
              </div>
              <div className="role-field-group">
                <Skeleton width="140px" height="14px" style={{ marginBottom: "8px" }} />
                <Skeleton width="100%" height="80px" />
              </div>
              <div className="role-field-group">
                <Skeleton width="100%" height="40px" />
              </div>
            </>
          ) : (
            <>
              <div className="role-field-group">
                <TextInput
                  label="Role Name"
                  placeholder="Enter role name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>

              <div className="role-field-group">
                <label className="role-field-label">Select Module Access</label>
                <div className="role-module-list">
                  {moduleAccessOptions.map((mod) => (
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
                  options={dataAccessLevelOptions}
                  value={dataAccessLevel}
                  onChange={(e) => setDataAccessLevel(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="role-config-actions">
            <Button label="Cancel" variant="secondary" onClick={() => navigate("/settings/roles-permissions")} />
            <Button label="Next" variant="dark" onClick={handleNext} />
          </div>
        </div>
      )}

      {/* ── PERMISSIONS ── */}
      {activeTab === "permissions" && (
        <div className="role-config-content">
          <p className="role-permissions-subtitle">Set permissions for this role</p>

          <div className="role-permissions-list">
            {permissionsConfig.map((module) => {
              const isExpanded = !!expandedModules[module.key];
              return (
                <div key={module.key} className="role-accordion">
                  <div className="role-accordion-header" onClick={() => toggleAccordion(module.key)} role="button" tabIndex={0} aria-expanded={isExpanded}>
                    <span className="role-accordion-title">{module.module}</span>
                    {isExpanded ? <FaChevronUp className="role-accordion-icon" /> : <FaChevronDown className="role-accordion-icon" />}
                  </div>

                  {isExpanded && (
                    <div className="role-accordion-body">
                      {module.sections.map((section) => (
                        <div key={section.key} className="role-subcategory">
                          <div className="role-subcat-header">
                            <span className="role-subcat-badge">{section.name}</span>
                            <label className="role-grant-all">
                              <input
                                type="checkbox"
                                checked={isSectionAllGranted(section)}
                                onChange={(e) => handleGrantAll(section, e.target.checked)}
                              />
                              <span>Grant all permissions</span>
                            </label>
                          </div>
                          <div className="role-perm-grid">
                            {section.permissions.map((perm) => (
                              <label key={perm.key} className="role-perm-item">
                                <input
                                  type="checkbox"
                                  checked={!!permissions[perm.key]}
                                  onChange={() => handlePermissionToggle(perm.key)}
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
            <Button label="Previous" variant="secondary" onClick={() => setActiveTab("basic")} />
            <Button label={isEditing ? "Save Changes" : "Create Role"} variant="dark" onClick={handleSave} loading={saving} />
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleConfiguration;
