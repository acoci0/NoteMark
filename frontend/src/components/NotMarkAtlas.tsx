import { useEffect, useRef, type PointerEvent } from "react";
import {
  BookOpenText,
  UsersRound,
  GraduationCap,
  LibraryBig,
  FileCheck2,
  ShieldCheck,
  ClipboardCheck,
  ScrollText,
  ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";

import "./notmark-atlas.css";

type Role = "student" | "admin";

type Node = {
  id: string;
  x: number;
  y: number;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
};

const studentNodes: Node[] = [
  {
    id: "notes",
    x: 290,
    y: 155,
    title: "Ders Notları",
    subtitle: "Paylaş · Keşfet",
    Icon: BookOpenText,
  },
  {
    id: "students",
    x: 710,
    y: 155,
    title: "Aktif Öğrenci Kitlesi",
    subtitle: "Bilgi Topluluğu",
    Icon: UsersRound,
  },
  {
    id: "universities",
    x: 145,
    y: 350,
    title: "Üniversiteler",
    subtitle: "Akademik Ağ",
    Icon: GraduationCap,
  },
  {
    id: "courses",
    x: 855,
    y: 350,
    title: "Tüm Dersler",
    subtitle: "Ders Kataloğu",
    Icon: LibraryBig,
  },
  {
    id: "pdf",
    x: 290,
    y: 565,
    title: "Akademik PDF",
    subtitle: "Standart Format",
    Icon: FileCheck2,
  },
  {
    id: "approved",
    x: 710,
    y: 565,
    title: "Onaylı İçerik",
    subtitle: "Kalite ve Güven",
    Icon: ShieldCheck,
  },
];

const adminNodes: Node[] = [
  {
    id: "notes",
    x: 290,
    y: 155,
    title: "Not İnceleme",
    subtitle: "İçerik Kontrolü",
    Icon: ClipboardCheck,
  },
  {
    id: "students",
    x: 710,
    y: 155,
    title: "Kullanıcılar",
    subtitle: "Hesap Yönetimi",
    Icon: UsersRound,
  },
  {
    id: "universities",
    x: 145,
    y: 350,
    title: "Üniversiteler",
    subtitle: "Akademik Kayıtlar",
    Icon: GraduationCap,
  },
  {
    id: "courses",
    x: 855,
    y: 350,
    title: "Analitik",
    subtitle: "Sistem İzleme",
    Icon: ChartNoAxesCombined,
  },
  {
    id: "pdf",
    x: 290,
    y: 565,
    title: "PDF Denetimi",
    subtitle: "Belge Kontrolü",
    Icon: ScrollText,
  },
  {
    id: "approved",
    x: 710,
    y: 565,
    title: "Onay Süreci",
    subtitle: "Kalite ve Güven",
    Icon: ShieldCheck,
  },
];

const HUB_X = 500;
const HUB_Y = 362;
const SPACE_Y = 740;

function connection(x: number, y: number) {
  const middleX = (HUB_X + x) / 2;
  const middleY = (HUB_Y + y) / 2 - 28;

  return `M ${HUB_X} ${HUB_Y} Q ${middleX} ${middleY} ${x} ${y}`;
}

export default function NotMarkAtlas({
  role,
  paused = false,
}: {
  role: Role;
  paused?: boolean;
}) {
  const student = role === "student";
  const points = student ? studentNodes : adminNodes;

  const sceneRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<(HTMLDivElement | null)[]>([]);
  const linksRef = useRef<(SVGPathElement | null)[]>([]);
  const sparksRef = useRef<(SVGCircleElement | null)[]>([]);

  const cursorRef = useRef({
    x: -1000,
    y: -1000,
    active: false,
  });

  useEffect(() => {
    const stage = sceneRef.current;

    if (
      !stage ||
      paused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const springs = points.map(() => ({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
    }));

    let request = 0;
    let last = 0;
    let visible = false;
    let startedAt = 0;

    function animate(time: number) {
      if (!stage) return;

      request = 0;

      if (!visible || document.hidden) return;

      if (!startedAt) startedAt = time;

      const dt = last
        ? Math.min((time - last) / 16.667, 2)
        : 1;

      last = time;

      const elapsed = time - startedAt;
      const width = stage.clientWidth || 650;
      const height = stage.clientHeight || 540;

      points.forEach((point, i) => {
        const spring = springs[i];

        const driftX =
          Math.sin(elapsed * .00039 + i * 1.7) * 5;

        const driftY =
          Math.cos(elapsed * .00047 + i * 1.25) * 6;

        const dx =
          point.x + driftX - cursorRef.current.x;

        const dy =
          point.y + driftY - cursorRef.current.y;

        const distance =
          Math.max(1, Math.hypot(dx, dy));

        const pressure =
          cursorRef.current.active && distance < 185
            ? Math.pow(1 - distance / 185, 2)
            : 0;

        const targetX =
          dx / distance * pressure * 43;

        const targetY =
          dy / distance * pressure * 43;

        const damping = Math.pow(.83, dt);

        spring.vx = (
          spring.vx +
          (targetX - spring.x) * .06 * dt
        ) * damping;

        spring.vy = (
          spring.vy +
          (targetY - spring.y) * .06 * dt
        ) * damping;

        spring.x += spring.vx * dt;
        spring.y += spring.vy * dt;

        const x =
          point.x + driftX + spring.x;

        const y =
          point.y + driftY + spring.y;

        const node = nodesRef.current[i];

        if (node) {
          node.style.setProperty(
            "--atlas-x",
            `${((x - point.x) * width / 1000).toFixed(2)}px`
          );

          node.style.setProperty(
            "--atlas-y",
            `${((y - point.y) * height / SPACE_Y).toFixed(2)}px`
          );
        }

        const controlX = (HUB_X + x) / 2;
        const controlY = (HUB_Y + y) / 2 - 28;

        linksRef.current[i]?.setAttribute(
          "d",
          `M ${HUB_X} ${HUB_Y} Q ${controlX} ${controlY} ${x} ${y}`
        );

        const t =
          (elapsed * .000085 + i / 6) % 1;

        const oneMinus = 1 - t;

        const sparkX =
          oneMinus * oneMinus * HUB_X +
          2 * oneMinus * t * controlX +
          t * t * x;

        const sparkY =
          oneMinus * oneMinus * HUB_Y +
          2 * oneMinus * t * controlY +
          t * t * y;

        sparksRef.current[i]?.setAttribute(
          "cx",
          sparkX.toFixed(2)
        );

        sparksRef.current[i]?.setAttribute(
          "cy",
          sparkY.toFixed(2)
        );
      });

      request = requestAnimationFrame(animate);
    }

    function schedule() {
      if (
        visible &&
        !document.hidden &&
        !request
      ) {
        request = requestAnimationFrame(animate);
      }
    }

    function visibilityChanged() {
      if (document.hidden) {
        cancelAnimationFrame(request);
        request = 0;
        last = 0;
      } else {
        schedule();
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting);

        if (visible) {
          schedule();
        } else {
          cancelAnimationFrame(request);
          request = 0;
          last = 0;
        }
      },
      { threshold: .03 }
    );

    observer.observe(stage);

    document.addEventListener(
      "visibilitychange",
      visibilityChanged
    );

    return () => {
      cancelAnimationFrame(request);
      observer.disconnect();

      document.removeEventListener(
        "visibilitychange",
        visibilityChanged
      );

      cursorRef.current.active = false;
    };
  }, [paused, role, points]);

  const onMove = (
    event: PointerEvent<HTMLDivElement>
  ) => {
    if (
      paused ||
      event.pointerType === "touch"
    ) {
      return;
    }

    const bounds =
      event.currentTarget.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    cursorRef.current = {
      x:
        (event.clientX - bounds.left) /
        bounds.width * 1000,

      y:
        (event.clientY - bounds.top) /
        bounds.height * SPACE_Y,

      active: true,
    };
  };

  return (
    <section
      className={`nm-atlas nm-atlas--${role}${
        paused ? " nm-atlas--paused" : ""
      }`}
      aria-label={
        student
          ? "NotMark akademik bilgi ağı"
          : "NotMark yönetim ağı"
      }
    >
      <div className="nm-atlas__eyebrow">
        <i aria-hidden="true" />

        <span>
          {student
            ? "AKADEMİK ALIŞVERİŞ"
            : "YÖNETİM MERKEZİ"}
        </span>

        <span
          className="nm-atlas__rule"
          aria-hidden="true"
        />
      </div>

      <div
        className="nm-atlas__stage"
        ref={sceneRef}
        onPointerMove={onMove}
        onPointerLeave={() => {
          cursorRef.current.active = false;
        }}
        aria-hidden="true"
      >
        <div className="nm-atlas__atmosphere" />

        <svg
          className="nm-atlas__web"
          viewBox="0 0 1000 740"
          preserveAspectRatio="none"
        >
          <defs>
            <radialGradient id="nm-atlas-network-glow">
              <stop
                offset="0%"
                stopColor="#ff8f3e"
                stopOpacity=".19"
              />
              <stop
                offset="65%"
                stopColor="#264c74"
                stopOpacity=".055"
              />
              <stop
                offset="100%"
                stopColor="#0c1420"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>

          <ellipse
            cx="500"
            cy="362"
            rx="470"
            ry="308"
            fill="url(#nm-atlas-network-glow)"
          />

          <ellipse
            className="nm-atlas__orbit nm-atlas__orbit--outer"
            cx="500"
            cy="362"
            rx="452"
            ry="285"
          />

          <ellipse
            className="nm-atlas__orbit"
            cx="500"
            cy="362"
            rx="340"
            ry="215"
          />

          <ellipse
            className="nm-atlas__orbit nm-atlas__orbit--inner"
            cx="500"
            cy="362"
            rx="222"
            ry="145"
          />

          <path
            className="nm-atlas__axis"
            d="M 42 362 H 958 M 500 55 V 670"
          />

          {points.map((point, i) => (
            <g key={point.id}>
              <path
                className="nm-atlas__wire"
                ref={(element) => {
                  linksRef.current[i] = element;
                }}
                d={connection(point.x, point.y)}
              />

              <circle
                className="nm-atlas__spark"
                ref={(element) => {
                  sparksRef.current[i] = element;
                }}
                r="5"
                cx={point.x}
                cy={point.y}
              />
            </g>
          ))}
        </svg>

        <span className="nm-atlas__math nm-atlas__math--one">
          ∑
        </span>

        <span className="nm-atlas__math nm-atlas__math--two">
          π
        </span>

        <span className="nm-atlas__math nm-atlas__math--three">
          ∫
        </span>

        <span className="nm-atlas__math nm-atlas__math--four">
          f(x)
        </span>

        <div className="nm-atlas__hub">
          <div className="nm-atlas__hub-halo" />
          <div className="nm-atlas__hub-ring nm-atlas__hub-ring--one" />
          <div className="nm-atlas__hub-ring nm-atlas__hub-ring--two" />

          <div className="nm-atlas__hub-inner">
            <img
              src="/brand/notmark-logo.png"
              alt=""
            />
          </div>

          <div className="nm-atlas__hub-floor" />
        </div>

        {points.map(
          ({ id, title, subtitle, Icon, x, y }, i) => (
            <div
              key={id}
              className={`nm-atlas__node nm-atlas__node--${i + 1}`}
              ref={(element) => {
                nodesRef.current[i] = element;
              }}
              style={{
                left: `${x / 10}%`,
                top: `${y / SPACE_Y * 100}%`,
              }}
            >
              <div className="nm-atlas__node-orb">
                <div className="nm-atlas__node-glass">
                  <Icon
                    size={29}
                    strokeWidth={1.7}
                  />
                </div>
              </div>

              <div className="nm-atlas__node-label">
                <strong>{title}</strong>
                <span>{subtitle}</span>
              </div>
            </div>
          )
        )}
      </div>

      <div className="nm-atlas__footer">
        <h2>
          {student ? (
            <>
              Bilgi Güvenle <em>Paylaşılır.</em>
              <br />
              Değer Birlikte <em>Büyür.</em>
            </>
          ) : (
            <>
              Güvenle <em>Yönetilir.</em>
              <br />
              Kalite Birlikte <em>Korunur.</em>
            </>
          )}
        </h2>

        <p>
          {student
            ? "KEŞFET  ·  PAYLAŞ  ·  KAZAN"
            : "DOĞRULA  ·  DENETLE  ·  YÖNET"}
        </p>
      </div>
    </section>
  );
}
