import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./styles/detail-view.css";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../src/ReduxStore/store.js";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";



createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router basename={import.meta.env.BASE_URL}>
          <App />
          <ToastContainer style={{ zIndex: 99999 }} />
        </Router>
      </PersistGate>
    </Provider>
  </StrictMode>
);
