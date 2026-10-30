// NOTMARK_REQUEST_MICRO_MOTION_V8
// Kart animasyonu React bileşen ağacını değiştirmez.
// API işlemi başarılı olduktan sonra çağrılır.

type RequestMotionAction = "pause" | "resume";

type MotionOptions = {
  card: HTMLElement | undefined;
  action: RequestMotionAction;
  signal?: AbortSignal;
  motion?: string | null;
};

export async function playStudentRequestLifecycleMotion({
  card,
  action,
  signal,
  motion,
}: MotionOptions): Promise<void> {
  if (!card || !card.isConnected || signal?.aborted) return;
  if (motion === "off") return;

  if (
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) return;

  if (typeof card.animate !== "function") return;

  const reduced = motion === "reduced";
  const duration = reduced ? 240 : 900;
  const isPause = action === "pause";

  const accent = isPause
    ? "rgba(245, 183, 86, .88)"
    : "rgba(55, 225, 155, .90)";

  const ring = isPause
    ? "rgba(245, 183, 86, .32)"
    : "rgba(55, 225, 155, .34)";

  const glow = isPause
    ? "rgba(231, 151, 52, .20)"
    : "rgba(32, 198, 134, .24)";

  const style = window.getComputedStyle(card);

  const originalWillChange =
    card.style.willChange;

  const animations: Animation[] = [];

  let safetyTimer: number | undefined;

  const abortAnimations = () => {
    for (const animation of animations) {
      animation.cancel();
    }
  };

  card.style.willChange =
    "transform, opacity, filter";

  try {
    if (reduced) {
      // Azaltılmış hareket: sade ve kısa geçiş.
      animations.push(card.animate([
        {
          opacity: 1,
          transform: "translateY(0)",
        },
        {
          opacity: 0,
          transform: "translateY(-4px)",
        },
      ], {
        duration,
        easing: "ease-out",
        fill: "forwards",
      }));
    } else {
      // Ana kart animasyonu.
      animations.push(card.animate([
        {
          offset: 0,
          opacity: 1,
          transform: style.transform === "none"
            ? "translate3d(0,0,0) scale(1)"
            : style.transform,
          filter: style.filter,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        },
        {
          offset: .22,
          opacity: 1,
          transform: isPause
            ? "translate3d(0,0,0) scale(.986)"
            : "translate3d(0,0,0) scale(1.014)",
          filter: isPause
            ? "brightness(.94) saturate(.77)"
            : "brightness(1.08) saturate(1.15)",
          boxShadow:
            `0 0 0 2px ${ring}, 0 0 30px ${glow}`,
          borderColor: accent,
        },
        {
          offset: .49,
          opacity: 1,
          transform: isPause
            ? "translate3d(0,0,0) scale(.987)"
            : "translate3d(0,0,0) scale(1.008)",
          filter: isPause
            ? "brightness(.90) saturate(.64)"
            : "brightness(1.05) saturate(1.12)",
          boxShadow:
            `0 0 0 1px ${ring}, 0 0 24px ${glow}`,
          borderColor: accent,
        },
        {
          offset: .76,
          opacity: .78,
          transform:
            "translate3d(0,-4px,0) scale(.987)",
          filter:
            "brightness(.99) saturate(.9)",
          boxShadow:
            `0 0 0 0px ${ring}, 0 0 12px ${glow}`,
          borderColor: style.borderColor,
        },
        {
          offset: 1,
          opacity: 0,
          transform:
            "translate3d(0,-13px,0) scale(.965)",
          filter:
            "brightness(1) saturate(1)",
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        },
      ], {
        duration,
        easing:
          "cubic-bezier(.22,.61,.36,1)",
        fill: "forwards",
      }));

      // Buton ikonunun mikro hareketi.
      const icon =
        card.querySelector<SVGSVGElement>(
          isPause
            ? ".notmark-request-action--pause svg"
            : ".notmark-request-action--resume svg"
        );

      if (
        icon &&
        typeof icon.animate === "function"
      ) {
        animations.push(icon.animate([
          {
            offset: 0,
            transform: "scale(1)",
            filter: "none",
          },
          {
            offset: .22,
            transform: isPause
              ? "scale(.83)"
              : "scale(1.24)",
            filter:
              `drop-shadow(0 0 5px ${accent})`,
          },
          {
            offset: .49,
            transform: "scale(1.06)",
            filter:
              `drop-shadow(0 0 7px ${accent})`,
          },
          {
            offset: 1,
            transform: "scale(1)",
            filter: "none",
          },
        ], {
          duration,
          easing: "ease-in-out",
          fill: "forwards",
        }));
      }

      // Aktif/beklemede durum etiketinin ışık darbesi.
      const status =
        card.querySelector<HTMLElement>(
          ".notmark-request-state"
        );

      if (
        status &&
        typeof status.animate === "function"
      ) {
        animations.push(status.animate([
          {
            offset: 0,
            filter: "brightness(1)",
          },
          {
            offset: .35,
            filter:
              `brightness(${isPause ? .93 : 1.55}) ` +
              `drop-shadow(0 0 5px ${accent})`,
          },
          {
            offset: 1,
            filter: "brightness(1)",
          },
        ], {
          duration,
          easing: "ease-in-out",
          fill: "forwards",
        }));
      }
    }

    signal?.addEventListener(
      "abort",
      abortAnimations,
      { once: true }
    );

    if (signal?.aborted) {
      abortAnimations();
    }

    // Tarayıcı animasyonu bitirmezse güvenli sınır.
    const completed = await Promise.race([
      Promise.allSettled(
        animations.map(
          (animation) => animation.finished
        )
      ).then(() => true),

      new Promise<boolean>((resolve) => {
        safetyTimer = window.setTimeout(
          () => resolve(false),
          duration + 350
        );
      }),
    ]);

    if (!completed && !signal?.aborted) {
      for (const animation of animations) {
        try {
          animation.finish();
        } catch {
          animation.cancel();
        }
      }
    }
  } catch {
    // Görsel hata başarılı API işlemini bozmaz.
    abortAnimations();
  } finally {
    if (safetyTimer !== undefined) {
      window.clearTimeout(safetyTimer);
    }

    signal?.removeEventListener(
      "abort",
      abortAnimations
    );

    card.style.willChange =
      originalWillChange;

    // fill:forwards kart kaldırılana kadar
    // son animasyon karesini korur.
  }
}
