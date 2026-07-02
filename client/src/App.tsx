import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import API from "./api";
import { setCurrencySettings } from "./utils";
import { AMOUNTS_EVENT } from "./utils/currency";
import AuthPage from "./pages/Authpage";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/Homepage";
import CompleteProfile from "./pages/CompleteProfile";
import ResetPassword from "./pages/ResetPassword";
import InviteAcceptPage from "./pages/InviteAcceptPage";
import NotificationPreferencesPage from "./pages/NotificationPreferencesPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import CurrencySettingsPage from "./pages/CurrencySettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
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
import AdminCommentsPage from "./pages/admin/AdminCommentsPage";
import AdminEraSpherePartnersPage from "./pages/admin/AdminEraSpherePartnersPage";
import EraSphereAnalyticsPage from "./pages/admin/EraSphereAnalyticsPage";
import EraSphereAnalyticsAdminPage from "./pages/admin/EraSphereAnalyticsAdminPage";
import EraSphereClientsPage from "./pages/admin/EraSphereClientsPage";
import EraSphereTasksPage from "./pages/admin/EraSphereTasksPage";
import ZulberaAnalyticsPage from "./pages/admin/ZulberaAnalyticsPage";
import ServiceDetailPage from "./pages/admin/ServiceDetailPage";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import NotFound from "./pages/NotFound";
import { MobileMenuProvider } from "./contexts/MobileMenuContext";

function AppShell() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // Load the display-currency settings once so dashboard totals convert. The
  // counter bump re-renders the tree after the module cache is populated.
  const [, bumpCurrency] = useState(0);
  useEffect(() => {
    if (!token) return;
    API.get("/settings/currency")
      .then(({ data }) => { setCurrencySettings(data); bumpCurrency((n) => n + 1); })
      .catch(() => {});
  }, [token]);

  // Re-render the whole tree when the "hide amounts" privacy toggle changes so
  // every money figure re-formats (masked ↔ shown).
  useEffect(() => {
    const h = () => bumpCurrency((n) => n + 1);
    window.addEventListener(AMOUNTS_EVENT, h);
    return () => window.removeEventListener(AMOUNTS_EVENT, h);
  }, []);
  const isAdmin = role === "ADMIN";
  const isEraSphere = role === "ERASPHERE";
  const isAdminOrEraSphere = isAdmin || isEraSphere;

  // Auth screens (login / invite / complete-profile) render bare — no nav/footer.
  const { pathname } = useLocation();
  const isAuthScreen =
    pathname === "/login" ||
    pathname === "/complete-profile" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/invite");

  // Sidebar layouts render their own footer inside the content column (so it
  // sits beside the full-height sidebar), so suppress the global one there.
  const hasOwnFooter =
    pathname.startsWith("/admin/zulbera") || pathname.startsWith("/admin/erasphere");

  return (
      <div className="flex w-full max-w-full min-w-0 min-h-screen flex-col bg-app-grid [overflow-x:clip]">
        {!isAuthScreen && <Navbar />}
        <main className="relative z-10 flex flex-col flex-grow min-h-0 min-w-0 [overflow-x:clip]">
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
              <Route path="services/:id" element={<ServiceDetailPage />} />
              <Route path="workers" element={<AdminWorkersPage />} />
              <Route path="clients" element={<AdminClientsPage />} />
              <Route path="tasks" element={<AdminTasksPage />} />
              <Route path="invoices" element={<AdminInvoicesPage />} />
              <Route path="domains" element={<AdminDomainsPage />} />
              <Route path="send-offer" element={<AdminSendOfferPage />} />
              <Route path="timesheets" element={<AdminTimesheetsPage />} />
              <Route path="comments" element={<AdminCommentsPage />} />
            </Route>

            {/* Admin area - legacy /admin/* redirects to Zulbera for admin; EraSphere role uses own dashboard */}
            <Route path="/admin" element={token && isAdminOrEraSphere ? <AdminLayout /> : <Navigate to="/login" />}>
              <Route index element={isEraSphere ? <Navigate to="/admin/erasphere-dashboard" replace /> : <Navigate to="/admin/zulbera/workers" replace />} />
              <Route path="workers" element={isAdmin ? <Navigate to="/admin/zulbera/workers" replace /> : <Navigate to="/admin/erasphere-dashboard" replace />} />
              <Route path="clients" element={isAdmin ? <Navigate to="/admin/zulbera/clients" replace /> : <EraSphereClientsPage />} />
              <Route path="tasks" element={isAdmin ? <Navigate to="/admin/zulbera/tasks" replace /> : <EraSphereTasksPage />} />
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

            {/* Notifications & Preferences - All authenticated users */}
            <Route
              path="/notifications"
              element={token ? <NotificationsPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/settings/notifications"
              element={token ? <NotificationPreferencesPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/settings/profile"
              element={token ? <ProfileSettingsPage /> : <Navigate to="/login" />}
            />
            <Route
              path="/settings/currency"
              element={token && isAdmin ? <CurrencySettingsPage /> : <Navigate to="/login" />}
            />

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
            
            {/* Public routes - no authentication required */}
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/invite/accept" element={<InviteAcceptPage />} />
            
            {/* Unknown route → branded 404 page (mascot). "Back to home" routes by role. */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        {!isAuthScreen && !hasOwnFooter && <Footer />}
      </div>
  );
}

function App() {
  return (
    <Router>
      <MobileMenuProvider>
        <Toaster position="top-right" />
        <AppShell />
      </MobileMenuProvider>
    </Router>
  );
}

export default App;