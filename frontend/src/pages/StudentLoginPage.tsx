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
  useStudentAuth,
} from "../auth/StudentAuthContext";

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

export default function StudentLoginPage() {
  const {
    login,
    isStudentAuthenticated,
  } = useStudentAuth();

  const navigate =
    useNavigate();

  const [
    email,
    setEmail,
  ] = useState(
    "ayse@example.com"
  );

  const [
    password,
    setPassword,
  ] = useState(
    "Student123!"
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  if (isStudentAuthenticated) {
    return (
      <Navigate
        to="/student/profile"
        replace
      />
    );
  }

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(
        email,
        password
      );

      navigate(
        "/student/profile"
      );
    } catch {
      setError(
        "Giriş başarısız. Bilgilerinizi kontrol edin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="notmark-auth-page notmark-auth-page--student"
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
                Öğrenci
              </small>
            </div>
          </div>

          <div className="notmark-auth-eyebrow">
            NOTMARK / ÖĞRENCİ
          </div>

          <h1>
            Notunu bul.
            <br />
            Bilgini paylaş.
          </h1>

          <p>
            Üniversitenize özel notlara,
            taleplere ve öğrenci
            topluluğuna tek bir güvenli
            hesap üzerinden erişin.
          </p>

          <div className="notmark-auth-features">
            <article>
              <span>01</span>
              <strong>
                Talep oluştur
              </strong>
              <p>
                İhtiyacınız olan notu
                topluluktan isteyin.
              </p>
            </article>

            <article>
              <span>02</span>
              <strong>
                Not paylaş
              </strong>
              <p>
                Bilginizi güvenli şekilde
                diğer öğrencilerle paylaşın.
              </p>
            </article>

            <article>
              <span>03</span>
              <strong>
                Güvenli erişim
              </strong>
              <p>
                Doğrulanmış öğrenci
                ekosisteminde ilerleyin.
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
                ÖĞRENCİ GİRİŞİ
              </span>

              <small>
                NotMark hesabı
              </small>
            </div>
          </div>

          <h2>
            NotMark'a hoş geldiniz.
          </h2>

          <p className="notmark-auth-card__description">
            Öğrenci hesabınıza giriş yaparak
            NotMark deneyiminize devam edin.
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
              placeholder="ogrenci@example.com"
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
            disabled={loading}
          >
            <span>
              {loading
                ? "Giriş yapılıyor..."
                : "Giriş yap"}
            </span>
          </button>

          <div className="notmark-auth-security">
            Doğrulanmış öğrenci erişimi
            <span />
            NotMark
          </div>
        </form>
      </section>
    </div>
  );
}
