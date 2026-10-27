import { useEffect, useRef, type PointerEvent } from "react";

import {
  Activity,
  BadgeCheck,
  BookOpen,
  FileCheck2,
  FileText,
  Layers,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

type Role = "student" | "admin";

export default function NotMarkHologram({
  role,
}: {
  role: Role;
}) {
  const isStudent = role === "student";

  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;

    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();

    if (!rect.width || !rect.height) return;

    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      target.style.setProperty(
        "--nm-holo-ry",
        `${(x * 11).toFixed(2)}deg`
      );

      target.style.setProperty(
        "--nm-holo-rx",
        `${(-y * 9).toFixed(2)}deg`
      );

      frameRef.current = null;
    });
  };

  const reset = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = null;

    stageRef.current?.style.setProperty(
      "--nm-holo-rx",
      "0deg"
    );

    stageRef.current?.style.setProperty(
      "--nm-holo-ry",
      "0deg"
    );
  };

  return (
    <section
      className={`nm-holo nm-holo--${role}`}
      aria-label={
        isStudent
          ? "NotMark öğrenci platformu görseli"
          : "NotMark yönetim platformu görseli"
      }
    >
      <div className="nm-holo__eyebrow">
        <span className="nm-holo__signal" />

        {isStudent
          ? "ÖĞRENCİ DENEYİMİ"
          : "YÖNETİM MERKEZİ"}

        <span className="nm-holo__eyebrow-line" />
      </div>

      <div
        className="nm-holo__stage"
        ref={stageRef}
        onPointerMove={move}
        onPointerLeave={reset}
        aria-hidden="true"
      >
        <div className="nm-holo__aura" />

        <div className="nm-holo__world">
          <div className="nm-holo__float">

            <div className="nm-holo__floor">
              <span className="nm-holo__floor-ring nm-holo__floor-ring--one" />
              <span className="nm-holo__floor-ring nm-holo__floor-ring--two" />
              <span className="nm-holo__floor-core" />
            </div>

            <div className="nm-holo__light-column" />

            <div className="nm-holo__glass nm-holo__glass--rear">
              <div className="nm-holo__rear-heading">
                <Layers size={16} />
                NOTMARK
              </div>

              <div className="nm-holo__rear-grid" />
              <div className="nm-holo__rear-line" />
              <div className="nm-holo__rear-line nm-holo__rear-line--short" />

              <div className="nm-holo__rear-chart">
                <i /><i /><i /><i /><i />
              </div>
            </div>

            <div className="nm-holo__glass nm-holo__glass--main">
              <div className="nm-holo__main-top">
                <span className="nm-holo__main-badge">
                  <FileText size={15} />
                  NOTMARK
                </span>

                <ScanLine
                  size={17}
                  className="nm-holo__main-scanicon"
                />
              </div>

              <div className="nm-holo__main-illustration">
                {isStudent ? (
                  <BookOpen size={47} strokeWidth={1.15} />
                ) : (
                  <ShieldCheck size={47} strokeWidth={1.15} />
                )}
              </div>

              <span className="nm-holo__main-overline">
                {isStudent
                  ? "DİJİTAL NOT"
                  : "GÜVENLİ YÖNETİM"}
              </span>

              <strong>
                {isStudent
                  ? "Akademik içerik"
                  : "Kontrol paneli"}
              </strong>

              <span className="nm-holo__main-subtitle">
                {isStudent
                  ? "Notlarını keşfet ve paylaş"
                  : "Doğrula, denetle ve yönet"}
              </span>

              <div className="nm-holo__main-lines">
                <span /><span /><span />
              </div>

              <div className="nm-holo__main-footer">
                <span>
                  {isStudent
                    ? "PDF / NOT"
                    : "SİSTEM / YÖNETİM"}
                </span>

                <BadgeCheck size={16} />
              </div>

              <div className="nm-holo__scanline" />
            </div>

            <div className="nm-holo__glass nm-holo__glass--status">
              <span className="nm-holo__tile-icon nm-holo__tile-icon--orange">
                {isStudent ? (
                  <FileCheck2 size={20} />
                ) : (
                  <ShieldCheck size={20} />
                )}
              </span>

              <div>
                <small>
                  {isStudent ? "İçerik" : "Güvenlik"}
                </small>
                <strong>
                  {isStudent ? "PDF notları" : "Doğrulama"}
                </strong>
              </div>

              <span className="nm-holo__status-indicator" />
            </div>

            <div className="nm-holo__glass nm-holo__glass--metric">
              <Activity size={18} />

              <div>
                <small>
                  {isStudent ? "Topluluk" : "Operasyon"}
                </small>
                <strong>
                  {isStudent
                    ? "Paylaşım ağı"
                    : "Denetim akışı"}
                </strong>
              </div>

              <span className="nm-holo__metric-wave">
                <i /><i /><i /><i />
              </span>
            </div>

            <span className="nm-holo__particle nm-holo__particle--a" />
            <span className="nm-holo__particle nm-holo__particle--b" />
            <span className="nm-holo__particle nm-holo__particle--c" />

          </div>
        </div>
      </div>

      <div className="nm-holo__bottom">
        <strong>
          {isStudent
            ? "Bilgiye yeni bir boyut."
            : "Kontrolün yeni boyutu."}
        </strong>

        <span>
          {isStudent
            ? "Keşfet · Paylaş · Öğren"
            : "Doğrula · Denetle · Yönet"}
        </span>
      </div>
    </section>
  );
}
