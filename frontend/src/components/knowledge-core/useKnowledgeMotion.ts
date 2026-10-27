import { useEffect, type RefObject } from "react";

type Args = {
  sceneRef: RefObject<HTMLDivElement | null>;
  nodesRef: RefObject<(HTMLDivElement | null)[]>;
  enabled: boolean;
};

type Spring = { x: number; y: number; vx: number; vy: number };

const phases = [3.2, 5.3, 1.1]; // Evenly spaced, never clustered at start.
const PERIOD = 48_000;

export default function useKnowledgeMotion({ sceneRef, nodesRef, enabled }: Args) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const nodes = nodesRef.current;
    const springs: Spring[] = Array.from({ length: 3 }, () => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0, inside: false };
    let visible = true;
    let raf = 0;
    let last = 0;
    let clock = 0;

    function paint(elapsed: number) {
      if (!scene || !enabled || !visible || document.hidden) return;
      const dt = last ? Math.min(2, (elapsed - last) / 16.667) : 1;
      last = elapsed;
      clock += dt * 16.667;
      const bounds = scene.getBoundingClientRect();
      const rx = bounds.width * .377;
      const ry = bounds.height * .305;

      nodes.forEach((node, index) => {
        if (!node) return;
        const phase = reduced ? phases[index] : phases[index] + clock / PERIOD * Math.PI * 2;
        const orbitX = Math.cos(phase) * rx;
        const orbitY = Math.sin(phase) * ry;
        const spring = springs[index];
        let forceX = 0;
        let forceY = 0;
        if (pointer.inside && !reduced) {
          const dx = bounds.left + bounds.width / 2 + orbitX + spring.x - pointer.x;
          const dy = bounds.top + bounds.height / 2 + orbitY + spring.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const weight = Math.pow(Math.max(0, 1 - distance / 165), 2) * 20;
          forceX = dx / distance * weight;
          forceY = dy / distance * weight;
        }
        spring.vx = (spring.vx + ((forceX - spring.x) * .041) * dt) * Math.pow(.84, dt);
        spring.vy = (spring.vy + ((forceY - spring.y) * .041) * dt) * Math.pow(.84, dt);
        spring.x = Math.max(-27, Math.min(27, spring.x + spring.vx * dt));
        spring.y = Math.max(-27, Math.min(27, spring.y + spring.vy * dt));
        const depth = .95 + (Math.sin(phase) + 1) * .055;
        node.style.transform = `translate3d(${(orbitX + spring.x).toFixed(2)}px, ${(orbitY + spring.y).toFixed(2)}px, 0) translate(-50%, -50%) scale(${depth.toFixed(3)})`;
        node.style.zIndex = String(Math.round(20 + Math.sin(phase) * 6));
        node.style.opacity = String(.88 + (Math.sin(phase) + 1) * .06);
      });
      if (!reduced) raf = window.requestAnimationFrame(paint);
    }

    const restart = () => {
      window.cancelAnimationFrame(raf);
      last = 0;
      if (!enabled || !visible || document.hidden) return;
      raf = window.requestAnimationFrame(paint);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || reduced) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.inside = true;
      const r = scene.getBoundingClientRect();
      const dx = Math.max(-1, Math.min(1, (event.clientX - r.left - r.width / 2) / (r.width / 2)));
      const dy = Math.max(-1, Math.min(1, (event.clientY - r.top - r.height / 2) / (r.height / 2)));
      scene.style.setProperty("--kc-pointer-yaw", `${(dx * 3.2).toFixed(2)}deg`);
      scene.style.setProperty("--kc-pointer-pitch", `${(-dy * 2.8).toFixed(2)}deg`);
    };
    const leave = () => {
      pointer.inside = false;
      scene.style.setProperty("--kc-pointer-yaw", "0deg");
      scene.style.setProperty("--kc-pointer-pitch", "0deg");
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) leave();
      restart();
    }, { threshold: .05 });
    observer.observe(scene);
    scene.addEventListener("pointermove", move, { passive: true });
    scene.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", restart);
    restart();

    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      scene.removeEventListener("pointermove", move);
      scene.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", restart);
      leave();
    };
  }, [sceneRef, nodesRef, enabled]);
}
