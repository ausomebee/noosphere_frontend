import ErrorBoundary from "./Helper/ErrorBoundary";
import AllRoutes from "./Components/AllRoutes";
function App() {
  return (
    <ErrorBoundary>
      <AllRoutes />
    </ErrorBoundary>
  );
}

export default App;
