import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  Navigate,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { isAxiosError } from "axios";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthContext";
import { useStudentAuth } from "../auth/StudentAuthContext";

type LoginRole = "student" | "admin";

function handlePointerMove(event: MouseEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;

  event.currentTarget.style.setProperty("--auth-mouse-x", `${x * 100}%`);
  event.currentTarget.style.setProperty("--auth-mouse-y", `${y * 100}%`);
  event.currentTarget.style.setProperty("--auth-rotate-x", `${(0.5 - y) * 3.2}deg`);
  event.currentTarget.style.setProperty("--auth-rotate-y", `${(x - 0.5) * 4}deg`);
}

function resetPointer(event: MouseEvent<HTMLDivElement>) {
  event.currentTarget.style.setProperty("--auth-mouse-x", "50%");
  event.currentTarget.style.setProperty("--auth-mouse-y", "50%");
  event.currentTarget.style.setProperty("--auth-rotate-x", "0deg");
  event.currentTarget.style.setProperty("--auth-rotate-y", "0deg");
}

export default function StudentLoginPage() {
  const { login: studentLogin, isStudentAuthenticated } = useStudentAuth();
  const { login: adminLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const role: LoginRole = searchParams.get("role") === "admin" ? "admin" : "student";
  const studentMode = role === "student";

  const emailInputRef = useRef<HTMLInputElement>(null);
  const [emailProvider, setEmailProvider] = useState<"gmail" | "icloud" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);


  const [roleTransitioning, setRoleTransitioning] = useState(false);
  const [financeBackdrop, setFinanceBackdrop] = useState(false);

  const [flight, setFlight] = useState<{
    size: number;
    start: string;
  } | null>(null);

  const leftLogoRef = useRef<HTMLDivElement>(null);
  const cardLogoRef = useRef<HTMLDivElement>(null);
  const flightRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const switchingRef = useRef(false);
  const mountedRef = useRef(true);
  const animationsRef = useRef<Animation[]>([]);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    mountedRef.current = true;

    const timers = timersRef.current;
    const animations = animationsRef.current;

    return () => {
      mountedRef.current = false;
      timers.forEach(window.clearTimeout);
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, ms);
      timersRef.current.push(timer);
    });

  const playFlight = async (
    from: string,
    to: string,
    duration: number
  ) => {
    const element = flightRef.current;

    if (!element) return;

    if (typeof element.animate !== "function") {
      element.style.transform = to;
      await delay(duration);
      return;
    }

    const animation = element.animate(
      [
        { transform: from },
        { transform: to }
      ],
      {
        duration,
        easing: "cubic-bezier(.45, 0, .20, 1)",
        fill: "forwards"
      }
    );

    animationsRef.current.push(animation);

    try {
      await animation.finished;
    } catch {
      // Sayfadan çıkılırsa animasyon iptal edilebilir.
    } finally {
      if (mountedRef.current) {
        element.style.transform = to;
      }

      animation.cancel();
    }
  };

  const getLogoRect = () => {
    const left =
      leftLogoRef.current?.getBoundingClientRect();

    if (left && left.width > 10 && left.height > 10) {
      return left;
    }

    const card =
      cardLogoRef.current?.getBoundingClientRect();

    return card && card.width > 10 ? card : null;
  };

  const rectTransform = (
    rect: DOMRect,
    size: number
  ) => {
    const x = rect.left + rect.width / 2 - size / 2;
    const y = rect.top + rect.height / 2 - size / 2;

    return (
      `translate3d(${x}px, ${y}px, 0) ` +
      `scale(${rect.width / size})`
    );
  };

  const chooseRole = async (next: LoginRole) => {
    if (
      next === role ||
      loading ||
      switchingRef.current
    ) return;

    switchingRef.current = true;

    const updateRole = () => {
      setSearchParams(
        { role: next },
        { replace: true }
      );

      setPassword("");
      setShowPassword(false);
      setError("");
      setNotice("");
      setEmailProvider(null);
    };

    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      updateRole();
      switchingRef.current = false;
      return;
    }

    const origin = getLogoRect();

    if (!origin) {
      updateRole();
      switchingRef.current = false;
      return;
    }

    // SVG buyuk boyutta render edilir.
    // Baslangicta kucuk olmasi transform ile saglanir.
    // Boylece kucuk bitmap buyutulmez.

    const size = Math.round(
      Math.min(
        264,
        Math.max(
          176,
          Math.min(
            window.innerWidth * .55,
            window.innerHeight * .42
          )
        )
      )
    );

    const from = rectTransform(origin, size);

    const center =
      `translate3d(${(window.innerWidth - size) / 2}px, ` +
      `${(window.innerHeight - size) / 2}px, 0) scale(1)`;

    setFlight({
      size,
      start: from
    });

    setRoleTransitioning(true);
    setFinanceBackdrop(true);

    try {
      // 1. Mevcut ekran yavasca kaybolur.

      await delay(340);

      if (!mountedRef.current) return;

      // 2. Logo merkeze buyuyerek ilerler.

      await playFlight(
        from,
        center,
        720
      );

      if (!mountedRef.current) return;

      // 3. Turuncu isik kucuk logoyla
      // ayni hizda tam bir tur doner.

      if (ringRef.current) {
        ringRef.current.style.animationPlayState =
          "running";
      }

      await delay(2000);

      if (!mountedRef.current) return;

      // 4. Ekran gizliyken yeni rol yuklenir.

      updateRole();

      await delay(55);

      if (!mountedRef.current) return;

      // 5. Logo kendi konumuna geri doner.

      const target = getLogoRect() ?? origin;

      setFinanceBackdrop(false);

      await playFlight(
        center,
        rectTransform(target, size),
        720
      );

      if (!mountedRef.current) return;

    } finally {
      if (mountedRef.current) {
        // 6. Yeni ekran yavasca belirir.

        setFlight(null);
        setFinanceBackdrop(false);
        setRoleTransitioning(false);

        await delay(900);

        switchingRef.current = false;
      }
    }
  };

  const chooseEmailProvider = (provider: "gmail" | "icloud") => {
    if (loading) return;
    setEmailProvider(provider);
    setError("");
    setNotice("");
    emailInputRef.current?.focus();
  };

  if (studentMode && isStudentAuthenticated) {
    return <Navigate to="/student/profile" replace />;
  }
  if (!studentMode && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || roleTransitioning) return;

    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (studentMode) {
        await studentLogin(email.trim(), password);
        navigate("/student/profile", { replace: true });
      } else {
        await adminLogin(email.trim(), password);
        navigate("/", { replace: true });
      }
    } catch (cause) {
      if (isAxiosError(cause) && !cause.response) {
        setError("Sunucuya ulaşılamıyor. İnternet bağlantınızı kontrol edip yeniden deneyin.");
      } else if (isAxiosError(cause) && cause.response?.status === 401) {
        setError("E-posta veya şifre hatalı.");
      } else {
        setError("Giriş tamamlanamadı. Lütfen yeniden deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`notmark-auth-page notmark-auth-page--${role} notmark-auth-page--unified notmark-auth-page--cinematic${roleTransitioning ? " is-role-switching" : ""}${financeBackdrop ? " is-finance-background" : ""}`}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointer}
    >
      <div className="notmark-auth-grid" />

      <section className="notmark-auth-visual">
        <div className="notmark-auth-visual__content">
          <div className="notmark-auth-brand">
            <div className="notmark-auth-logo-frame" ref={leftLogoRef}>
              <div className="notmark-auth-logo-inner">
                <img src="/brand/notmark-logo.png" alt="NotMark" />
              </div>
            </div>
            <div>
              <strong>Not<span>Mark</span></strong>
              <small>{studentMode ? "Öğrenci" : "Yönetim Merkezi"}</small>
            </div>
          </div>

          <div className="notmark-auth-eyebrow">
            {studentMode ? "NOTMARK / ÖĞRENCİ" : "NOTMARK / YÖNETİM"}
          </div>

          {studentMode ? (
            <>
              <h1>Notunu bul.<br />Bilgini paylaş.</h1>
              <p>
                Üniversitenize özel notlara, taleplere ve öğrenci topluluğuna
                tek bir güvenli hesap üzerinden erişin.
              </p>
            </>
          ) : (
            <>
              <h1>Bilgiyi değil,<br />güveni yönetin.</h1>
              <p>
                Öğrenci doğrulamalarından AI destekli not denetimine kadar
                tüm NotMark operasyonlarını tek merkezden yönetin.
              </p>
            </>
          )}

          <div className="notmark-auth-features">
            {studentMode ? (
              <>
                <article><span>01</span><strong>Talep oluştur</strong><p>İhtiyacınız olan notu topluluktan isteyin.</p></article>
                <article><span>02</span><strong>Not paylaş</strong><p>Bilginizi güvenli şekilde diğer öğrencilerle paylaşın.</p></article>
                <article><span>03</span><strong>Güvenli erişim</strong><p>Doğrulanmış öğrenci ekosisteminde ilerleyin.</p></article>
              </>
            ) : (
              <>
                <article><span>01</span><strong>Doğrulama</strong><p>Öğrenci ve akademik profilleri kontrollü yönetin.</p></article>
                <article><span>02</span><strong>AI Moderasyon</strong><p>İçerik kalitesi ve risk süreçlerini izleyin.</p></article>
                <article><span>03</span><strong>Denetlenebilirlik</strong><p>Yönetim kararlarını audit kayıtlarıyla takip edin.</p></article>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="notmark-auth-form-panel">
        <form className="notmark-auth-card" onSubmit={handleSubmit}>
          <div className="notmark-auth-card__top">
            <div className="notmark-auth-card-logo" ref={cardLogoRef}>
              <img src="/brand/notmark-logo.png" alt="" />
            </div>
            <div>
              <span>{studentMode ? "ÖĞRENCİ GİRİŞİ" : "YETKİLİ GİRİŞ"}</span>
              <small>{studentMode ? "NotMark hesabı" : "Admin Paneli"}</small>
            </div>
          </div>

          <h2>{studentMode ? "NotMark'a hoş geldiniz." : "Tekrar hoş geldiniz."}</h2>
          <p className="notmark-auth-card__description">
            {studentMode
              ? "Öğrenci hesabınıza giriş yaparak NotMark deneyiminize devam edin."
              : "NotMark yönetim merkezine yetkili hesabınızla giriş yapın."}
          </p>

          <div className="notmark-auth-role-switch" role="group" aria-label="Giriş türü">
            <button
              type="button"
              className={studentMode ? "is-active" : ""}
              aria-pressed={studentMode}
              onClick={() => chooseRole("student")}
              disabled={loading || roleTransitioning}
            >Öğrenci Girişi</button>
            <button
              type="button"
              className={!studentMode ? "is-active" : ""}
              aria-pressed={!studentMode}
              onClick={() => chooseRole("admin")}
              disabled={loading || roleTransitioning}
            >Yönetici Girişi</button>
          </div>

          <label className="notmark-auth-field">
            <span>E-posta</span>
            <input
              type="email"
              ref={emailInputRef}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder={studentMode
                ? emailProvider === "gmail"
                  ? "adiniz@gmail.com"
                  : emailProvider === "icloud"
                    ? "adiniz@icloud.com"
                    : "ogrenci@example.com"
                : "admin@notmark.com"}
              required
              maxLength={160}
              disabled={loading}
            />
          </label>

          <div className="notmark-auth-field">
            <label htmlFor="notmark-auth-password-input">Şifre</label>
            <div className="notmark-auth-password">
              <input
                id="notmark-auth-password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••••"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                disabled={loading}
              >{showPassword ? "Gizle" : "Göster"}</button>
            </div>
          </div>

          {error && <div className="notmark-auth-error" role="alert">{error}</div>}

          <button
            className="notmark-auth-submit"
            type="submit"
            disabled={loading}
          >
            <span>{loading ? "Giriş yapılıyor..." : "Giriş yap"}</span>
          </button>

          {studentMode ? (
            <div className="notmark-auth-extras">
              <div className="notmark-auth-divider"><span>veya</span></div>
              <div className="notmark-auth-providers">
                <button
                  type="button"
                  className={emailProvider === "gmail" ? "is-selected" : ""}
                  aria-pressed={emailProvider === "gmail"}
                  onClick={() => chooseEmailProvider("gmail")}
                  disabled={loading}
                  title="Gmail adresinizi NotMark hesabınız için kullanın"
                >
                  <span className="notmark-auth-provider-icon" aria-hidden="true">G</span>
                  <span>Gmail adresi</span>
                </button>
                <button
                  type="button"
                  className={emailProvider === "icloud" ? "is-selected" : ""}
                  aria-pressed={emailProvider === "icloud"}
                  onClick={() => chooseEmailProvider("icloud")}
                  disabled={loading}
                  title="iCloud e-posta adresinizi NotMark hesabınız için kullanın"
                >
                  <span className="notmark-auth-provider-icon" aria-hidden="true">@</span>
                  <span>iCloud adresi</span>
                </button>
              </div>
              <p className="notmark-auth-provider-help" role="status">
                {emailProvider === "gmail"
                  ? "Gmail adresinizi yazın. Google parolanızı değil, NotMark şifrenizi kullanın."
                  : emailProvider === "icloud"
                    ? "iCloud adresinizi yazın. Apple parolanızı değil, NotMark şifrenizi kullanın."
                    : "Gmail veya iCloud adresiyle kayıtlı NotMark hesabınızı kullanabilirsiniz."}
              </p>
              <p className="notmark-auth-register">
                Hesabınız yok mu?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setNotice("Yeni öğrenci kaydı için e-posta doğrulama altyapısı hazırlanıyor. Kayıt şu anda açık değil.");
                  }}
                >Hesap oluştur</button>
              </p>
              {notice && <p className="notmark-auth-notice" role="status">{notice}</p>}
            </div>
          ) : (
            <p className="notmark-auth-admin-hint">
              Yönetici hesapları yalnızca yetkilendirilmiş kullanıcılar içindir.
            </p>
          )}

          <div className="notmark-auth-security">
            {studentMode ? "Doğrulanmış öğrenci erişimi" : "Güvenli yönetim erişimi"}
            <span />
            NotMark
          </div>
        </form>
      </section>

      {flight && createPortal(
        <div
          className="notmark-auth-cinematic-logo"
          ref={flightRef}
          aria-hidden="true"
          style={{
            width: flight.size,
            height: flight.size,
            transform: flight.start
          }}
        >
          <div
            className="notmark-auth-cinematic-ring"
            ref={ringRef}
          />

          <div className="notmark-auth-cinematic-inner">
            <img src="/brand/notmark-logo.png" alt="" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
