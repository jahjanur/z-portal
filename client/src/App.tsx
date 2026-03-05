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
import EraSphereLayout from "./layouts/EraSphereLayout";
import ZulberaLayout from "./layouts/ZulberaLayout";
import AdminWorkersPage from "./pages/admin/AdminWorkersPage";
import AdminClientsPage from "./pages/admin/AdminClientsPage";
import AdminTasksPage from "./pages/admin/AdminTasksPage";
import AdminInvoicesPage from "./pages/admin/AdminInvoicesPage";
import AdminDomainsPage from "./pages/admin/AdminDomainsPage";
import AdminSendOfferPage from "./pages/admin/AdminSendOfferPage";
import AdminTimesheetsPage from "./pages/admin/AdminTimesheetsPage";
import AdminEraSpherePartnersPage from "./pages/admin/AdminEraSpherePartnersPage";
import EraSphereAnalyticsPage from "./pages/admin/EraSphereAnalyticsPage";
import EraSphereAnalyticsAdminPage from "./pages/admin/EraSphereAnalyticsAdminPage";
import EraSphereClientsPage from "./pages/admin/EraSphereClientsPage";
import EraSphereTasksPage from "./pages/admin/EraSphereTasksPage";
import ZulberaAnalyticsPage from "./pages/admin/ZulberaAnalyticsPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { MobileMenuProvider } from "./contexts/MobileMenuContext";

function App() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const isAdmin = role === "ADMIN";
  const isEraSphere = role === "ERASPHERE";
  const isAdminOrEraSphere = isAdmin || isEraSphere;

  return (
    <Router>
      <MobileMenuProvider>
      <Toaster position="top-right" />
      <div className="flex w-full max-w-full min-w-0 min-h-screen flex-col bg-app-grid overflow-x-hidden">
        <Navbar />
        <main className="relative z-10 flex-grow min-h-0 min-w-0 overflow-x-hidden">
          <Routes>
            {/* Home page - Admin only (EraSphere redirects to their dashboard) */}
            <Route
              path="/"
              element={
                token && isAdmin ? (
                  <HomePage />
                ) : token && isEraSphere ? (
                  <Navigate to="/admin/erasphere-dashboard" replace />
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
            
            {/* Dashboard - Admin goes to Zulbera; EraSphere to their dashboard; Workers/Clients use dashboard */}
            <Route
              path="/dashboard"
              element={
                token && isAdmin ? (
                  <Navigate to="/admin/zulbera/workers" replace />
                ) : token && isEraSphere ? (
                  <Navigate to="/admin/erasphere-dashboard" replace />
                ) : token ? (
                  <Dashboard />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            {/* Zulbera area — admin's own work only, sidebar layout (same structure as EraSphere) */}
            <Route path="/admin/zulbera" element={token && isAdmin ? <ZulberaLayout /> : <Navigate to="/login" />}>
              <Route index element={<Navigate to="/admin/zulbera/analytics" replace />} />
              <Route path="analytics" element={<ZulberaAnalyticsPage />} />
              <Route path="workers" element={<AdminWorkersPage />} />
              <Route path="clients" element={<AdminClientsPage />} />
              <Route path="tasks" element={<AdminTasksPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="domains" element={<AdminDomainsPage />} />
              <Route path="send-offer" element={<AdminSendOfferPage />} />
              <Route path="timesheets" element={<AdminTimesheetsPage />} />
            </Route>

            {/* Admin area - legacy /admin/* redirects to Zulbera for admin; EraSphere role uses own dashboard */}
            <Route path="/admin" element={token && isAdminOrEraSphere ? <AdminLayout /> : <Navigate to="/login" />}>
              <Route index element={isEraSphere ? <Navigate to="/admin/erasphere-dashboard" replace /> : <Navigate to="/admin/zulbera/workers" replace />} />
              <Route path="workers" element={isAdmin ? <Navigate to="/admin/zulbera/workers" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="clients" element={isAdmin ? <Navigate to="/admin/zulbera/clients" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="tasks" element={isAdmin ? <Navigate to="/admin/zulbera/tasks" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="invoices" element={isAdmin ? <Navigate to="/admin/zulbera/invoices" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="domains" element={isAdmin ? <Navigate to="/admin/zulbera/domains" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="send-offer" element={isAdmin ? <Navigate to="/admin/zulbera/send-offer" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="timesheets" element={isAdmin ? <Navigate to="/admin/zulbera/timesheets" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="erasphere-partners" element={<Navigate to="/admin/erasphere/partners" replace />} />
              <Route path="erasphere-dashboard" element={isEraSphere ? <EraSphereAnalyticsPage /> : <Navigate to="/admin/zulbera/workers" replace />} />
            </Route>
            
            {/* EraSphere area — separate layout (sidebar), same protection */}
            <Route path="/admin/erasphere" element={token && isAdmin ? <EraSphereLayout /> : <Navigate to="/login" />}>
              <Route index element={<Navigate to="/admin/erasphere/analytics" replace />} />
              <Route path="analytics" element={<EraSphereAnalyticsAdminPage />} />
              <Route path="partners" element={<AdminEraSpherePartnersPage />} />
              <Route path="clients" element={<EraSphereClientsPage />} />
              <Route path="tasks" element={<EraSphereTasksPage />} />
            </Route>

            {/* Task Detail Page - All authenticated users */}
            <Route
              path="/tasks/:id"
              element={token ? <TaskDetailPage /> : <Navigate to="/login" />}
            />
            
            {/* Client Detail Page - Admin and EraSphere */}
            <Route
              path="/clients/:id"
              element={
                token && isAdminOrEraSphere ? (
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
                ) : token && isEraSphere ? (
                  <Navigate to="/admin/erasphere-dashboard" replace />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Clients List - Admin and EraSphere */}
            <Route
              path="/clients"
              element={
                token && isAdminOrEraSphere ? (
                  <ClientsList />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Tasks Overview - Admin and EraSphere */}
            <Route
              path="/tasks-overview"
              element={
                token && isAdminOrEraSphere ? (
                  <TasksOverview />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Alerts Page - Admin and EraSphere */}
            <Route
              path="/alerts"
              element={
                token && isAdminOrEraSphere ? (
                  <AlertsPage />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            
            {/* Public route - no authentication required */}
            <Route path="/complete-profile" element={<CompleteProfile />} />
            
            {/* Redirect based on auth status — Admin lands on Analytics (main page) */}
            <Route
              path="*"
              element={
                token && isAdmin ? (
                  <Navigate to="/" />
                ) : token && isEraSphere ? (
                  <Navigate to="/admin/erasphere-dashboard" />
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
      </MobileMenuProvider>
    </Router>
  );
}

export default App;