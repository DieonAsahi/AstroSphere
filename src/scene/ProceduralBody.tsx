import { useMemo } from 'react';
import * as THREE from 'three';

interface ProceduralBodyProps {
  color: string;
  bands?: boolean;
}

export function ProceduralBody({ color, bands = false }: ProceduralBodyProps) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = color;
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (bands) {
      for (let y = 0; y < canvas.height; y += 12) {
        context.fillStyle =
          y % 24 === 0 ? 'rgba(255,255,255,.18)' : 'rgba(70,35,20,.12)';
        context.fillRect(0, y, canvas.width, 7);
      }
    }
    return new THREE.CanvasTexture(canvas);
  }, [bands, color]);

  return texture ? (
    <meshStandardMaterial map={texture} roughness={0.85} />
  ) : null;
}
