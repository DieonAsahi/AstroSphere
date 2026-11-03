import { useEffect, type PropsWithChildren } from 'react';
import { useQualityStore } from '../../state/qualityStore';
import { useSceneStore } from '../../state/sceneStore';

export function AppProvider({ children }: PropsWithChildren) {
  const reducedMotion = useQualityStore((state) => state.reducedMotion);
  const highContrast = useQualityStore((state) => state.highContrast);
  const selectedBodyId = useSceneStore((state) => state.selectedBodyId);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(reducedMotion);
    document.documentElement.dataset.highContrast = String(highContrast);
  }, [highContrast, reducedMotion]);

  useEffect(() => {
    const accents: Record<string, string> = {
      mars: '#d66a35',
      jupiter: '#d7b86a',
      earth: '#6daee8',
      venus: '#dfb16b',
      mercury: '#aaa6a1',
      saturn: '#d9ca96',
      uranus: '#81c4d4',
      neptune: '#416bd4',
      sun: '#f5b942',
    };
    document.documentElement.style.setProperty(
      '--accent',
      selectedBodyId ? (accents[selectedBodyId] ?? '#8bcaff') : '#8bcaff',
    );
  }, [selectedBodyId]);

  return children;
}
