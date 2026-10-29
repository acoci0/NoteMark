// NOTMARK_GENIE_EFFECT_V6
// An animation-only layer: never mutate React-owned DOM nodes.
export type StudentVerificationGenieOptions = {
  panel: HTMLDivElement | null;
  icon: HTMLDivElement | null;
  onCovered: () => void;
  signal?: AbortSignal;
};

export async function playStudentVerificationGenie({
  panel,
  icon,
  onCovered,
  signal,
}: StudentVerificationGenieOptions): Promise<void> {
  let covered = false;
  const cover = () => {
    if (covered) return;
    covered = true;
    onCovered();
  };

  if (
    !panel || !icon || !panel.isConnected || !icon.isConnected ||
    signal?.aborted || typeof panel.animate !== "function"
  ) {
    cover();
    return;
  }

  const rect = panel.getBoundingClientRect();
  const iconRect = icon.getBoundingClientRect();
  if (!rect.width || !rect.height || !iconRect.width || !iconRect.height) {
    cover();
    return;
  }

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const iconCx = iconRect.left + iconRect.width / 2;
  const iconCy = iconRect.top + iconRect.height / 2;
  const panelCx = rect.left + rect.width / 2;
  const panelCy = rect.top + rect.height / 2;

  // On narrow phones, use the left safe area; desktop target stays left of popup.
  const destX = Math.max(38, Math.min(viewportW * 0.20, rect.left - 90));
  const destY = Math.max(92, Math.min(viewportH - 95, panelCy));
  const iconX = destX - iconCx;
  const iconY = destY - iconCy;
  const panelX = destX - panelCx;
  const panelY = destY - 18 - panelCy;

  const scene = window.document.createElement("div");
  scene.className = "notmark-genie-v6-scene";
  scene.setAttribute("aria-hidden", "true");
  scene.dataset.theme = window.document
    .querySelector(".student-app-shell")
    ?.getAttribute("data-theme") ?? "dark";

  const ghost = panel.cloneNode(true) as HTMLDivElement;
  ghost.classList.add("notmark-genie-v6-ghost");
  for (const attr of ["role", "aria-modal", "aria-labelledby", "aria-describedby", "aria-busy"]) {
    ghost.removeAttribute(attr);
  }
  ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  ghost.querySelectorAll("button").forEach((button) => { button.tabIndex = -1; });
  ghost.querySelector<HTMLElement>(".notmark-delete-dialog__icon")
    ?.style.setProperty("visibility", "hidden");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    animation: "none",
    transition: "none",
    boxShadow: "none",
    backdropFilter: "none",
    transform: "none",
    transformOrigin: "50% 50%",
    pointerEvents: "none",
  });

  // Same icon, same starting pixels: the original is covered by the solid scene.
  const flyingIcon = icon.cloneNode(true) as HTMLDivElement;
  flyingIcon.classList.add("notmark-genie-v6-icon");
  Object.assign(flyingIcon.style, {
    position: "fixed",
    left: `${iconRect.left}px`,
    top: `${iconRect.top}px`,
    width: `${iconRect.width}px`,
    height: `${iconRect.height}px`,
    margin: "0",
    transition: "none",
    animation: "none",
    transformOrigin: "50% 50%",
    pointerEvents: "none",
  });

  // NOTMARK_TRASH_SHARPNESS_V7

  const iconScale = 3.1;

  const originalSvg =
    icon.querySelector<SVGSVGElement>("svg");

  const svgRect =
    originalSvg?.getBoundingClientRect();

  const bigW =
    iconRect.width * iconScale;

  const bigH =
    iconRect.height * iconScale;

  flyingIcon.style.left =
    `${iconRect.left - (bigW - iconRect.width) / 2}px`;

  flyingIcon.style.top =
    `${iconRect.top - (bigH - iconRect.height) / 2}px`;

  flyingIcon.style.width =
    `${bigW}px`;

  flyingIcon.style.height =
    `${bigH}px`;

  flyingIcon.style.borderWidth =
    `${iconScale}px`;

  flyingIcon.style.borderRadius =
    `${11 * iconScale}px`;

  const svg =
    flyingIcon.querySelector<SVGSVGElement>("svg");

  if (svg) {
    svg.style.width =
      `${(svgRect?.width ?? 24) * iconScale}px`;

    svg.style.height =
      `${(svgRect?.height ?? 24) * iconScale}px`;

    svg.setAttribute(
      "shape-rendering",
      "geometricPrecision"
    );

    // Trash2 ikonunun kapak ve sapını ayır.

    const paths = Array.from(svg.children).filter(
      (element) =>
        element.tagName.toLowerCase() === "path"
    );

    if (paths.length >= 5) {
      const group =
        window.document.createElementNS(
          "http://www.w3.org/2000/svg",
          "g"
        );

      group.classList.add("notmark-trash-lid");

      svg.insertBefore(group, paths[0]);

      group.append(paths[0], paths[1]);
    }
  }

  scene.append(ghost, flyingIcon);
  window.document.body.appendChild(scene);
  const running: Animation[] = [];
  const abort = () => running.forEach((animation) => animation.cancel());
  signal?.addEventListener("abort", abort, { once: true });

  const position = (x: number, y: number, sx: number, sy: number, skew = 0) =>
    `translate3d(${x}px, ${y}px, 0) skewY(${skew}deg) scale(${sx}, ${sy})`;

  try {
    if (signal?.aborted) {
      cover();
      return;
    }

    // Opaque stage first; underlying math/aurora remain out of the animation.
    const fadeIn = scene.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 190, easing: "ease-out", fill: "forwards",
    });
    running.push(fadeIn);
    await fadeIn.finished;
    scene.style.opacity = "1";
    fadeIn.cancel();

    window.document.body.classList.add("notmark-genie-v6-active");
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    // NOTMARK_GENIE_V6_SEQUENCED_TIMING_V2

    // AbortController destekli bekleme.
    const wait = (
      ms: number
    ): Promise<void> => new Promise(
      (resolve, reject) => {
        if (signal?.aborted) {
          reject(
            new DOMException(
              "Animasyon iptal edildi",
              "AbortError"
            )
          );
          return;
        }

        const onAbort = () => {
          window.clearTimeout(timer);

          reject(
            new DOMException(
              "Animasyon iptal edildi",
              "AbortError"
            )
          );
        };

        const timer = window.setTimeout(() => {
          signal?.removeEventListener(
            "abort",
            onAbort
          );
          resolve();
        }, ms);

        signal?.addEventListener(
          "abort",
          onAbort,
          { once: true }
        );
      }
    );

    /*
     * AŞAMA 1
     * Çöp kutusu sola gider ve tamamen büyür.
     */
    const fly = flyingIcon.animate(
      [
        {
          opacity: 1,
          transform: position(
            0, 0, 1 / iconScale, 1 / iconScale
          )
        },
        {
          opacity: 1,
          transform: position(
            iconX,
            iconY,
            1,
            1
          )
        }
      ],
      {
        duration: 700,
        easing: "cubic-bezier(.25,.65,.18,1)",
        fill: "forwards"
      }
    );

    running.push(fly);

    await fly.finished;

    /*
     * AŞAMA 2
     * Çöp kutusu 0,9 saniye sabit bekler.
     *
     * Popup bu sırada kesinlikle hareket etmez.
     */
    await wait(900);

    const lid =
      flyingIcon.querySelector<SVGGElement>(
        ".notmark-trash-lid"
      );

    const lidClosed =
      "translate3d(0,0,0) rotate(0deg)";

    const lidOpened =
      "translate3d(-3px,-9px,0) rotate(-38deg)";

    /*
     * AŞAMA 3
     * Kapak tamamen açılır.
     */
    if (lid) {
      const opening = lid.animate(
        [
          { transform: lidClosed },
          { transform: lidOpened }
        ],
        {
          duration: 320,
          easing: "ease-out",
          fill: "forwards"
        }
      );

      running.push(opening);

      await opening.finished;
    }

    /*
     * AŞAMA 4
     * Kapak açıkken popup çöp kutusuna akar.
     */
    const flow = ghost.animate(
      [
        {
          offset: 0,
          opacity: 1,
          transform: position(
            0, 0, 1, 1
          )
        },
        {
          offset: 0.16,
          opacity: 1,
          transform: position(
            panelX * 0.13,
            panelY * 0.13,
            0.97,
            0.99,
            -2
          )
        },
        {
          offset: 0.38,
          opacity: 1,
          transform: position(
            panelX * 0.44,
            panelY * 0.44,
            0.82,
            0.89,
            -6
          )
        },
        {
          offset: 0.64,
          opacity: 0.96,
          transform: position(
            panelX * 0.78,
            panelY * 0.78,
            0.42,
            0.52,
            -10
          )
        },
        {
          offset: 0.84,
          opacity: 0.64,
          transform: position(
            panelX * 0.95,
            panelY * 0.95,
            0.10,
            0.17,
            -5
          )
        },
        {
          offset: 1,
          opacity: 0,
          transform: position(
            panelX,
            panelY,
            0.012,
            0.018
          )
        }
      ],
      {
        duration: 1300,
        easing: "cubic-bezier(.28,.60,.22,1)",
        fill: "forwards"
      }
    );

    running.push(flow);

    await flow.finished;

    /*
     * AŞAMA 5
     * Popup tamamen içeri girdikten sonra
     * kapağı kapat.
     */
    if (lid) {
      const closing = lid.animate(
        [
          { transform: lidOpened },
          { transform: lidClosed }
        ],
        {
          duration: 280,
          easing: "ease-in-out",
          fill: "forwards"
        }
      );

      running.push(closing);

      await closing.finished;
    }

    /*
     * AŞAMA 6
     * Popup girdikten sonra toplam 0,8 sn:
     * 280 ms kapak + 520 ms sabit bekleme.
     */
    await wait(520);

    /*
     * AŞAMA 7
     * Çöp kutusu yavaşça kaybolur.
     */
    const disappear = flyingIcon.animate(
      [
        {
          opacity: 1,
          transform: position(
            iconX,
            iconY,
            1,
            1
          )
        },
        {
          opacity: 0,
          transform: position(
            iconX,
            iconY,
            0.92,
            0.92
          )
        }
      ],
      {
        duration: 420,
        easing: "ease-in-out",
        fill: "forwards"
      }
    );

    running.push(disappear);

    await disappear.finished;

    // React rerender happens only when the scene is completely opaque.
    cover();
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    }));

    const reveal = scene.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 420, easing: "ease-in-out", fill: "forwards",
    });
    running.push(reveal);
    await reveal.finished;
  } finally {
    cover();
    running.forEach((animation) => animation.cancel());
    signal?.removeEventListener("abort", abort);
    scene.remove();
    window.document.body.classList.remove("notmark-genie-v6-active");
  }
}
