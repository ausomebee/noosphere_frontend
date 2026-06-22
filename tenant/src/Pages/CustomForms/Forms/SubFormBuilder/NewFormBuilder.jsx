import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../../../hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import {
  TextInput,
  TextareaInput,
  CheckboxInput,
  RadioInput,
  SearchInput,
} from "../../../../Components/Input/Inputs";
import Button from "../../../../Components/Button/Button";
import { FaPlus, FaTimes } from "react-icons/fa";
import { GrDrag } from "react-icons/gr";
import { FiTrash2, FiPlus as FiAdd } from "react-icons/fi";
import Pagination from "../../../../Components/Table/Pagination";
import {
  addElement,
  updateElement,
  deleteElement,
  reorderElements,
  toggleRequired,
  addOption,
  removeOption,
  updateOption,
  setFormName,
  setStatus,
  loadForm,
  resetForm,
  markSaved,
} from "../../../../ReduxStore/features/formBuilderSlice";
import { showToast, showApiError } from "../../../../Helper/ShowToast";
import api from "../../../../api/customFormsApi";
import "./NewFormBuilder.css";

const elementTypes = [
  { id: "sectionHeader", type: "sectionHeader", label: "Section Header" },
  { id: "bodyText", type: "bodyText", label: "Body Text" },
  { id: "shortText", type: "shortText", label: "Short Text Input" },
  { id: "paragraph", type: "paragraph", label: "Paragraph Input" },
  { id: "checkbox", type: "checkbox", label: "Checkbox Question" },
  { id: "radio", type: "radio", label: "Radio Button Question" },
  { id: "dropdown", type: "dropdown", label: "Dropdown Question" },
  { id: "fileUpload", type: "fileUpload", label: "File Upload" },
  { id: "signature", type: "signature", label: "Signature Field" },
  { id: "starRating", type: "starRating", label: "Star Rating" },
];

/* ──────────────────────────────────────── SIDEBAR ITEM ──────────────────────────────────────── */
const SidebarItem = ({ id, label }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`formbuilder-sidebar-element ${isDragging ? "dragging" : ""}`}
    >
      <GrDrag className="drag-icon" />
      <span>{label}</span>
    </div>
  );
};

/* ──────────────────────────────────────── PREVIEW FIELD ──────────────────────────────────────── */
const SortablePreviewField = ({ field, errors }) => {
  const dispatch = useDispatch();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldNames = {
    sectionHeader: "Section Header",
    bodyText: "Body Text",
    shortText: "Short Text Input",
    paragraph: "Paragraph Input",
    checkbox: "Checkbox Question",
    radio: "Radio Button Question",
    dropdown: "Dropdown Question",
    fileUpload: "File Upload",
    signature: "Signature Field",
    starRating: "Star Rating",
  };

  return (
    <div ref={setNodeRef} style={style} className="preview-field">
      <div className="field-tag" {...listeners} {...attributes}>
        <GrDrag className="drag-icon" />
        {fieldNames[field.type]}
      </div>

      <div className="field-input-wrapper">
        <FieldRenderer field={field} errors={errors?.[field.id]} />
      </div>

      {!["sectionHeader", "bodyText"].includes(field.type) && (
        <label className="required-outside">
          <CheckboxInput
            checked={field.required || false}
            onChange={(e) => {
              e.stopPropagation();
              dispatch(toggleRequired(field.id));
            }}
          />
          Required Answer
        </label>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(deleteElement(field.id));
        }}
        className="delete-btn"
        type="button"
      >
        <FiTrash2 />
      </button>
    </div>
  );
};

/* ──────────────────────────────────────── DROPPABLE ZONE ──────────────────────────────────────── */
const DroppableZone = ({ children }) => {
  const { setNodeRef } = useDroppable({ id: "droppable-preview" });
  return (
    <div ref={setNodeRef} className="drop-zone">
      {children}
    </div>
  );
};

/* ──────────────────────────────────────── FIELD RENDERER ──────────────────────────────────────── */
const FieldRenderer = ({ field, errors = {} }) => {
  const dispatch = useDispatch();
  const update = (updates) =>
    dispatch(updateElement({ id: field.id, updates }));

  const [fileSettings, setFileSettings] = useState(
    field.fileSettings || {
      maxFiles: 1,
      maxSize: "10MB",
      allowedTypes: ["PDF", "Image", "DOCX", "Spreadsheet", "Video"],
    },
  );

  const [allowUpload, setAllowUpload] = useState(
    field.allowSignatureUpload ?? false,
  );

  useEffect(() => {
    if (field.type === "fileUpload") {
      update({ fileSettings });
    }
  }, [fileSettings, field.id, field.type, update]);

  useEffect(() => {
    if (field.type === "signature") {
      update({ allowSignatureUpload: allowUpload });
    }
  }, [allowUpload, field.id, field.type, update]);

  const handleRemoveOption = (index) => {
    if ((field.options || []).length <= 2) return;
    dispatch(removeOption({ id: field.id, index }));
  };

  const handleAddOption = () => {
    const currentOptions = field.options || [];
    const optionNumbers = currentOptions
      .map((opt) => {
        const match = opt.match(/^Option (\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter((num) => num > 0);

    const nextNumber =
      optionNumbers.length > 0
        ? Math.max(...optionNumbers) + 1
        : currentOptions.length + 1;
    dispatch(addOption({ id: field.id, option: `Option ${nextNumber}` }));
  };

  useEffect(() => {
    if (["checkbox", "radio", "dropdown"].includes(field.type)) {
      if (!field.options || field.options.length === 0) {
        dispatch(
          updateElement({
            id: field.id,
            updates: { options: ["Option 1", "Option 2"] },
          }),
        );
      }
    }
  }, [field.options, field.id, field.type, dispatch]);

  return (
    <div style={{ width: "100%" }} onClick={(e) => e.stopPropagation()}>
      {/* QUESTION INPUT */}
      {field.type === "bodyText" ? (
        <TextareaInput
          value={field.label || ""}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Type your text here"
          rows={4}
          className="question-input"
          error={errors.label}
        />
      ) : field.type === "sectionHeader" ? (
        <TextInput
          value={field.label || ""}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Type your section header here"
          className="question-input header"
          error={errors.label}
        />
      ) : (
        <TextInput
          value={field.label || ""}
          onChange={(e) => update({ label: e.target.value })}
          placeholder="Type your question here"
          className="question-input"
          error={errors.label}
        />
      )}

      {/* OPTIONS */}
      {(field.type === "checkbox" ||
        field.type === "radio" ||
        field.type === "dropdown") && (
        <div className="options-list">
          {(field.options || ["Option 1", "Option 2"]).map((opt, i) => (
            <div key={i} className="option-row">
              {field.type === "radio" ? (
                <RadioInput disabled />
              ) : field.type === "dropdown" ? (
                <span className="dropdown-arrow"></span>
              ) : (
                <CheckboxInput disabled />
              )}
              <div style={{ flex: 1, marginBottom: "-8px" }}>
                <TextInput
                  value={opt}
                  width="full"
                  onChange={(e) =>
                    dispatch(
                      updateOption({
                        id: field.id,
                        index: i,
                        value: e.target.value,
                      }),
                    )
                  }
                  className="option-input"
                  error={errors[`option-${i}`]}
                />
              </div>
              {field.options?.length > 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveOption(i);
                  }}
                  className="remove-option"
                  type="button"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddOption();
            }}
            className="add-option-btn"
            type="button"
          >
            <FiAdd /> Add another option
          </button>
        </div>
      )}

      {/* FILE UPLOAD */}
      {field.type === "fileUpload" && (
        <div className="file-settings">
          <div className="file-setting-row mb-16">
            <span>Maximum number of files</span>
            <div style={{ marginBottom: "-12px" }}>
              <TextInput
                type="number"
                min="1"
                value={fileSettings.maxFiles}
                onChange={(e) =>
                  setFileSettings((s) => ({
                    ...s,
                    maxFiles: Math.max(1, Number(e.target.value)),
                  }))
                }
                className="small-input force-br"
                error={errors.maxFiles}
              />
            </div>
          </div>
          <div className="file-setting-row mb-16">
            <span>Maximum file size</span>
            <div style={{ marginBottom: "-12px" }}>
              <TextInput
                type="text"
                value={fileSettings.maxSize}
                onChange={(e) =>
                  setFileSettings((s) => ({ ...s, maxSize: e.target.value }))
                }
                className="small-input force-br"
                error={errors.maxSize}
              />
            </div>
          </div>
          <div className="file-types">
            <span>Allowed file types</span>
            <div className="file-type-checkboxes">
              {["PDF", "Image", "DOCX", "Spreadsheet", "Video"].map((type) => (
                <label key={type} className="file-type-label">
                  <CheckboxInput
                    checked={fileSettings.allowedTypes.includes(type)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFileSettings((s) => ({
                        ...s,
                        allowedTypes: checked
                          ? [...s.allowedTypes, type]
                          : s.allowedTypes.filter((t) => t !== type),
                      }));
                    }}
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SIGNATURE */}
      {field.type === "signature" && (
        <label className="signature-upload">
          <CheckboxInput
            checked={allowUpload}
            onChange={(e) => setAllowUpload(e.target.checked)}
          />
          Allow file upload
        </label>
      )}

      {/* STAR RATING */}
      {field.type === "starRating" && (
        <div className="star-setting">
          <span>Number of stars</span>
          <div style={{ marginBottom: "-12px" }}>
            <TextInput
              type="number"
              min="1"
              max="10"
              placeholder="5"
              value={field.maxStars ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                // Allow the field to be cleared/typed freely; coercing "" to a
                // number here is what made it feel un-typeable (it snapped back).
                update({ maxStars: v === "" ? undefined : Number(v) });
              }}
              className="small-input force-br"
              error={errors.maxStars}
            />
          </div>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────── IMPORT MODAL (REAL TEMPLATES) ──────────────────────────────────────── */
const ImportTemplateModal = ({
  onClose,
  onSelect,
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // FETCH TEMPLATES
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.GetTemplatesByTenantId({
          tenantId,
          accessToken,
          refreshToken,
        });
        setTemplates(res.data.data || []);
      } catch (err) {
        // No toast: empty/unavailable content is not an error.
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [tenantId, accessToken, refreshToken]);

  const filtered = useMemo(() => {
    return templates.filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [templates, search]);

  const paginated = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="custom-form-modal-overlay" onClick={onClose}>
      <div
        className="custom-form-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-form-modal-header">
          <div style={{ width: 40 }} />
          <h3 className="text-primary">Import from Template Library</h3>

          <button
            onClick={onClose}
            className="flex gap-2 custom-form-modal-close text-primary"
          >
            <FaTimes /> close
          </button>
        </div>

        <div className="custom-form-modal-search items-center justify-center flex">
          <SearchInput
            placeholder="Search templates..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            width="full"
          />
        </div>

        <div className="custom-form-modal-list">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
            </div>
          ) : paginated.length === 0 ? (
            <p className="text-center py-4">No templates found</p>
          ) : (
            paginated.map((template) => (
              <div key={template.id} className="custom-form-template-item">
                <span>{template.name}</span>
                <Button
                  label="Use Template"
                  size="small"
                  onClick={() => onSelect(template)}
                />
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="custom-form-modal-pagination">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────── MAIN COMPONENT ──────────────────────────────────────── */
const NewFormBuilder = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { formName, elements, status, dirty } = useSelector(
    (state) => state.formBuilder,
  );
  const { tenantId, accessToken, refreshToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [errors, setErrors] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /* ────── LOAD FORM (EDIT MODE) ────── */
  useEffect(() => {
    if (!formId) {
      // Only clear for a genuinely fresh form. If there's unsaved work (dirty),
      // keep it so leaving the builder — even after a save error — doesn't lose
      // progress. It's cleared only once a save action completes.
      if (!dirty) dispatch(resetForm());
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.GetFormsByFormId({
          formId,
          accessToken,
          refreshToken,
        });
        const data = res.data.data;

        const mapped = (data.fields || []).map((f) => {
          const base = {
            id: String(f.id),
            type: f.fieldType,
            label: f.label || "",
            required: f.isRequired || false,
            options: f.options || [],
          };

          if (f.fileUpload && Array.isArray(f.fileUpload) && f.fileUpload[0]) {
            base.fileSettings = {
              maxFiles: f.fileUpload[0].maxFiles || 1,
              maxSize: f.fileUpload[0].maxSize || "10MB",
              allowedTypes: f.fileUpload[0].allowedTypes || [],
            };
          }

          if (f.starRating && Array.isArray(f.starRating) && f.starRating[0]) {
            base.maxStars = f.starRating[0];
          }

          if (f.signature && Array.isArray(f.signature) && f.signature[0]) {
            base.allowSignatureUpload = f.signature[0].allowUpload ?? false;
          }

          return base;
        });

        dispatch(
          loadForm({
            formName: data.name,
            elements: mapped,
            status: data.isDraft
              ? "draft"
              : data.isTemplate
                ? "template"
                : "published",
          }),
        );

        showToast("Form loaded successfully", "success");
      } catch (err) {
        console.error("Load error:", err);
        showApiError(err, "LOAD_FORM");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [formId, accessToken, refreshToken, dispatch]);

  /* ────── VALIDATION ────── */
  const validateForm = useCallback(() => {
    const errs = {};

    if (!formName?.trim()) {
      errs.form = "Form name is required.";
    }

    if (elements.length === 0) {
      errs.form = errs.form
        ? errs.form + " Add at least one field."
        : "Add at least one field.";
    }

    elements.forEach((el) => {
      const fieldErrs = {};

      if (
        !["sectionHeader", "bodyText"].includes(el.type) &&
        !el.label?.trim()
      ) {
        fieldErrs.label = "Question is required.";
      }

      if (["checkbox", "radio", "dropdown"].includes(el.type)) {
        (el.options || []).forEach((opt, i) => {
          if (!opt?.trim()) {
            fieldErrs[`option-${i}`] = "Option cannot be empty.";
          }
        });
      }

      if (el.type === "fileUpload" && el.fileSettings) {
        if (el.fileSettings.maxFiles < 1) {
          fieldErrs.maxFiles = "Max files must be ≥ 1.";
        }
        if (!el.fileSettings.maxSize?.trim()) {
          fieldErrs.maxSize = "Max size is required.";
        }
      }

      if (
        el.type === "starRating" &&
        (!el.maxStars || el.maxStars < 1 || el.maxStars > 10)
      ) {
        fieldErrs.maxStars = "Stars must be 1–10.";
      }

      if (Object.keys(fieldErrs).length > 0) {
        errs[el.id] = fieldErrs;
      }
    });

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formName, elements]);

  /* ────── DRAG HANDLERS ────── */
  const handleDragStart = (event) => setActiveId(String(event.active.id));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    const sidebarItem = elementTypes.find((el) => el.id === activeId);
    if (sidebarItem) {
      dispatch(
        addElement({
          id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: sidebarItem.type,
          label: "",
          required: false,
          options: ["checkbox", "radio", "dropdown"].includes(sidebarItem.type)
            ? ["Option 1", "Option 2"]
            : [],
          maxStars: sidebarItem.type === "starRating" ? 5 : undefined,
        }),
      );
    } else {
      const oldIndex = elements.findIndex((el) => String(el.id) === activeId);
      const newIndex = elements.findIndex((el) => String(el.id) === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        dispatch(reorderElements(arrayMove(elements, oldIndex, newIndex)));
      }
    }

    setActiveId(null);
  };

  const validElements = elements
    .filter((el) => el && el.id != null)
    .map((el) => ({ ...el, id: String(el.id) }));

  const activeElement = activeId
    ? elementTypes.find((el) => el.id === activeId) ||
      validElements.find((el) => el.id === activeId)
    : null;

  /* ────── BUILD PAYLOAD ────── */
  const buildPayload = useCallback(() => {
    const formFields = validElements.map((el, idx) => {
      const base = {
        ...(formId && { id: el.id }),
        fieldType: el.type,
        label: el.label || "",
        placeholder:
          ["shortText", "paragraph"].includes(el.type) && el.label
            ? el.label
            : "",
        isRequired: el.required || false,
        order: idx + 1,
      };

      if (["checkbox", "radio", "dropdown"].includes(el.type)) {
        base.options = (el.options || []).filter(Boolean);
      }

      if (el.type === "fileUpload" && el.fileSettings) {
        base.fileUpload = [
          {
            maxFiles: el.fileSettings.maxFiles,
            maxSize: el.fileSettings.maxSize,
            allowedTypes: el.fileSettings.allowedTypes,
          },
        ];
      }

      if (el.type === "starRating") {
        // Always send a valid number (default 5) so the payload never contains
        // NaN/null — a malformed star value can make the backend reject (500).
        base.starRating = [Number(el.maxStars) || 5];
      }

      if (el.type === "signature") {
        base.signature = [{ allowUpload: el.allowSignatureUpload ?? false }];
      }

      return base;
    });

    return {
      ...(formId && { id: formId }),
      tenantId,
      name: formName || "Untitled Form",
      isDraft: status === "draft",
      isTemplate: status === "template",
      formFields,
    };
  }, [validElements, formName, status, formId, tenantId]);

  /* ────── SAVE HANDLER ────── */
  const handleSave = async (type) => {
    if (!validateForm()) {
      showToast("Please fix validation errors before saving.", "error");
      return;
    }

    const isDraft = type === "draft";
    const isTemplate = type === "template";

    dispatch(
      setStatus(isDraft ? "draft" : isTemplate ? "template" : "published"),
    );

    const payload = {
      ...buildPayload(),
      isDraft,
      isTemplate,
    };

    setSaving(true);
    try {
      let res;
      if (formId) {
        await api.UpdateCustomForm({
          ...payload,
          id: formId,
          accessToken,
          refreshToken,
        });
        res = { id: formId };
      } else {
        res = await api.CreateCustomForm({
          ...payload,
          accessToken,
          refreshToken,
        });
      }

      const action =
        type === "publish"
          ? "published"
          : type === "template"
            ? "saved as template"
            : "saved as draft";

      showToast(`Form ${action} successfully!`, "success");

      // Save completed — clear the "unsaved work" flag so the persisted buffer
      // isn't restored as a new draft next time a blank form is opened.
      dispatch(markSaved());

      // After a fresh create, switch the route to the edit URL so the new id
      // becomes the active formId — subsequent saves update this form instead
      // of creating a duplicate, and the builder reflects the saved record.
      if (!formId) {
        const newId = res?.id || res?.data?.id || res?.formId;
        if (newId) {
          navigate(`/custom-forms/forms/create/${newId}`, { replace: true });
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast(
        err.message || "Failed to save form. Please try again.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ────── IMPORT TEMPLATE (REAL FETCH) ────── */
  const handleImportTemplate = async (template) => {
    setShowImportModal(false);
    setLoading(true);

    try {
      const res = await api.GetFormsByFormId({
        formId: template.id,
        accessToken,
        refreshToken,
      });
      const data = res.data.data;

      const mapped = (data.fields || []).map((f) => {
        const base = {
          id: String(f.id),
          type: f.fieldType,
          label: f.label || "",
          required: f.isRequired || false,
          options: f.options || [],
        };

        if (f.fileUpload && Array.isArray(f.fileUpload) && f.fileUpload[0]) {
          base.fileSettings = {
            maxFiles: f.fileUpload[0].maxFiles || 1,
            maxSize: f.fileUpload[0].maxSize || "10MB",
            allowedTypes: f.fileUpload[0].allowedTypes || [],
          };
        }

        if (f.starRating && Array.isArray(f.starRating) && f.starRating[0]) {
          base.maxStars = f.starRating[0];
        }

        if (f.signature && Array.isArray(f.signature) && f.signature[0]) {
          base.allowSignatureUpload = f.signature[0].allowUpload ?? false;
        }

        return base;
      });

      dispatch(
        loadForm({
          formName: data.name,
          elements: mapped,
          status: "draft",
        }),
      );

      showToast(`Template "${data.name}" imported!`, "success");
    } catch (err) {
      showToast("Failed to import template", "error");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="formbuilder-header">
          <div style={{ flex: 1, maxWidth: 400 }}>
            <TextInput
              label="Form Name"
              placeholder="Enter form name"
              width="full"
              value={formName}
              onChange={(e) => dispatch(setFormName(e.target.value))}
              error={errors.form}
            />
          </div>
          <div>
            <Button
              label="Import from Template Library"
              icon={<FaPlus />}
              variant="important"
              onClick={() => setShowImportModal(true)}
            />
          </div>
        </div>

        <div className="new-form-builder">
          <div className="formbuilder-body">
            {/* Sidebar */}
            <div className="formbuilder-sidebar">
              <h3>Form Elements</h3>
              <div className="sidebar-scroll">
                <SortableContext
                  items={elementTypes.map((el) => el.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {elementTypes.map((el) => (
                    <SidebarItem key={el.id} id={el.id} label={el.label} />
                  ))}
                </SortableContext>
              </div>
            </div>

            {/* Preview */}
            <div className="preview">
              <h3>Form Preview</h3>
              <div className="preview-scroll">
                <DroppableZone>
                  {validElements.length === 0 ? (
                    <p className="empty">Drag and drop form elements here</p>
                  ) : (
                    <SortableContext
                      items={validElements.map((el) => el.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {validElements.map((field) => (
                        <SortablePreviewField
                          key={field.id}
                          field={field}
                          errors={errors}
                        />
                      ))}
                    </SortableContext>
                  )}
                </DroppableZone>
              </div>
            </div>
          </div>

          <div className="formbuilder-footer">
            <div>
              <Button
                label="Save as Template"
                variant="important"
                icon={<FaPlus />}
                size="small"
                onClick={() => handleSave("template")}
                disabled={saving}
                className=""
              />
            </div>
            <div>
              <Button
                label="Save to Drafts"
                variant="secondary"
                size="large"
                onClick={() => handleSave("draft")}
                disabled={saving}
              />
            </div>
            <div>
              <Button
                label="Publish"
                variant="primary"
                onClick={() => handleSave("publish")}
                disabled={saving}
                size="large"
              />
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeElement ? (
            <div className="drag-overlay">
              <GrDrag className="drag-icon" />
              <span>{activeElement.label || "Field"}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showImportModal && (
        <ImportTemplateModal
          onClose={() => setShowImportModal(false)}
          onSelect={handleImportTemplate}
          tenantId={tenantId}
          accessToken={accessToken}
          refreshToken={refreshToken}
        />
      )}
    </>
  );
};

export default NewFormBuilder;
