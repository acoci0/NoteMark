import type { NavigateFunction } from "react-router-dom";

// İki farklı route arasında unmount edilmeyen, body'de yaşayan logo geçişi.
// Öğrenci/yönetici geçişinin logo, hız ve ışık dilini yeniden kullanır.
let flightRunning = false;

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const paint = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

function rectTransform(rect: DOMRect, size: number) {
  return `translate3d(${rect.left + rect.width / 2 - size / 2}px, ` +
    `${rect.top + rect.height / 2 - size / 2}px, 0) scale(${rect.width / size})`;
}

async function animate(
  element: HTMLElement,
  frames: Keyframe[],
  duration: number,
) {
  if (typeof element.animate !== "function") {
    await wait(duration);
    return;
  }
  const animation = element.animate(frames, {
    duration,
    easing: "cubic-bezier(.45, 0, .20, 1)",
    fill: "forwards",
  });
  try {
    await animation.finished;
  } finally {
    const last = frames[frames.length - 1];
    if (last?.transform) element.style.transform = String(last.transform);
    if (last?.opacity !== undefined) element.style.opacity = String(last.opacity);
    animation.cancel();
  }
}


/**
 * Responsive giriş/kayıt ekranlarında görünür logoyu seçer.
 * Tam ekran düzenindeki mevcut öncelik sırası korunur.
 */
function isVisibleAuthLogo(
  element: HTMLElement | null
): element is HTMLElement {
  if (!element || !element.isConnected) return false;

  const rect = element.getBoundingClientRect();

  if (rect.width < 10 || rect.height < 10) {
    return false;
  }

  let current: HTMLElement | null = element;

  while (current) {
    const style = window.getComputedStyle(current);

    if (
      style.display === "none" ||
      style.visibility === "hidden"
    ) {
      return false;
    }

    current = current.parentElement;
  }

  return true;
}

export function resolveVisibleAuthLogo(
  ...candidates: Array<HTMLElement | null>
): HTMLElement | null {
  return candidates.find(isVisibleAuthLogo) ?? null;
}

export function findVisibleAuthLogo(
  selector: string
): HTMLElement | null {
  return resolveVisibleAuthLogo(
    ...Array.from(
      document.querySelectorAll<HTMLElement>(selector)
    )
  );
}

export async function navigateWithAuthFlight(
  navigate: NavigateFunction,
  to: string,
  source: HTMLElement | null,
  destinationSelector: string,
  replace = false,
) {
  if (flightRunning) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !source || typeof source.getBoundingClientRect !== "function") {
    navigate(to, { replace });
    return;
  }

  const fromRect = source.getBoundingClientRect();
  if (fromRect.width < 10 || fromRect.height < 10) {
    navigate(to, { replace });
    return;
  }

  flightRunning = true;
  let navigated = false;
  let destination: HTMLElement | null = null;
  const sourceVisibility = source.style.visibility;
  let destinationVisibility = "";
  let cover: HTMLDivElement | null = null;
  let logo: HTMLDivElement | null = null;

  try {
    const size = Math.round(Math.min(264, Math.max(176,
      Math.min(window.innerWidth * .55, window.innerHeight * .42))));
    const start = rectTransform(fromRect, size);
    const center = `translate3d(${(window.innerWidth - size) / 2}px, ` +
      `${(window.innerHeight - size) / 2}px, 0) scale(1)`;

    cover = document.createElement("div");
    cover.className = "notmark-auth-route-cover";

    logo = document.createElement("div");
    logo.className = "notmark-auth-cinematic-logo notmark-auth-route-logo";
    logo.setAttribute("aria-hidden", "true");
    logo.style.width = `${size}px`;
    logo.style.height = `${size}px`;
    logo.style.transform = start;

    const ring = document.createElement("div");
    ring.className = "notmark-auth-cinematic-ring";
    const inner = document.createElement("div");
    inner.className = "notmark-auth-cinematic-inner";
    const image = document.createElement("img");
    image.src = "/brand/notmark-auth-logo-v56.png";
    image.alt = "";
    inner.appendChild(image);
    logo.append(ring, inner);
    document.body.append(cover, logo);
    source.style.visibility = "hidden";

    await animate(cover, [{ opacity: 0 }, { opacity: 1 }], 340);
    await animate(logo, [{ transform: start }, { transform: center }], 720);
    ring.style.animationPlayState = "running";
    await wait(1400);

    navigate(to, { replace });
    navigated = true;
    await paint();
    await paint();

    destination = findVisibleAuthLogo(destinationSelector);
    const rect = destination?.getBoundingClientRect();
    if (destination && rect && rect.width >= 10) {
      destinationVisibility = destination.style.visibility;
      destination.style.visibility = "hidden";
      await animate(logo, [{ transform: center },
        { transform: rectTransform(rect, size) }], 720);
    } else {
      // Hedef logo bulunmasa da gezinme tamamlanır, overlay kalmaz.
      await wait(220);
    }
    await animate(cover, [{ opacity: 1 }, { opacity: 0 }], 850);
  } catch {
    if (!navigated) navigate(to, { replace });
  } finally {
    if (source.isConnected) source.style.visibility = sourceVisibility;
    if (destination?.isConnected) destination.style.visibility = destinationVisibility;
    logo?.remove();
    cover?.remove();
    flightRunning = false;

    if (navigated && to.startsWith("/login")) {
      window.dispatchEvent(
        new CustomEvent("notmark:auth-flight-complete", {
          detail: { destination: to },
        })
      );
    }
  }
}
