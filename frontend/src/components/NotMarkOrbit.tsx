import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type OrbitRole = "student" | "admin";

type NotMarkOrbitProps = {
  role: OrbitRole;
};

const studentItems = [
  {
    id: "notes",
    label: "Not paylaşımı",
    Icon: BookOpen,
  },
  {
    id: "pdf",
    label: "PDF notları",
    Icon: FileText,
  },
  {
    id: "academic",
    label: "Akademik erişim",
    Icon: GraduationCap,
  },
];

const adminItems = [
  {
    id: "verification",
    label: "Doğrulama",
    Icon: ShieldCheck,
  },
  {
    id: "moderation",
    label: "Moderasyon",
    Icon: ClipboardCheck,
  },
  {
    id: "analytics",
    label: "Analitik",
    Icon: BarChart3,
  },
];

export default function NotMarkOrbit({
  role,
}: NotMarkOrbitProps) {
  const studentMode = role === "student";

  const items = studentMode
    ? studentItems
    : adminItems;

  return (
    <section
      className={`nm-orbit-showcase nm-orbit-showcase--${role}`}
      aria-label={
        studentMode
          ? "NotMark öğrenci ekosistemi"
          : "NotMark yönetim ekosistemi"
      }
    >
      <div className="nm-orbit__eyebrow">
        <span className="nm-orbit__live-dot" />
        <span>
          {studentMode
            ? "AKADEMİK EKOSİSTEM"
            : "YÖNETİM MERKEZİ"}
        </span>
      </div>

      <div className="nm-orbit__scene" aria-hidden="true">
        <div className="nm-orbit__ambient" />

        <div className="nm-orbit__ring nm-orbit__ring--one" />
        <div className="nm-orbit__ring nm-orbit__ring--two" />
        <div className="nm-orbit__ring nm-orbit__ring--three" />

        <div className="nm-orbit__crosshair nm-orbit__crosshair--horizontal" />
        <div className="nm-orbit__crosshair nm-orbit__crosshair--vertical" />

        {items.map(({ id, label, Icon }, index) => (
          <div
            className={`nm-orbit__satellite-path nm-orbit__satellite-path--${index + 1}`}
            key={id}
          >
            <div className="nm-orbit__satellite">
              <span className="nm-orbit__satellite-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>

              <span className="nm-orbit__satellite-label">
                {label}
              </span>
            </div>
          </div>
        ))}

        <div className="nm-orbit__document">
          <div className="nm-orbit__document-top">
            <span className="nm-orbit__document-icon">
              {studentMode ? (
                <FileText size={21} strokeWidth={1.7} />
              ) : (
                <ShieldCheck size={21} strokeWidth={1.7} />
              )}
            </span>

            <span className="nm-orbit__document-status">
              <CheckCircle2 size={12} />
              AKTİF
            </span>
          </div>

          <span className="nm-orbit__document-kicker">
            {studentMode
              ? "NOTMARK / NOT"
              : "NOTMARK / YÖNETİM"}
          </span>

          <strong className="nm-orbit__document-title">
            {studentMode
              ? "Ders notları"
              : "Kontrol merkezi"}
          </strong>

          <span className="nm-orbit__document-subtitle">
            {studentMode
              ? "Bilgiye güvenli erişim"
              : "Güvenli operasyon"}
          </span>

          <div className="nm-orbit__document-lines">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="nm-orbit__document-footer">
            <span className="nm-orbit__document-footer-icon">
              {studentMode ? (
                <BookOpen size={14} />
              ) : (
                <BarChart3 size={14} />
              )}
            </span>
            <span>
              {studentMode
                ? "Akademik içerik"
                : "Yönetim araçları"}
            </span>
          </div>
        </div>

        <span className="nm-orbit__spark nm-orbit__spark--one" />
        <span className="nm-orbit__spark nm-orbit__spark--two" />
        <span className="nm-orbit__spark nm-orbit__spark--three" />
      </div>

      <div className="nm-orbit__footer">
        <div className="nm-orbit__footer-icon">
          <Sparkles size={16} strokeWidth={1.8} />
        </div>

        <strong>
          {studentMode
            ? "Bilgi paylaşıldıkça büyür."
            : "Bilgiyi güvenle yönetin."}
        </strong>

        <p>
          {studentMode
            ? "Keşfet · Paylaş · Öğren"
            : "Doğrula · Denetle · Yönet"}
        </p>
      </div>
    </section>
  );
}
