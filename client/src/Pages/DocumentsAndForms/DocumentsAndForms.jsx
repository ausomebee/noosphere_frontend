import React from "react";
import DashboardLayout from "../../layouts/ClientLayout";
import DocumentRequests from "./DocumentRequest/DocumentRequests";
import MyDocuments from "./MyDocuments/MyDocuments";

const DocumentsAndForms = () => {
  return (
    <DashboardLayout>
      <DocumentRequests />
      <MyDocuments />
    </DashboardLayout>
  );
};

export default DocumentsAndForms;
