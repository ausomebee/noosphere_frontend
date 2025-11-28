
// Clinical Reports Tab Component
const ClinicalReportsTab = () => {
  return (
    <div className="tab-content">
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h3 className="empty-state-title">No Clinical Reports</h3>
        <p className="empty-state-description">
          Clinical reports and assessments will be listed here
        </p>
        <button className="empty-state-button">Generate Report</button>
      </div>
    </div>
  );
};

export default ClinicalReportsTab