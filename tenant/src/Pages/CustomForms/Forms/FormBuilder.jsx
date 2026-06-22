// FormBuilder.jsx
import React, { useState, useEffect } from "react";
import { FaArrowLeft } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import NewFormBuilder from "./SubFormBuilder/NewFormBuilder";
import FormDrafts from "./SubFormBuilder/FormDrafts";

const FormBuilder = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const [activeTab, setActiveTab] = useState("newForm");
  const [draftCount, setDraftCount] = useState(0); // REAL COUNT FROM CHILD

  // Editing a draft navigates to /create/:formId while this page is already
  // mounted (e.g. from the Drafts tab). The route changes but the tab wouldn't,
  // so force the builder tab whenever a formId is present so the editor opens.
  useEffect(() => {
    if (formId) setActiveTab("newForm");
  }, [formId]);

  return (
    <>
      {/* Header with Back Button */}
      <div className="manage-column-header">
        <button className="manage-back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft />
          Back
        </button>
        <h1 style={{ color: "#9097A1" }}>Form Builder</h1>
        <div style={{ width: 100, height: 40 }} />
      </div>

      {/* Tabs */}
      <div className="tabs mt-6">
        <button
          className={`tab flex items-center justify-center ${
            activeTab === "newForm" ? "active" : ""
          }`}
          onClick={() => setActiveTab("newForm")}
        >
          New Form
        </button>

        <button
          className={`tab flex items-center justify-center ${
            activeTab === "drafts" ? "active" : ""
          }`}
          onClick={() => setActiveTab("drafts")}
        >
          <span>Drafts</span>
          {draftCount > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
              {draftCount}
            </span>
          )}
        </button>
      </div>

      {/* Conditional Content */}
      <div className="appointment-content">
        {activeTab === "newForm" && <NewFormBuilder />}
        {activeTab === "drafts" && (
          <FormDrafts onCountChange={setDraftCount} />
        )}
      </div>
    </>
  );
};

export default FormBuilder;