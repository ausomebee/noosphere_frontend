import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "../src/ReduxStore/store.js";
import { ToastContainer } from "react-toastify";
import { Provider } from "react-redux";



createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Router>
          <App />
          <ToastContainer />
        </Router>
      </PersistGate>
    </Provider>
  </StrictMode>
);
