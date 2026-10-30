import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", textAlign: "center", padding: "20px", background: "#fff" }}>
      <svg width="280" height="200" viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ marginBottom: "24px" }}>
        <rect x="60" y="30" width="160" height="120" rx="8" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="2"/>
        <rect x="80" y="55" width="120" height="8" rx="4" fill="#C7D2FE"/>
        <rect x="80" y="72" width="90" height="8" rx="4" fill="#DDD6FE"/>
        <rect x="80" y="89" width="105" height="8" rx="4" fill="#C7D2FE"/>
        <rect x="80" y="106" width="60" height="8" rx="4" fill="#DDD6FE"/>
        <circle cx="220" cy="50" r="30" fill="#FEF3C7" stroke="#FCD34D" strokeWidth="2"/>
        <path d="M210 50 L218 58 L230 42" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="60" cy="160" r="20" fill="#FEE2E2" stroke="#FCA5A5" strokeWidth="2"/>
        <path d="M52 152 L68 168 M68 152 L52 168" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M140 150 Q140 170 160 175 Q140 180 140 200" stroke="#C7D2FE" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d="M100 155 Q110 165 100 175" stroke="#DDD6FE" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
      <h1 style={{ fontSize: "4rem", fontWeight: 700, color: "#1e40af", margin: "0 0 8px" }}>404</h1>
      <h2 style={{ fontSize: "1.25rem", color: "#374151", marginBottom: "8px", fontWeight: 500 }}>Page not found</h2>
      <p style={{ color: "#6b7280", marginBottom: "24px", maxWidth: "400px", lineHeight: 1.5 }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate("/")}
        style={{ padding: "10px 24px", background: "#1e40af", color: "#fff", border: "none", borderRadius: "6px", fontSize: "1rem", cursor: "pointer", fontWeight: 500 }}
      >
        Go Home
      </button>
    </div>
  );
};

export default NotFound;
