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


// NOTMARK_PAUSE_SPOTLIGHT_V9
//
// Beklemeye Al:
// 0-900ms: kart çevresinde amber ışık,
//         pause ikonu merkeze büyüyerek gider.
// 900-1200ms: tek ışık patlaması ve kaybolma.
//
// Katmanlar document.body üzerinde oluşturulur.
// Böylece kartın overflow, hover ve tema CSS'i
// ikonu kırpamaz veya animasyonu gizleyemez.

async function playNotMarkPauseSpotlight(
  card: HTMLElement,
  signal?: AbortSignal,
  motion?: string | null
): Promise<void> {
  if (!card.isConnected || signal?.aborted) {
    return;
  }

  const sourceIcon =
    card.querySelector<SVGSVGElement>(
      ".notmark-request-action--pause svg"
    );

  if (
    !sourceIcon ||
    typeof sourceIcon.animate !== "function"
  ) {
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const iconRect = sourceIcon.getBoundingClientRect();

  if (
    cardRect.width < 1 ||
    cardRect.height < 1 ||
    iconRect.width < 1 ||
    iconRect.height < 1
  ) {
    return;
  }

  const reduced =
    motion === "reduced" ||
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const duration = reduced ? 260 : 1200;
  const iconSize = 92;

  const centerX =
    cardRect.left + cardRect.width / 2;

  const centerY =
    cardRect.top + cardRect.height / 2;

  const iconX =
    iconRect.left + iconRect.width / 2;

  const iconY =
    iconRect.top + iconRect.height / 2;

  const dx = centerX - iconX;
  const dy = centerY - iconY;

  const startScale =
    iconRect.width / iconSize;

  // 1. Sarı çerçeve katmanı

  const ring = document.createElement("div");

  Object.assign(ring.style, {
    position: "fixed",
    boxSizing: "border-box",

    left: `${cardRect.left}px`,
    top: `${cardRect.top}px`,

    width: `${cardRect.width}px`,
    height: `${cardRect.height}px`,

    borderRadius:
      getComputedStyle(card).borderRadius || "18px",

    border:
      "2px solid rgba(255, 202, 88, .3)",

    background: "transparent",

    boxShadow:
      "0 0 0 1px rgba(255,195,69,.2)",

    pointerEvents: "none",
    zIndex: "2147483000",
  });

  ring.setAttribute("aria-hidden", "true");

  // 2. Merkezdeki amber enerji ışığı

  const halo = document.createElement("div");

  Object.assign(halo.style, {
    position: "fixed",

    left: `${centerX - 105}px`,
    top: `${centerY - 105}px`,

    width: "210px",
    height: "210px",

    borderRadius: "50%",

    background:
      "radial-gradient(circle, " +
      "rgba(255,205,93,.55) 0%, " +
      "rgba(245,164,39,.18) 36%, " +
      "transparent 73%)",

    pointerEvents: "none",
    opacity: "0",
    zIndex: "2147483001",
  });

  halo.setAttribute("aria-hidden", "true");

  // 3. Butondan kart merkezine büyüyecek ikon

  const flyingIcon =
    document.createElement("span");

  Object.assign(flyingIcon.style, {
    position: "fixed",

    left: `${iconX - iconSize / 2}px`,
    top: `${iconY - iconSize / 2}px`,

    width: `${iconSize}px`,
    height: `${iconSize}px`,

    display: "grid",
    placeItems: "center",

    borderRadius: "50%",
    color: "#ffce6a",

    pointerEvents: "none",

    zIndex: "2147483002",
    transformOrigin: "center center",
  });

  flyingIcon.setAttribute(
    "aria-hidden",
    "true"
  );

  const iconClone =
    sourceIcon.cloneNode(true) as SVGSVGElement;

  iconClone.style.width = `${iconSize}px`;
  iconClone.style.height = `${iconSize}px`;
  iconClone.style.color = "inherit";
  iconClone.style.stroke = "currentColor";
  iconClone.style.flexShrink = "0";

  flyingIcon.appendChild(iconClone);

  const animations: Animation[] = [];

  const previousVisibility =
    sourceIcon.style.visibility;

  try {
    document.body.append(
      ring,
      halo,
      flyingIcon
    );

    // Orijinal buton ikonunu yalnızca
    // uçuş sırasında gizle.

    sourceIcon.style.visibility = "hidden";

    if (reduced) {
      // Kullanıcı hareketi azaltmışsa
      // kısa, yer değiştirmeyen ışık efekti.

      flyingIcon.style.left =
        `${centerX - iconSize / 2}px`;

      flyingIcon.style.top =
        `${centerY - iconSize / 2}px`;

      animations.push(
        flyingIcon.animate([
          {
            offset: 0,
            opacity: 0,
            transform: "scale(.8)",
          },
          {
            offset: .5,
            opacity: 1,
            transform: "scale(1)",
          },
          {
            offset: 1,
            opacity: 0,
            transform: "scale(1)",
          },
        ], {
          duration,
          fill: "forwards",
        })
      );
    } else {

      // İKON HAREKETİ
      //
      // offset .75 = 900 ms
      // offset 1.00 = 1200 ms

      animations.push(
        flyingIcon.animate([
          {
            offset: 0,
            opacity: 1,

            transform:
              `translate3d(0,0,0) ` +
              `scale(${startScale})`,

            filter:
              "drop-shadow(" +
              "0 0 0px rgba(255,195,73,0))",
          },

          {
            offset: .40,
            opacity: 1,

            transform:
              `translate3d(` +
              `${dx * .45}px,` +
              `${dy * .45}px,0) ` +
              "scale(.55)",

            filter:
              "drop-shadow(" +
              "0 0 8px rgba(255,193,73,.50))",
          },

          {
            offset: .75,
            opacity: 1,

            // 0,9 saniyede merkeze geldi.
            // Tam 92 px boyutuna ulaştı.

            transform:
              `translate3d(${dx}px,${dy}px,0) ` +
              "scale(1)",

            filter:
              "drop-shadow(" +
              "0 0 13px rgba(255,204,90,.85))",
          },

          {
            offset: .86,
            opacity: 1,

            // Tek, güçlü parlama.

            transform:
              `translate3d(${dx}px,${dy}px,0) ` +
              "scale(1.12)",

            filter:
              "brightness(1.8) " +
              "drop-shadow(" +
              "0 0 25px rgba(255,211,95,1))",
          },

          {
            offset: 1,
            opacity: 0,

            // Son 0,3 saniyede söner.

            transform:
              `translate3d(${dx}px,${dy}px,0) ` +
              "scale(1.17)",

            filter:
              "brightness(1.5) blur(5px)",
          },
        ], {
          duration,
          easing: "linear",
          fill: "forwards",
        })
      );

      // İkon merkezdeyken parlayan enerji

      animations.push(
        halo.animate([
          {
            offset: 0,
            opacity: 0,
            transform: "scale(.3)",
          },
          {
            offset: .69,
            opacity: .07,
            transform: "scale(.85)",
          },
          {
            offset: .80,
            opacity: .55,
            transform: "scale(1)",
          },
          {
            offset: .88,
            opacity: .96,
            transform: "scale(1.18)",
          },
          {
            offset: 1,
            opacity: 0,
            transform: "scale(1.5)",
          },
        ], {
          duration,
          easing: "linear",
          fill: "forwards",
        })
      );
    }

    // KART ÇERÇEVESİ
    // Sarı ışık toplam 1,2 saniye görünür.

    animations.push(
      ring.animate([
        {
          offset: 0,
          opacity: .32,

          borderColor:
            "rgba(255,203,99,.35)",

          boxShadow:
            "0 0 0 1px rgba(247,182,55,.16), " +
            "0 0 9px rgba(255,190,64,.15)",
        },

        {
          offset: .12,
          opacity: 1,

          borderColor:
            "rgba(255,211,103,1)",

          boxShadow:
            "0 0 0 2px rgba(255,190,50,.38), " +
            "0 0 26px rgba(255,186,44,.65), " +
            "inset 0 0 18px rgba(255,191,65,.16)",
        },

        {
          offset: .75,
          opacity: 1,

          borderColor:
            "rgba(255,211,103,1)",

          boxShadow:
            "0 0 0 2px rgba(255,195,67,.44), " +
            "0 0 29px rgba(255,190,54,.75), " +
            "inset 0 0 22px rgba(255,193,75,.20)",
        },

        {
          offset: .88,
          opacity: 1,

          borderColor:
            "rgba(255,226,146,1)",

          boxShadow:
            "0 0 0 3px rgba(255,213,102,.5), " +
            "0 0 36px rgba(255,196,69,.85)",
        },

        {
          offset: 1,
          opacity: 0,

          borderColor:
            "rgba(255,215,121,0)",

          boxShadow:
            "0 0 0 0px rgba(255,185,52,0), " +
            "0 0 0px rgba(255,185,52,0)",
        },
      ], {
        duration,
        easing: "linear",
        fill: "forwards",
      })
    );

    // Kart 1,2 saniye boyunca listede kalır.
    // Efekt tamamlanınca mevcut React akışı
    // kartı Beklemeye Aldıklarım'a aktarır.

    await new Promise<void>((resolve) => {
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;

        signal?.removeEventListener(
          "abort",
          finish
        );

        window.clearTimeout(timer);
        resolve();
      };

      const timer = window.setTimeout(
        finish,
        duration
      );

      signal?.addEventListener(
        "abort",
        finish,
        { once: true }
      );

      if (signal?.aborted) {
        finish();
      }
    });
  } catch {
    // Görsel animasyon hatası başarılı API
    // işlemini yanlışlıkla başarısız göstermez.
  } finally {

    // Efekt katmanlarını her koşulda temizle.

    for (const animation of animations) {
      animation.cancel();
    }

    sourceIcon.style.visibility =
      previousVisibility;

    ring.remove();
    halo.remove();
    flyingIcon.remove();
  }
}


// Ayrı dispatch, eski Resume animasyonunun
// TypeScript kontrolünü ve davranışını korur.

async function dispatchNotMarkPauseSpotlight(
  card: HTMLElement,
  action: RequestMotionAction,
  signal?: AbortSignal,
  motion?: string | null
): Promise<boolean> {
  if (action !== "pause") {
    return false;
  }

  await playNotMarkPauseSpotlight(
    card,
    signal,
    motion
  );

  return true;
}

export async function playStudentRequestLifecycleMotion({
  card,
  action,
  signal,
  motion,
}: MotionOptions): Promise<void> {
  if (!card || !card.isConnected || signal?.aborted) return;
  if (motion === "off") return;

  // Beklemeye Al: yeni 1,2 saniyelik efekt.
  // Yeniden Aktif Et: mevcut V8 korunur.
  if (
    await dispatchNotMarkPauseSpotlight(
      card,
      action,
      signal,
      motion
    )
  ) {
    return;
  }

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
