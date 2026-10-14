import {
  BarChart3,
  BookCheck,
  FileBadge2,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  Users,
  MessageSquareWarning,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAdminAppearance } from "../auth/AdminAppearanceContext";
import AdminNotificationCenter from "../components/AdminNotificationCenter";

const menu = [
  { to: "/", label: "Panel", icon: LayoutDashboard },
  { to: "/users", label: "Kullanıcılar", icon: Users },
  {
    to: "/verifications",
    label: "Öğrenci Doğrulamaları",
    icon: FileBadge2
  },
  { to: "/notes", label: "Not Kontrolü", icon: BookCheck },
  { to: "/reports", label: "Raporlar", icon: BarChart3 },
  {
    to: "/complaints",
    label: "Şikâyetler / İtirazlar",
    icon: MessageSquareWarning,
  },
  {
    to: "/audit-logs",
    label: "İşlem Kayıtları",
    icon: ScrollText
  },
  { to: "/settings", label: "Ayarlar", icon: Settings }
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();

  const {
    resolvedTheme,
  } = useAdminAppearance();

  const initials =
    admin?.displayName
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part[0]?.toUpperCase()
      )
      .join("") || "A";

  return (
    <div
      className="app-shell admin-app-shell"
      data-theme={resolvedTheme}
    >
      <aside className="sidebar">
        <div className="brand admin-brand">
          <div className="brand__mark admin-brand__mark">
            <img
              src="/brand/notmark-logo.png"
              alt="NotMark"
            />
          </div>

          <div className="admin-brand__text">
            <strong className="admin-brand__name">
              Not<span>Mark</span>
            </strong>

            <small>
              YÖNETİM
            </small>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Ana menü">
          {menu.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                isActive ? "nav-item nav-item--active" : "nav-item"
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="logout-button" type="button" onClick={logout}>
          <LogOut size={18} />
          Çıkış yap
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="topbar__eyebrow">Yönetim merkezi</span>
            <strong>Operasyon ve moderasyon paneli</strong>
          </div>

          <div className="admin-topbar-actions">
            <AdminNotificationCenter />

            <div className="admin-chip">
              <div className="admin-chip__avatar">
                {initials}
              </div>

              <div>
                <strong>{admin?.displayName}</strong>
                <span>{admin?.email}</span>
              </div>
            </div>
          </div>
        </header>

        <section className="page-content">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
