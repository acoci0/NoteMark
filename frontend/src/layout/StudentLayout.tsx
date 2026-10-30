import {
  BookOpen,
  PauseCircle,
  ChevronDown,
  FileText,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  ShoppingBag,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  useEffect,
  useRef,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";

import {
  useStudentAuth,
} from "../auth/StudentAuthContext";


import {
  useStudentAppearance,
} from "../auth/StudentAppearanceContext";

import StudentNotificationCenter from "../components/StudentNotificationCenter";

export default function StudentLayout() {
  const location = useLocation();

  const pointerGlowRef =
    useRef<HTMLDivElement | null>(null);

  const {
    student,
    logout,
  } = useStudentAuth();

  const {
    resolvedTheme,
    accent,
    motion,
  } = useStudentAppearance();


  /*
   * NOTMARK GLOBAL POINTER GLOW V23
   *
   * Tek event listener sistemi.
   * React state güncellemesi yok.
   * GPU transform kullanılır.
   * Kare başına en fazla bir DOM güncellemesi.
   */

  useEffect(() => {
    const glow = pointerGlowRef.current;
    const main = glow?.parentElement;

    if (!glow || !main || motion === "off") {
      return;
    }

    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    );

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (!finePointer.matches) {
      return;
    }

    let frame: number | null = null;

    let targetX = 0;
    let targetY = 0;

    let currentX = 0;
    let currentY = 0;

    let hasPosition = false;
    let visible = false;

    /*
     * Sadece transform değiştirilir.
     * top, left ve background güncellenmez.
     */

    const render = () => {
      frame = null;

      const factor =
        motion === "reduced" ||
        reducedMotion.matches
          ? 1
          : 0.28;

      const deltaX =
        targetX - currentX;

      const deltaY =
        targetY - currentY;

      currentX += deltaX * factor;
      currentY += deltaY * factor;

      glow.style.transform =
        `translate3d(${currentX}px, ${currentY}px, 0) ` +
        "translate3d(-50%, -50%, 0)";

      /*
       * Hedefe ulaşınca RAF durur.
       * Gereksiz sürekli animasyon yoktur.
       */

      if (
        Math.abs(targetX - currentX) > 0.4 ||
        Math.abs(targetY - currentY) > 0.4
      ) {
        frame = window.requestAnimationFrame(
          render
        );
      }
    };

    const handlePointerMove = (
      event: PointerEvent
    ) => {
      if (
        event.pointerType !== "mouse" ||
        !finePointer.matches
      ) {
        return;
      }

      targetX = event.clientX;
      targetY = event.clientY;

      /*
       * İlk hareket sırasında ışık doğrudan
       * imleç konumunda oluşturulur.
       */

      if (!hasPosition) {
        currentX = targetX;
        currentY = targetY;

        hasPosition = true;
      }

      if (!visible) {
        visible = true;
        glow.style.opacity = "1";
      }

      /*
       * Aynı karede ikinci RAF oluşturulmaz.
       */

      if (frame === null) {
        frame = window.requestAnimationFrame(
          render
        );
      }
    };

    const stopGlow = () => {
      visible = false;
      hasPosition = false;

      glow.style.opacity = "0";

      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    };

    main.addEventListener(
      "pointermove",
      handlePointerMove,
      { passive: true }
    );

    main.addEventListener(
      "pointerleave",
      stopGlow
    );

    main.addEventListener(
      "pointercancel",
      stopGlow
    );

    window.addEventListener(
      "blur",
      stopGlow
    );

    return () => {
      stopGlow();

      main.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      main.removeEventListener(
        "pointerleave",
        stopGlow
      );

      main.removeEventListener(
        "pointercancel",
        stopGlow
      );

      window.removeEventListener(
        "blur",
        stopGlow
      );
    };
  }, [motion]);

  const panoActive =
    location.pathname.startsWith(
      "/student/marketplace"
    ) ||
    (
      location.pathname.startsWith(
        "/student/note-requests"
      ) &&
      !location.pathname.startsWith(
        "/student/note-requests/new"
      )
    ) ||
    location.pathname.startsWith(
      "/student/note-submissions"
    ) ||
    location.pathname.startsWith(
      "/student/purchases"
    );

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
    <div
      className="student-app-shell"
      data-theme={resolvedTheme}
      data-accent={accent}
      data-motion={motion}
    >
      <header className="student-appbar">
        <div className="student-appbar__inner">
          <NavLink
            to="/student/profile"
            className="student-brand"
          >
            <div className="student-brand__mark">
              <img
                src="/brand/notmark-logo.png"
                alt="NotMark"
                className="notmark-logo-img"
              />
            </div>

            <div className="student-brand__text">
              <strong className="student-brand__name">
                Not<span>Mark</span>
              </strong>

              <span className="student-brand__subtitle">
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

            <div
              className={
                panoActive
                  ? "student-nav-menu student-nav-menu--active"
                  : "student-nav-menu"
              }
            >
              <button
                type="button"
                className={
                  panoActive
                    ? "student-nav-link student-nav-link--active student-nav-menu__trigger"
                    : "student-nav-link student-nav-menu__trigger"
                }
                aria-haspopup="true"
              >
                <LayoutGrid size={17} />

                Pano

                <ChevronDown
                  size={14}
                  className="student-nav-menu__chevron"
                />
              </button>

              <div className="student-nav-menu__dropdown">
                <NavLink
                  to="/student/marketplace"
                  end
                  className={({ isActive }) =>
                    isActive
                      ? "student-nav-menu__item student-nav-menu__item--active"
                      : "student-nav-menu__item"
                  }
                >
                  <LayoutGrid size={17} />
                  <span>Talep Panosu</span>
                </NavLink>

                <NavLink
                  to="/student/note-requests"
                  end
                  className={({ isActive }) =>
                    isActive
                      ? "student-nav-menu__item student-nav-menu__item--active"
                      : "student-nav-menu__item"
                  }
                >
                  <BookOpen size={17} />
                  <span>Taleplerim</span>
                </NavLink>

                <NavLink
                  to="/student/note-requests/paused"
                  end
                  className={({ isActive }) =>
                    isActive
                      ? "student-nav-menu__item student-nav-menu__item--active"
                      : "student-nav-menu__item"
                  }
                >
                  <PauseCircle size={17} />
                  <span>Beklemeye Aldıklarım</span>
                </NavLink>

                <NavLink
                  to="/student/note-submissions"
                  end
                  className={({ isActive }) =>
                    isActive
                      ? "student-nav-menu__item student-nav-menu__item--active"
                      : "student-nav-menu__item"
                  }
                >
                  <FileText size={17} />
                  <span>Gönderdiğim Notlar</span>
                </NavLink>

                <NavLink
                  to="/student/purchases"
                  end
                  className={({ isActive }) =>
                    isActive
                      ? "student-nav-menu__item student-nav-menu__item--active"
                      : "student-nav-menu__item"
                  }
                >
                  <ShoppingBag size={17} />
                  <span>Aldığım Notlar</span>
                </NavLink>
              </div>
            </div>

            <NavLink
              to="/student/earnings"
              end
              className={
                getNavClassName
              }
            >
              <WalletCards size={17} />

              Finans
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
            <StudentNotificationCenter
              key={student?.id ?? "anonymous"}
              studentId={student?.id ?? ""}
            />

            <NavLink
              to="/student/profile"
              className="student-account-chip"
              title="Hesabıma git"
            >
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
            </NavLink>

            <NavLink
              to="/student/settings"
              className={({ isActive }) =>
                isActive
                  ? "student-settings-button student-settings-button--active"
                  : "student-settings-button"
              }
              title="Ayarlar"
              aria-label="Ayarlar"
            >
              <Settings size={18} />
            </NavLink>

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
        <div
          ref={pointerGlowRef}
          className="notmark-global-pointer-glow"
          aria-hidden="true"
        />

        <div
          key={location.pathname}
          className="student-route-transition"
        >
          <Outlet />
        </div>
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
