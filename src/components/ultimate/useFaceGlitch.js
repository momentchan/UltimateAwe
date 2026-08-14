import { useEffect, useRef, useState } from "react";

const IDLE = { x: 0, y: 0, seed: 1 };

/**
 * Shake + noise seed while intensity > 0.
 * Intensity is read from a ref so the RAF loop is not restarted every blend tick.
 */
export default function useFaceGlitch(intensity) {
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const [fx, setFx] = useState(IDLE);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now) => {
      const amount = Math.max(0, Math.min(1, intensityRef.current));
      if (amount <= 0.01) {
        setFx((prev) => (prev.x === 0 && prev.y === 0 ? prev : IDLE));
      } else if (now - last >= 32) {
        last = now;
        setFx({
          x: (Math.random() - 0.5) * 2,
          y: (Math.random() - 0.5) * 2,
          seed: 1 + Math.floor(Math.random() * 99),
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return fx;
}
