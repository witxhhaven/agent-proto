// Full-screen "realistic" confetti burst. Renders on its own high-z canvas so
// the particles sit IN FRONT of Mantine modals/overlays. Returns a stop() that
// tears the canvas down (e.g. when the modal closes / on unmount).
// Dynamically imported so canvas-confetti stays out of the initial bundle.
export function fireConfetti(): () => void {
  if (typeof window === "undefined") return () => {};

  let stopped = false;
  // Reassigned once the dynamic import resolves; the returned stopper always
  // calls the current value, so stopping before/after load both work.
  let cleanup = () => {
    stopped = true;
  };

  void import("canvas-confetti").then(({ default: confetti }) => {
    if (stopped) return; // already stopped before the lib loaded

    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    // Above Mantine modals (≈200) so the confetti renders in front of the modal.
    canvas.style.zIndex = "10000";
    document.body.appendChild(canvas);

    const blast = confetti.create(canvas, { resize: true, useWorker: true });

    const count = 200;
    const defaults = { origin: { y: 0.7 } };
    const fire = (
      particleRatio: number,
      opts: Parameters<typeof blast>[0]
    ) =>
      blast({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    cleanup = () => {
      stopped = true;
      // Let the last particles fall before tearing the canvas down.
      window.setTimeout(() => canvas.remove(), 2500);
    };
  });

  return () => cleanup();
}
