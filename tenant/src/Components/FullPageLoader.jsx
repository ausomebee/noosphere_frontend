import Logo from "../assets/Logo.svg";

const FullPageLoader = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      width: "100%",
      background: "#fff",
    }}
    role="status"
    aria-live="polite"
  >
    <img
      src={Logo}
      alt="Noosphere"
      style={{
        width: 160,
        animation: "logoBreath 1.8s ease-in-out infinite",
      }}
    />
    <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>Loading...</span>
  </div>
);

export default FullPageLoader;
