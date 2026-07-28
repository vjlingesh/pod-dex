import { Route, Routes } from "react-router-dom";
import { HealthPage } from "./pages/HealthPage.js";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthPage />} />
    </Routes>
  );
}
