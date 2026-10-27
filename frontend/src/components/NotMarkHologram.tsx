import { useEffect, useRef, type PointerEvent } from "react";

import {
  Activity,
  CircleDollarSign,
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

  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);

  const cursorRef = useRef({
    x: 0,
    y: 0,
    active: false,
  });

  const springsRef = useRef(
    Array.from({ length: 3 }, () => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    }))
  );

  useEffect(() => () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  const tick = (time: number) => {
    const dt = lastFrameRef.current
      ? Math.min(2, (time - lastFrameRef.current) / 16.667)
      : 1;

    lastFrameRef.current = time;

    let unsettled = false;

    cardsRef.current.forEach((card, index) => {
      if (!card) return;

      const spring = springsRef.current[index];
      const bounds = card.getBoundingClientRect();

      const dx =
        bounds.left + bounds.width / 2 - cursorRef.current.x;

      const dy =
        bounds.top + bounds.height / 2 - cursorRef.current.y;

      const distance = Math.max(1, Math.hypot(dx, dy));

      const influence =
        cursorRef.current.active && distance < 165
          ? Math.pow(1 - distance / 165, 2) * 1.25
          : 0;

      spring.vx = (
        spring.vx -
        spring.x * .030 +
        dx / distance * influence * 2
      ) * Math.pow(.89, dt);

      spring.vy = (
        spring.vy -
        spring.y * .030 +
        dy / distance * influence * 2
      ) * Math.pow(.89, dt);

      spring.x = Math.max(
        -38,
        Math.min(38, spring.x + spring.vx * dt)
      );

      spring.y = Math.max(
        -38,
        Math.min(38, spring.y + spring.vy * dt)
      );

      card.parentElement?.style.setProperty(
        "--nm-spring-x",
        `${spring.x.toFixed(2)}px`
      );

      card.parentElement?.style.setProperty(
        "--nm-spring-y",
        `${spring.y.toFixed(2)}px`
      );

      unsettled ||= (
        Math.abs(spring.x) +
        Math.abs(spring.y) +
        Math.abs(spring.vx) +
        Math.abs(spring.vy)
      ) > .12;
    });

    if (cursorRef.current.active || unsettled) {
      frameRef.current = requestAnimationFrame(tick);
    } else {
      frameRef.current = null;
      lastFrameRef.current = 0;
    }
  };

  const schedule = () => {
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(tick);
    }
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType === "touch" ||
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) return;

    cursorRef.current = {
      x: event.clientX,
      y: event.clientY,
      active: true,
    };

    schedule();
  };

  const reset = () => {
    cursorRef.current.active = false;
    schedule();
  };

  const satellites = isStudent ? [
    {
      id: "approved",
      overline: "İçerik",
      title: "Onaylı Notlar",
      Icon: FileCheck2,
    },
    {
      id: "community",
      overline: "Topluluk",
      title: "Paylaşım Ağı",
      Icon: Activity,
    },
    {
      id: "earnings",
      overline: "NotMark",
      title: "Kazandıran Bilgi",
      Icon: CircleDollarSign,
    },
  ] : [
    {
      id: "approved",
      overline: "Güvenlik",
      title: "Doğrulama",
      Icon: ShieldCheck,
    },
    {
      id: "community",
      overline: "Operasyon",
      title: "Denetim Akışı",
      Icon: Activity,
    },
    {
      id: "earnings",
      overline: "NotMark",
      title: "Kazandıran Bilgi",
      Icon: CircleDollarSign,
    },
  ];

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
          ? "AKADEMİK ALIŞVERİŞ"
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

            <div className="nm-holo__rotor-frame nm-holo__rotor-frame--rear">
              <div className="nm-holo__rotor nm-holo__rotor--rear">
                <div className="nm-holo__glass nm-holo__glass--rear nm-holo__face nm-holo__face--front">
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

                <div className="nm-holo__glass nm-holo__face nm-holo__face--back nm-holo__rear-back">
                  <Layers size={36} strokeWidth={1.2} />
                  <strong>NOTMARK</strong>
                  <span>Akademik ağ</span>
                  <div className="nm-holo__back-bars">
                    <i /><i /><i />
                  </div>
                </div>
              </div>
            </div>

            <div className="nm-holo__rotor-frame nm-holo__rotor-frame--main">
              <div className="nm-holo__rotor nm-holo__rotor--main">
                <div className="nm-holo__glass nm-holo__glass--main nm-holo__face nm-holo__face--front">
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

                <div className="nm-holo__glass nm-holo__face nm-holo__face--back nm-holo__main-back">
                  <BadgeCheck size={45} strokeWidth={1.15} />
                  <span>NOTMARK</span>
                  <strong>
                    {isStudent
                      ? "Akademik içerik"
                      : "Kontrol merkezi"}
                  </strong>
                  <small>
                    {isStudent
                      ? "Güvenli not paylaşımı"
                      : "Güvenli yönetim"}
                  </small>
                </div>
              </div>
            </div>

            {satellites.map(
              ({ id, overline, title, Icon }, index) => (
                <div
                  className={`nm-holo__orbit-path nm-holo__orbit-path--${index + 1}`}
                  key={id}
                >
                  <div className="nm-holo__orbit-counter">
                    <div className="nm-holo__spring">
                      <div
                        className="nm-holo__satellite-card"
                        ref={(element) => {
                          cardsRef.current[index] = element;
                        }}
                      >
                        <span className="nm-holo__satellite-icon">
                          <Icon size={19} />
                        </span>

                        <span className="nm-holo__satellite-copy">
                          <small>{overline}</small>
                          <strong>{title}</strong>
                        </span>

                        <span className="nm-holo__satellite-led" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

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
