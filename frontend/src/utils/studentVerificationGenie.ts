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

    const duration = 2070;
    const fly = flyingIcon.animate([
      { offset: 0, opacity: 1, transform: position(0, 0, 1, 1) },
      { offset: .28, opacity: 1, transform: position(iconX, iconY, 3.1, 3.1) },
      { offset: .85, opacity: 1, transform: position(iconX, iconY, 3.1, 3.1) },
      { offset: 1, opacity: 0, transform: position(iconX, iconY, 2.8, 2.8) },
    ], { duration, easing: "cubic-bezier(.3,0,.2,1)", fill: "forwards" });
    running.push(fly);

    const flow = ghost.animate([
      { offset: 0, opacity: 1, transform: position(0, 0, 1, 1) },
      { offset: .30, opacity: 1, transform: position(0, 0, 1, 1) },
      { offset: .46, opacity: 1, transform: position(panelX * .22, panelY * .22, .95, .97, -3) },
      { offset: .60, opacity: 1, transform: position(panelX * .58, panelY * .58, .72, .79, -8) },
      { offset: .72, opacity: .84, transform: position(panelX * .91, panelY * .91, .20, .29, -11) },
      { offset: .80, opacity: 0, transform: position(panelX, panelY, .012, .018) },
      { offset: 1, opacity: 0, transform: position(panelX, panelY, .012, .018) },
    ], { duration, easing: "cubic-bezier(.27,.65,.2,1)", fill: "forwards" });
    running.push(flow);

    const lid = flyingIcon.querySelector<SVGGElement>(".notmark-trash-lid");
    if (lid) {
      const opening = lid.animate([
        { offset: 0, transform: "translate3d(0,0,0) rotate(0deg)" },
        { offset: .29, transform: "translate3d(0,0,0) rotate(0deg)" },
        { offset: .41, transform: "translate3d(-3px,-9px,0) rotate(-38deg)" },
        { offset: .73, transform: "translate3d(-3px,-9px,0) rotate(-38deg)" },
        { offset: .86, transform: "translate3d(0,0,0) rotate(0deg)" },
        { offset: 1, transform: "translate3d(0,0,0) rotate(0deg)" },
      ], { duration, easing: "ease-in-out", fill: "forwards" });
      running.push(opening);
    }

    await Promise.all(running.slice(1).map((animation) => animation.finished));

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
