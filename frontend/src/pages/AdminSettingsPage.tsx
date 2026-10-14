import {
  Monitor,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";

import {
  useAdminAppearance,
  type AdminTheme,
} from "../auth/AdminAppearanceContext";

const themeOptions: Array<{
  value: AdminTheme;
  title: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    title: "Açık",
    description:
      "Aydınlık yönetim arayüzü.",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Koyu",
    description:
      "Düşük ışıkta daha rahat kullanım.",
    icon: Moon,
  },
  {
    value: "system",
    title: "Sistem",
    description:
      "Mac'inizin tema ayarını otomatik izler.",
    icon: Monitor,
  },
];

export default function AdminSettingsPage() {
  const {
    theme,
    resolvedTheme,
    setTheme,
    resetAppearance,
  } =
    useAdminAppearance();

  return (
    <div className="admin-settings-page">
      <div className="page-heading">
        <div>
          <span className="section-kicker">
            Yönetim tercihleri
          </span>

          <h1>
            Ayarlar
          </h1>

          <p>
            Yönetim panelinin görünümünü
            çalışma ortamınıza göre
            özelleştirin.
          </p>
        </div>
      </div>

      <section className="admin-settings-panel">
        <div className="admin-settings-panel__heading">
          <div>
            <span className="admin-settings-panel__kicker">
              GÖRÜNÜM
            </span>

            <h2>
              Panel teması
            </h2>

            <p>
              Tema tercihiniz yalnızca
              bu tarayıcıda saklanır.
              NotMark yönetim rengi
              turuncu olarak sabit kalır.
            </p>
          </div>

          <div className="admin-settings-current">
            <span>
              Aktif görünüm
            </span>

            <strong>
              {resolvedTheme === "dark"
                ? "Koyu"
                : "Açık"}
            </strong>
          </div>
        </div>

        <div className="admin-theme-options">
          {themeOptions.map(
            ({
              value,
              title,
              description,
              icon: Icon,
            }) => {
              const selected =
                theme === value;

              return (
                <button
                  key={value}
                  type="button"
                  className={
                    selected
                      ? "admin-theme-option admin-theme-option--selected"
                      : "admin-theme-option"
                  }
                  onClick={() =>
                    setTheme(value)
                  }
                  aria-pressed={
                    selected
                  }
                >
                  <div className="admin-theme-option__icon">
                    <Icon size={21} />
                  </div>

                  <div>
                    <strong>
                      {title}
                    </strong>

                    <span>
                      {description}
                    </span>
                  </div>

                  <div
                    className={
                      selected
                        ? "admin-theme-option__check admin-theme-option__check--selected"
                        : "admin-theme-option__check"
                    }
                  />
                </button>
              );
            }
          )}
        </div>

        <div className="admin-settings-footer">
          <span>
            Değişiklikler otomatik
            kaydedilir.
          </span>

          <button
            className="secondary-button"
            type="button"
            onClick={
              resetAppearance
            }
          >
            <RotateCcw size={16} />

            Varsayılana dön
          </button>
        </div>
      </section>
    </div>
  );
}
