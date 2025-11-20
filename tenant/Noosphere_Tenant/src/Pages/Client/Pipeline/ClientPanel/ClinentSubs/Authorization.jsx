// Authorization Tab Component
const AuthorizationTab = () => {
  return (
    <div className="tab-content">
      <div className="authorization-card">
        <div className="authorization-header">
          <h3 className="authorization-title">Active Authorizations</h3>
          <button className="authorization-add-btn">+ Add Authorization</button>
        </div>
        <div className="authorization-list">
          <div className="authorization-item">
            <div className="authorization-info">
              <h4 className="authorization-service">ABA Therapy</h4>
              <p className="authorization-details">
                Authorization #: AUTH-2024-001
              </p>
              <p className="authorization-details">
                Valid: 01/01/2024 - 12/31/2024
              </p>
            </div>
            <div className="authorization-status">
              <span className="status-badge status-active">Active</span>
              <p className="authorization-units">40 / 100 units used</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default AuthorizationTab