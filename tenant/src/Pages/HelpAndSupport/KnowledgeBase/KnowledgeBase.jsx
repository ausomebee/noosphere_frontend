import React from "react";
import usePermissions from "../../../hooks/usePermissions";
import AccessDenied from "../../../Components/AccessDenied/AccessDenied";
import "./KnowledgeBase.css";

const KnowledgeBase = () => {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission("knowledge_base", "view_knowledge_base"))
    return <AccessDenied />;

  return (
    <>
      <div className="knowledge-base-container">
        <h1 className="client-list-title">Knowledge Base</h1>
      </div>
    </>
  );
};

export default KnowledgeBase;
