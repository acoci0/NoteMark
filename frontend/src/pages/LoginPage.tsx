import {
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../auth/AuthContext";

function handlePointerMove(
  event: MouseEvent<HTMLDivElement>
) {
  const rect =
    event.currentTarget.getBoundingClientRect();

  const x =
    (event.clientX - rect.left) /
    rect.width;

  const y =
    (event.clientY - rect.top) /
    rect.height;

  event.currentTarget.style.setProperty(
    "--auth-mouse-x",
    `${x * 100}%`
  );

  event.currentTarget.style.setProperty(
    "--auth-mouse-y",
    `${y * 100}%`
  );

  event.currentTarget.style.setProperty(
    "--auth-rotate-x",
    `${(0.5 - y) * 3.2}deg`
  );

  event.currentTarget.style.setProperty(
    "--auth-rotate-y",
    `${(x - 0.5) * 4}deg`
  );
}

function resetPointer(
  event: MouseEvent<HTMLDivElement>
) {
  event.currentTarget.style.setProperty(
    "--auth-mouse-x",
    "50%"
  );

  event.currentTarget.style.setProperty(
    "--auth-mouse-y",
    "50%"
  );

  event.currentTarget.style.setProperty(
    "--auth-rotate-x",
    "0deg"
  );

  event.currentTarget.style.setProperty(
    "--auth-rotate-y",
    "0deg"
  );
}

export default function LoginPage() {
  const {
    isAuthenticated,
    login,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  if (isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      await login(
        email,
        password
      );

      navigate("/");
    } catch {
      setError(
        "Giriş başarısız. Bilgilerinizi kontrol edin."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="notmark-auth-page notmark-auth-page--admin"
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointer}
    >
      <div className="notmark-auth-grid" />

      <section className="notmark-auth-visual">
        <div className="notmark-auth-visual__content">
          <div className="notmark-auth-brand">
            <div className="notmark-auth-logo-frame">
              <div className="notmark-auth-logo-inner">
                <img
                  src="/brand/notmark-logo.png"
                  alt="NotMark"
                />
              </div>
            </div>

            <div>
              <strong>
                Not<span>Mark</span>
              </strong>

              <small>
                Yönetim Merkezi
              </small>
            </div>
          </div>

          <div className="notmark-auth-eyebrow">
            NOTMARK / ADMIN
          </div>

          <h1>
            Bilgiyi değil,
            <br />
            güveni yönetin.
          </h1>

          <p>
            Öğrenci doğrulamalarından
            AI destekli not denetimine kadar
            tüm NotMark operasyonlarını
            tek merkezden yönetin.
          </p>

          <div className="notmark-auth-features">
            <article>
              <span>01</span>
              <strong>
                Doğrulama
              </strong>
              <p>
                Öğrenci ve akademik
                profilleri kontrollü yönetin.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>
                AI Moderasyon
              </strong>
              <p>
                İçerik kalitesi ve
                risk süreçlerini izleyin.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>
                Denetlenebilirlik
              </strong>
              <p>
                Yönetim kararlarını
                audit kayıtlarıyla takip edin.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="notmark-auth-form-panel">
        <form
          className="notmark-auth-card"
          onSubmit={handleSubmit}
        >
          <div className="notmark-auth-card__top">
            <div className="notmark-auth-card-logo">
              <img
                src="/brand/notmark-logo.png"
                alt=""
              />
            </div>

            <div>
              <span>
                YETKİLİ GİRİŞ
              </span>

              <small>
                Admin Paneli
              </small>
            </div>
          </div>

          <h2>
            Tekrar hoş geldiniz.
          </h2>

          <p className="notmark-auth-card__description">
            NotMark yönetim merkezine
            yetkili hesabınızla giriş yapın.
          </p>

          <label className="notmark-auth-field">
            <span>
              E-posta
            </span>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              autoComplete="username"
              placeholder="admin@notmark.com"
              required
            />
          </label>

          <label className="notmark-auth-field">
            <span>
              Şifre
            </span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              autoComplete="current-password"
              placeholder="••••••••••"
              required
            />
          </label>

          {error && (
            <div className="notmark-auth-error">
              {error}
            </div>
          )}

          <button
            className="notmark-auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            <span>
              {isSubmitting
                ? "Giriş yapılıyor..."
                : "Giriş yap"}
            </span>
          </button>

          <div className="notmark-auth-security">
            Güvenli yönetim erişimi
            <span />
            NotMark
          </div>
        </form>
      </section>
    </div>
  );
}
