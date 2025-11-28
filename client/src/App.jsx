import ErrorBoundary from "./Helper/ErrorBoundary";
import AllRoutes from "./Components/Allroutes";
function App() {
  return (
    <ErrorBoundary>
      <AllRoutes />
    </ErrorBoundary>
  );
}

export default App;
