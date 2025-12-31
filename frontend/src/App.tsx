import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminEmployeesPage from "./pages/admin/EmployeePage";
import EmployeeDashboardPage from "./pages/employee/DashboardPage";
import EmployeeScreenshotsPage from "./pages/admin/EmployeeScreenshotsPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute requireAdmin>
                <AdminEmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees/:employeeId/screenshots"
            element={
              <ProtectedRoute requireAdmin>
                <EmployeeScreenshotsPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute requireEmployee>
                <EmployeeDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
