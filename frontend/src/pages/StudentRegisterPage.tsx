import { useRef, useState, type FormEvent, type PointerEvent, type MouseEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import studentApi from "../api/studentClient";
import { useStudentAuth } from "../auth/StudentAuthContext";
import { navigateWithAuthFlight } from "../auth/authRouteFlight";

type RegistrationForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

// CSS degiskenlerini React state'e yazmadan guncelle; her mouse hareketinde render yok.
function trackRegisterPointer(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
  const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
  event.currentTarget.style.setProperty("--register-mouse-x", `${x.toFixed(2)}%`);
  event.currentTarget.style.setProperty("--register-mouse-y", `${y.toFixed(2)}%`);
}

function resetRegisterPointer(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--register-mouse-x", "50%");
  event.currentTarget.style.setProperty("--register-mouse-y", "40%");
}

export default function StudentRegisterPage() {
  const navigate = useNavigate();
  const registerLogoRef = useRef<HTMLSpanElement>(null);
  const { isStudentAuthenticated } = useStudentAuth();
  const [form, setForm] = useState<RegistrationForm>({
    firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (isStudentAuthenticated) {
    return <Navigate to="/student/profile" replace />;
  }

  const goToLogin = (event: MouseEvent<HTMLAnchorElement>) => {
    // Cmd/Ctrl ve orta tus ile yeni sekme acma davranisini bozma.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    void navigateWithAuthFlight(
      navigate, "/login?role=student", registerLogoRef.current,
      ".notmark-auth-logo-frame"
    );
  };

  const update = (field: keyof RegistrationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setError("Ad ve soyad en az 2 karakter olmalıdır."); return;
    }
    if (form.password.length < 10 || !/[A-Z]/.test(form.password) ||
        !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      setError("Şifreniz en az 10 karakter, büyük harf, küçük harf ve rakam içermelidir."); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor."); return;
    }
    if (!confirmed) {
      setError("Devam etmek için bilgilerinizi onaylayın."); return;
    }

    setSubmitting(true);
    setError("");
    try {
      await studentApi.post("/auth/student/register", {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      await navigateWithAuthFlight(
        navigate, "/login?role=student&registered=1", registerLogoRef.current,
        ".notmark-auth-logo-frame", true
      );
    } catch (cause) {
      if (isAxiosError(cause)) {
        if (cause.response?.status === 409) {
          setError("Bu e-posta adresiyle bir hesap zaten bulunuyor.");
        } else if (cause.response?.status === 429) {
          setError("Çok sayıda kayıt denemesi yapıldı. Daha sonra yeniden deneyin.");
        } else if (!cause.response) {
          setError("Sunucuya ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyin.");
        } else {
          const message = cause.response?.data as { message?: string } | undefined;
          setError(message?.message ?? "Kayıt tamamlanamadı. Bilgilerinizi kontrol edin.");
        }
      } else {
        setError("Kayıt sırasında beklenmeyen bir sorun oluştu.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="notmark-register-page" onPointerMove={trackRegisterPointer} onPointerLeave={resetRegisterPointer}>
      <div className="notmark-register-shell">
        <header className="notmark-register-header">
          <Link className="notmark-register-brand" to="/login?role=student" onClick={goToLogin}>
            <span className="notmark-auth-logo-frame notmark-register-brand-frame" ref={registerLogoRef} aria-hidden="true">
              <span className="notmark-auth-logo-inner">
                <img src="/brand/notmark-auth-logo-v56.png" alt="" />
              </span>
            </span>
            <span>Not<b>Mark</b></span>
          </Link>
          <Link className="notmark-register-back" to="/login?role=student" onClick={goToLogin}><span aria-hidden="true">←</span> Giriş sayfasına dön</Link>
        </header>
        <section className="notmark-register-card" aria-labelledby="notmark-register-title">
          <span className="notmark-register-eyebrow">NOTMARK · ÖĞRENCİ ÜYELİĞİ</span>
          <h1 id="notmark-register-title">Hesap Oluştur</h1>
          <p className="notmark-register-intro">NotMark topluluğuna katılmak için aşağıdaki bilgileri doldurun. Öğrenci doğrulaması hesabınızı oluşturduktan sonra yapılır.</p>
          <div className="notmark-register-notice">
            E-posta adresi doğrulaması henüz etkin değil. Hesap kaydı ve akademik öğrenci doğrulaması farklı işlemlerdir.
          </div>
          <form onSubmit={handleSubmit}>
            <div className="notmark-register-grid">
              <label className="notmark-register-field">
                Ad
                <input name="given-name" autoComplete="given-name" required minLength={2} maxLength={40}
                  value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Adınız" />
              </label>
              <label className="notmark-register-field">
                Soyad
                <input name="family-name" autoComplete="family-name" required minLength={2} maxLength={40}
                  value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Soyadınız" />
              </label>
            </div>
            <label className="notmark-register-field">
              E-posta adresi
              <input name="email" type="email" autoComplete="email" required maxLength={160}
                value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="ornek@universite.edu.tr" />
            </label>
            <label className="notmark-register-field">
              Şifre
              <div className="notmark-register-password">
                <input name="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                  required minLength={10} maxLength={128} value={form.password}
                  onChange={(e) => update("password", e.target.value)} placeholder="Güçlü bir şifre belirleyin" />
                <button type="button" onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Şifreleri gizle" : "Şifreleri göster"}>
                  {showPassword ? "Gizle" : "Göster"}
                </button>
              </div>
              <span className="notmark-register-help">En az 10 karakter, büyük ve küçük harf, rakam.</span>
            </label>
            <label className="notmark-register-field">
              Şifre tekrarı
              <input name="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password"
                required minLength={10} maxLength={128} value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Şifrenizi yeniden yazın" />
            </label>
            <label className="notmark-register-confirm">
              <input type="checkbox" required checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>Hesap oluşturmak için verdiğim bilgilerin doğru olduğunu onaylıyorum.</span>
            </label>
            {error && <div className="notmark-register-error" role="alert">{error}</div>}
            <button className="notmark-register-submit" type="submit" disabled={submitting}>
              {submitting ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
            </button>
          </form>
          <p className="notmark-register-footnote">Zaten hesabınız var mı? <Link to="/login?role=student" onClick={goToLogin}>Giriş Yap</Link></p>
        </section>
      </div>
    </main>
  );
}
