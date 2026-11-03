import { useEffect, useState } from 'react';
import { useMetricsStore } from '../features/metrics/metricsStore';

export function FpsOverlay() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrame = 0;
    const measure = (time: number) => {
      frameCount += 1;
      if (time - lastTime >= 500) {
        const measured = Math.round((frameCount * 1000) / (time - lastTime));
        setFps(measured);
        useMetricsStore.getState().addFpsSample(measured);
        frameCount = 0;
        lastTime = time;
      }
      animationFrame = requestAnimationFrame(measure);
    };
    animationFrame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <output
      className="glass-panel absolute right-4 top-20 px-3 py-2 text-xs tabular-nums"
      aria-label={`${fps} bingkai per detik`}
    >
      {fps} FPS
    </output>
  );
}
