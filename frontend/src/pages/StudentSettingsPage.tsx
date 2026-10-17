import {
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Zap,
  ZapOff,
} from "lucide-react";

import {
  useStudentAppearance,
  type StudentAccent,
  type StudentMotion,
  type StudentTheme,
} from "../auth/StudentAppearanceContext";

const themes: {
  value: StudentTheme;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: "light",
    label: "Açık",
    description:
      "Aydınlık ve temiz görünüm.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Koyu",
    description:
      "Düşük ışık için koyu arayüz.",
    icon: Moon,
  },
  {
    value: "system",
    label: "Sistem",
    description:
      "Cihaz ayarını otomatik kullanır.",
    icon: Monitor,
  },
];

const accents: {
  value: StudentAccent;
  label: string;
}[] = [
  {
    value: "yellow",
    label: "Sarı",
  },
  {
    value: "purple",
    label: "Mor",
  },
  {
    value: "blue",
    label: "Mavi",
  },
  {
    value: "green",
    label: "Yeşil",
  },
];

const motions: {
  value: StudentMotion;
  label: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    value: "full",
    label: "Açık",
    description:
      "Tüm geçiş ve hover efektlerini kullan.",
    icon: Sparkles,
  },
  {
    value: "reduced",
    label: "Azaltılmış",
    description:
      "Daha sakin ve minimal hareket.",
    icon: Zap,
  },
  {
    value: "off",
    label: "Kapalı",
    description:
      "Arayüz animasyonlarını devre dışı bırak.",
    icon: ZapOff,
  },
];

export default function StudentSettingsPage() {
  const {
    theme,
    accent,
    motion,
    resolvedTheme,
    setTheme,
    setAccent,
    setMotion,
    resetAppearance,
  } = useStudentAppearance();

  return (
    <div className="student-settings-page">
      <header className="student-settings-header">
        <div>
          <span className="section-kicker">
            NOTMARK AYARLARI
          </span>

          <h1>
            Görünüm
          </h1>

          <p>
            NotMark arayüzünü kullanım
            alışkanlıklarınıza göre
            kişiselleştirin.
          </p>
        </div>

        <div className="student-settings-status">
          <span>
            Aktif görünüm
          </span>

          <strong>
            {resolvedTheme === "dark"
              ? "Koyu"
              : "Açık"}
          </strong>
        </div>
      </header>

      <div className="student-settings-grid">
        <section className="student-settings-panel">
          <div className="student-settings-panel__heading">
            <div className="student-settings-icon">
              <Sun size={20} />
            </div>

            <div>
              <h2>
                Tema
              </h2>

              <p>
                Arayüzün genel ışık
                seviyesini belirleyin.
              </p>
            </div>
          </div>

          <div className="student-setting-options student-setting-options--three">
            {themes.map(
              ({
                value,
                label,
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
                        ? "student-setting-option student-setting-option--active"
                        : "student-setting-option"
                    }
                    aria-pressed={
                      selected
                    }
                    onClick={() =>
                      setTheme(value)
                    }
                  >
                    <span className="student-setting-option__icon">
                      <Icon size={20} />
                    </span>

                    <strong>
                      {label}
                    </strong>

                    <small>
                      {description}
                    </small>

                    {selected && (
                      <span className="student-setting-option__check">
                        <Check
                          size={14}
                        />
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="student-settings-panel">
          <div className="student-settings-panel__heading">
            <div className="student-settings-icon">
              <Palette size={20} />
            </div>

            <div>
              <h2>
                Vurgu rengi
              </h2>

              <p>
                Aktif menüler, butonlar
                ve görsel vurgular için
                ana rengi seçin.
              </p>
            </div>
          </div>

          <div className="student-accent-options">
            {accents.map(
              ({
                value,
                label,
              }) => {
                const selected =
                  accent === value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={
                      selected
                        ? `student-accent-option student-accent-option--${value} student-accent-option--active`
                        : `student-accent-option student-accent-option--${value}`
                    }
                    aria-pressed={
                      selected
                    }
                    onClick={() =>
                      setAccent(value)
                    }
                  >
                    <span className="student-accent-swatch">
                      {selected && (
                        <Check
                          size={17}
                        />
                      )}
                    </span>

                    <strong>
                      {label}
                    </strong>
                  </button>
                );
              }
            )}
          </div>
        </section>

        <section className="student-settings-panel">
          <div className="student-settings-panel__heading">
            <div className="student-settings-icon">
              <Sparkles size={20} />
            </div>

            <div>
              <h2>
                Animasyon
              </h2>

              <p>
                Buton ve kart hareketlerinin
                seviyesini belirleyin.
              </p>
            </div>
          </div>

          <div className="student-setting-options student-setting-options--three">
            {motions.map(
              ({
                value,
                label,
                description,
                icon: Icon,
              }) => {
                const selected =
                  motion === value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={
                      selected
                        ? "student-setting-option student-setting-option--active"
                        : "student-setting-option"
                    }
                    aria-pressed={
                      selected
                    }
                    onClick={() =>
                      setMotion(value)
                    }
                  >
                    <span className="student-setting-option__icon">
                      <Icon size={20} />
                    </span>

                    <strong>
                      {label}
                    </strong>

                    <small>
                      {description}
                    </small>

                    {selected && (
                      <span className="student-setting-option__check">
                        <Check
                          size={14}
                        />
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>
        </section>

        <div className="student-settings-footer">
          <div>
            <strong>
              Otomatik kaydediliyor
            </strong>

            <span>
              Değişiklikler bu cihazda
              anında saklanır.
            </span>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={
              resetAppearance
            }
          >
            <RotateCcw size={16} />
            Varsayılana dön
          </button>
        </div>
      </div>
    </div>
  );
}
