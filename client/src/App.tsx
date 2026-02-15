import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthPage from "./pages/Authpage";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/Homepage";
import CompleteProfile from "./pages/CompleteProfile";
import TaskDetailPage from "./pages/TaskDetailPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import RevenueList from "./pages/RevenueList";
import ClientsList from "./pages/ClientsList";
import TasksOverview from "./pages/TasksOverview";
import AlertsPage from "./pages/AlertsPage";
import AdminLayout from "./layouts/AdminLayout";
import AdminWorkersPage from "./pages/admin/AdminWorkersPage";
import AdminClientsPage from "./pages/admin/AdminClientsPage";
import AdminTasksPage from "./pages/admin/AdminTasksPage";
import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";
import AdminDomainsPage from "./pages/admin/AdminDomainsPage";
import AdminSendOfferPage from "./pages/admin/AdminSendOfferPage";
import AdminTimesheetsPage from "./pages/admin/AdminTimesheetsPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isAdmin = role === "ADMIN";

  return (
    <Router>
      <Toaster position="top-right" />
      <div className="flex w-full min-h-screen flex-col bg-app-grid">
        <Navbar />
        <main className="relative z-10 flex-grow min-h-0">
          <Routes>
            {/* Home page - Admin only */}
            <Route
              path="/"
              element={
                token && isAdmin ? (
                  <HomePage />
                ) : token ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Login page */}
            <Route
              path="/login"
              element={token ? <Navigate to="/dashboard" /> : <AuthPage />}
            />
            
            {/* Dashboard - Workers and Clients use legacy dashboard; Admins use /admin/* */}
            <Route
              path="/dashboard"
              element={
                token && isAdmin ? (
                  <Navigate to="/admin/workers" replace />
                ) : token ? (
                  <Dashboard />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Admin area - each tab is its own route */}
            <Route path="/admin" element={token && isAdmin ? <AdminLayout /> : <Navigate to="/login" />}>
              <Route index element={<Navigate to="/admin/workers" replace />} />
              <Route path="workers" element={<AdminWorkersPage />} />
              <Route path="clients" element={<AdminClientsPage />} />
              <Route path="tasks" element={<AdminTasksPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="domains" element={<AdminDomainsPage />} />
              <Route path="send-offer" element={<AdminSendOfferPage />} />
              <Route path="timesheets" element={<AdminTimesheetsPage />} />
            </Route>
            
            {/* Task Detail Page - All authenticated users */}
            <Route
              path="/tasks/:id"
              element={token ? <TaskDetailPage /> : <Navigate to="/login" />}
            />
            
            {/* Client Detail Page - Admin only */}
            <Route
              path="/clients/:id"
              element={
                token && isAdmin ? (
                  <ClientDetailPage />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Revenue List - Admin only */}
            <Route
              path="/revenue"
              element={
                token && isAdmin ? (
                  <RevenueList />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Clients List - Admin only */}
            <Route
              path="/clients"
              element={
                token && isAdmin ? (
                  <ClientsList />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Tasks Overview - Admin only */}
            <Route
              path="/tasks-overview"
              element={
                token && isAdmin ? (
                  <TasksOverview />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Alerts Page - Admin only */}
            <Route
              path="/alerts"
              element={
                token && isAdmin ? (
                  <AlertsPage />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Public route - no authentication required */}
            <Route path="/complete-profile" element={<CompleteProfile />} />
            
            {/* Redirect based on auth status */}
            <Route
              path="*"
              element={
                token && isAdmin ? (
                  <Navigate to="/admin/workers" />
                ) : token ? (
                  <Navigate to="/dashboard" />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;