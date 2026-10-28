import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import SiteVisitTracker from "./components/SiteVisitTracker";
import StudentProtectedRoute from "./components/StudentProtectedRoute";

import AdminLayout from "./layout/AdminLayout";
import StudentLayout from "./layout/StudentLayout";

import DashboardPage from "./pages/DashboardPage";
import NotesPage from "./pages/NotesPage";
import AdminNoteDetailPage from "./pages/AdminNoteDetailPage";
import ReportsPage from "./pages/ReportsPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminAuditLogsPage from "./pages/AdminAuditLogsPage";
import StudentLoginPage from "./pages/StudentLoginPage";
import StudentRegisterPage from "./pages/StudentRegisterPage";
import StudentMarketplacePage from "./pages/StudentMarketplacePage";
import StudentNoteRequestPage from "./pages/StudentNoteRequestPage";
import StudentNoteRequestsPage from "./pages/StudentNoteRequestsPage";
import StudentNoteSubmissionsPage from "./pages/StudentNoteSubmissionsPage";
import StudentProfilePage from "./pages/StudentProfilePage";
import StudentSettingsPage from "./pages/StudentSettingsPage";
import StudentEarningsPage from "./pages/StudentEarningsPage";
import StudentPurchasesPage from "./pages/StudentPurchasesPage";
import UsersPage from "./pages/UsersPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import VerificationsPage from "./pages/VerificationsPage";
import AdminComplaintsPage from "./pages/AdminComplaintsPage";

export default function App() {
  return (
    <>
      <SiteVisitTracker />
      <Routes>
      {/* ========================= */}
      {/* ÖĞRENCİ TARAFI            */}
      {/* ========================= */}

      <Route
        path="/student/login"
        element={<Navigate to="/login?role=student" replace />}
      />

      <Route
        element={<StudentProtectedRoute />}
      >
        <Route
          element={<StudentLayout />}
        >
          <Route
            path="/student/profile"
            element={<StudentProfilePage />}
          />

          <Route
            path="/student/marketplace"
            element={<StudentMarketplacePage />}
          />

          <Route
            path="/student/note-requests"
            element={<StudentNoteRequestsPage />}
          />

          <Route
            path="/student/note-submissions"
            element={<StudentNoteSubmissionsPage />}
          />

          <Route
            path="/student/note-requests/new"
            element={<StudentNoteRequestPage />}
          />


          <Route
            path="/student/earnings"
            element={<StudentEarningsPage />}
          />

          <Route
            path="/student/purchases"
            element={<StudentPurchasesPage />}
          />

          <Route
            path="/student/settings"
            element={<StudentSettingsPage />}
          />
        </Route>
      </Route>

      {/* ========================= */}
      {/* ADMIN TARAFI              */}
      {/* ========================= */}

      <Route
        path="/login"
        element={<StudentLoginPage />}
      />
      <Route
        path="/register"
        element={<StudentRegisterPage />}
      />

      <Route
        element={<ProtectedRoute />}
      >
        <Route
          element={<AdminLayout />}
        >
          <Route
            index
            element={<DashboardPage />}
          />

          <Route
            path="users"
            element={<UsersPage />}
          />


          <Route
            path="users/:id"
            element={<AdminUserDetailPage />}
          />

          <Route
            path="verifications"
            element={<VerificationsPage />}
          />

          <Route
            path="notes"
            element={<NotesPage />}
          />

          <Route
            path="notes/:id"
            element={<AdminNoteDetailPage />}
          />

          <Route
            path="reports"
            element={<ReportsPage />}
          />

          <Route
            path="audit-logs"
            element={<AdminAuditLogsPage />}
          />

          <Route
            path="complaints"
            element={<AdminComplaintsPage />}
          />

          <Route
            path="settings"
            element={<AdminSettingsPage />}
          />
        </Route>
      </Route>

      {/* ========================= */}
      {/* BİLİNMEYEN ADRESLER       */}
      {/* ========================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
      </Routes>
    </>
  );
}
