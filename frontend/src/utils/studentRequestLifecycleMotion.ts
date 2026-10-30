// NOTMARK_LIFECYCLE_SPOTLIGHT_V10
// Pause = amber PauseCircle, Resume = yeşil PlayCircle.
// API başarısı sonrasında çalışır. Silme Genie Effect'ine dokunmaz.
// 0–900 ms: ikon büyüyüp kartın merkezine ulaşır.
// 900–1200 ms: tek parlama.
// 1200–1500 ms: kart ve efekt birlikte sönüp yok olur.

type RequestMotionAction = "pause" | "resume";

type MotionOptions = {
  card: HTMLElement | undefined;
  action: RequestMotionAction;
  signal?: AbortSignal;
  motion?: string | null;
};

function waitForMotion(duration: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    let timer = 0;
    const finish = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };

    signal?.addEventListener("abort", finish, { once: true });
    timer = window.setTimeout(finish, duration);
    if (signal?.aborted) finish();
  });
}

export async function playStudentRequestLifecycleMotion({
  card,
  action,
  signal,
  motion,
}: MotionOptions): Promise<void> {
  if (!card?.isConnected || signal?.aborted) return;

  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (motion === "off" || typeof card.animate !== "function") return;

  const reduced = motion === "reduced" || prefersReduced;
  const duration = reduced ? 110 : 1500;
  const iconSelector = action === "pause"
    ? ".notmark-request-action--pause svg"
    : ".notmark-request-action--resume svg";

  const source = card.querySelector<SVGSVGElement>(iconSelector);
  if (!source || typeof source.animate !== "function") return;

  const cardRect = card.getBoundingClientRect();
  const sourceRect = source.getBoundingClientRect();
  if (
    cardRect.width <= 0 || cardRect.height <= 0 ||
    sourceRect.width <= 0 || sourceRect.height <= 0
  ) return;

  const isPause = action === "pause";
  const tone = isPause
    ? {
        color: "#ffd06c",
        border: "rgba(255,210,105,1)",
        glow: "rgba(245,181,54,.80)",
        soft: "rgba(247,184,67,.23)",
        halo: "rgba(255,201,88,.52)",
      }
    : {
        color: "#68edb6",
        border: "rgba(91,241,178,1)",
        glow: "rgba(36,211,145,.78)",
        soft: "rgba(52,218,156,.23)",
        halo: "rgba(73,243,173,.50)",
      };

  const centerX = cardRect.left + cardRect.width / 2;
  const centerY = cardRect.top + cardRect.height / 2;
  const iconX = sourceRect.left + sourceRect.width / 2;
  const iconY = sourceRect.top + sourceRect.height / 2;
  const dx = centerX - iconX;
  const dy = centerY - iconY;
  const iconSize = Math.min(92, Math.max(64, cardRect.width * .19));
  const startScale = sourceRect.width / iconSize;

  const ring = document.createElement("div");
  Object.assign(ring.style, {
    position: "fixed",
    left: `${cardRect.left}px`,
    top: `${cardRect.top}px`,
    width: `${cardRect.width}px`,
    height: `${cardRect.height}px`,
    boxSizing: "border-box",
    borderRadius: window.getComputedStyle(card).borderRadius || "18px",
    border: `2px solid ${tone.border}`,
    background: "transparent",
    pointerEvents: "none",
    zIndex: "2147483000",
  });

  const halo = document.createElement("div");
  Object.assign(halo.style, {
    position: "fixed",
    left: `${centerX - 108}px`,
    top: `${centerY - 108}px`,
    width: "216px",
    height: "216px",
    borderRadius: "50%",
    background: `radial-gradient(circle, ${tone.halo} 0%, ${tone.soft} 38%, transparent 73%)`,
    pointerEvents: "none",
    opacity: "0",
    zIndex: "2147483001",
  });

  const flyer = document.createElement("span");
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${iconX - iconSize / 2}px`,
    top: `${iconY - iconSize / 2}px`,
    width: `${iconSize}px`,
    height: `${iconSize}px`,
    display: "grid",
    placeItems: "center",
    color: tone.color,
    pointerEvents: "none",
    transformOrigin: "center center",
    zIndex: "2147483002",
  });

  const clone = source.cloneNode(true) as SVGSVGElement;
  clone.style.width = `${iconSize}px`;
  clone.style.height = `${iconSize}px`;
  clone.style.color = "inherit";
  clone.style.stroke = "currentColor";
  flyer.appendChild(clone);
  for (const layer of [ring, halo, flyer]) {
    layer.setAttribute("aria-hidden", "true");
  }

  const animations: Animation[] = [];
  const previousIconVisibility = source.style.visibility;
  const previousCardOpacity = card.style.opacity;
  let completed = false;

  try {
    document.body.append(ring, halo, flyer);
    source.style.visibility = "hidden";

    // Azaltılmış hareket: icon fly ve parlama yok; sadece 110ms fade.
    if (reduced) {
      ring.style.display = "none";
      halo.style.display = "none";
      flyer.style.display = "none";
    } else {
      const translate = (x: number, y: number, scale: number) =>
        `translate3d(${x}px,${y}px,0) scale(${scale})`;

      // .60=900ms, .80=1200ms, 1.00=1500ms.
      animations.push(flyer.animate([
        { offset: 0, opacity: 1,
          transform: translate(0, 0, startScale), filter: "brightness(1)" },
        { offset: .32, opacity: 1,
          transform: translate(dx * .55, dy * .55, .59),
          filter: `drop-shadow(0 0 7px ${tone.glow})` },
        { offset: .60, opacity: 1,
          transform: translate(dx, dy, 1),
          filter: `drop-shadow(0 0 15px ${tone.glow})` },
        { offset: .73, opacity: 1,
          transform: translate(dx, dy, 1.12),
          filter: `brightness(1.9) drop-shadow(0 0 28px ${tone.color})` },
        { offset: .80, opacity: 1,
          transform: translate(dx, dy, 1.05),
          filter: `drop-shadow(0 0 15px ${tone.glow})` },
        { offset: 1, opacity: 0,
          transform: translate(dx, dy, 1.17),
          filter: "brightness(1.25) blur(5px)" },
      ], { duration, easing: "linear", fill: "forwards" }));

      animations.push(halo.animate([
        { offset: 0, opacity: 0, transform: "scale(.3)" },
        { offset: .56, opacity: .08, transform: "scale(.80)" },
        { offset: .70, opacity: .72, transform: "scale(1.08)" },
        { offset: .77, opacity: .95, transform: "scale(1.20)" },
        { offset: .80, opacity: .55, transform: "scale(1.25)" },
        { offset: 1, opacity: 0, transform: "scale(1.55)" },
      ], { duration, easing: "linear", fill: "forwards" }));

      animations.push(ring.animate([
        { offset: 0, opacity: .35, borderColor: tone.border,
          boxShadow: `0 0 8px ${tone.soft}` },
        { offset: .12, opacity: 1, borderColor: tone.border,
          boxShadow: `0 0 0 2px ${tone.soft}, 0 0 28px ${tone.glow}, inset 0 0 16px ${tone.soft}` },
        { offset: .60, opacity: 1, borderColor: tone.border,
          boxShadow: `0 0 0 2px ${tone.soft}, 0 0 30px ${tone.glow}, inset 0 0 18px ${tone.soft}` },
        { offset: .80, opacity: 1, borderColor: tone.color,
          boxShadow: `0 0 0 3px ${tone.soft}, 0 0 38px ${tone.glow}` },
        { offset: 1, opacity: 0, borderColor: tone.border,
          boxShadow: `0 0 0 0 ${tone.soft}, 0 0 0 ${tone.glow}` },
      ], { duration, easing: "linear", fill: "forwards" }));
    }

    // Son 300 ms kart da sönerek ayrılır; API durumu zaten başarılıdır.
    animations.push(card.animate([
      { offset: 0, opacity: 1 },
      { offset: .80, opacity: 1 },
      { offset: 1, opacity: 0 },
    ], { duration, easing: "linear", fill: "forwards" }));

    await waitForMotion(duration, signal);
    if (!signal?.aborted && card.isConnected) {
      // Animasyon iptal edilince kart yeniden yanıp sönmesin.
      card.style.opacity = "0";
      completed = true;
    }
  } catch {
    // Görsel hata başarılı backend yanıtını hata gibi sunmaz.
  } finally {
    for (const animation of animations) animation.cancel();
    source.style.visibility = previousIconVisibility;
    ring.remove();
    halo.remove();
    flyer.remove();
    if (!completed) card.style.opacity = previousCardOpacity;
  }
}
