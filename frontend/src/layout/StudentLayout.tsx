import {
  BookOpen,
  FileText,
  LayoutGrid,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";

import {
  NavLink,
  Outlet,
} from "react-router-dom";

import {
  useStudentAuth,
} from "../auth/StudentAuthContext";

export default function StudentLayout() {
  const {
    student,
    logout,
  } = useStudentAuth();

  const initials =
    student?.displayName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("") || "Ö";

  return (
    <div className="student-app-shell">
      <header className="student-appbar">
        <div className="student-appbar__inner">
          <NavLink
            to="/student/profile"
            className="student-brand"
          >
            <div className="student-brand__mark">
              N
            </div>

            <div>
              <strong>
                NotMark
              </strong>

              <span>
                Öğrenci
              </span>
            </div>
          </NavLink>

          <nav
            className="student-main-nav"
            aria-label="Öğrenci menüsü"
          >
            <NavLink
              to="/student/profile"
              end
              className={
                getNavClassName
              }
            >
              <UserRound size={17} />

              Hesabım
            </NavLink>

            <NavLink
              to="/student/marketplace"
              end
              className={
                getNavClassName
              }
            >
              <LayoutGrid size={17} />

              Talep Panosu
            </NavLink>

            <NavLink
              to="/student/note-requests"
              end
              className={
                getNavClassName
              }
            >
              <BookOpen size={17} />

              Taleplerim
            </NavLink>

            <NavLink
              to="/student/note-submissions"
              end
              className={
                getNavClassName
              }
            >
              <FileText size={17} />

              Gönderdiğim Notlar
            </NavLink>

            <NavLink
              to="/student/note-requests/new"
              end
              className={
                getNavClassName
              }
            >
              <Plus size={17} />

              Not İste
            </NavLink>
          </nav>

          <div className="student-account-area">
            <div className="student-account-chip">
              <div className="student-account-chip__avatar">
                {initials}
              </div>

              <div className="student-account-chip__text">
                <strong>
                  {student?.displayName}
                </strong>

                <span>
                  Öğrenci hesabı
                </span>
              </div>
            </div>

            <button
              className="student-logout-button"
              type="button"
              onClick={logout}
              title="Çıkış yap"
              aria-label="Çıkış yap"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="student-app-content">
        <Outlet />
      </main>
    </div>
  );
}

function getNavClassName({
  isActive,
}: {
  isActive: boolean;
}) {
  return isActive
    ? "student-nav-link student-nav-link--active"
    : "student-nav-link";
}
