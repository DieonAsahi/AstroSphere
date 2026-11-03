import { useMemo } from 'react';
import { getQualityParams, useQualityStore } from '../state/qualityStore';

export function Starfield() {
  const quality = useQualityStore((state) => state.quality);
  const count = getQualityParams(quality).starCount;

  const positions = useMemo(() => {
    const random = (() => {
      let seed = 17;
      return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
    })();

    const values = new Float32Array(count * 3);
    for (let index = 0; index < values.length; index += 3) {
      const radius = 55 + random() * 40;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      values[index] = radius * Math.sin(phi) * Math.cos(theta);
      values[index + 1] = radius * Math.cos(phi);
      values[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return values;
  }, [count]);

  return (
    <points frustumCulled>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={quality === 'low' ? 0.14 : 0.1}
        color="#dfe8ff"
        sizeAttenuation
        transparent
        opacity={0.88}
      />
    </points>
  );
}
