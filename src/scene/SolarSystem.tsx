import { useEffect, useState } from 'react';
import type { CelestialBody } from '../data/types';
import { bodyRepository } from '../data/repository/bodyRepository';
import { educationalOrbitDistance } from '../lib/math3d';
import { Moon } from './Moon';
import { OrbitLine } from './OrbitLine';
import { Planet } from './Planet';
import { Starfield } from './Starfield';
import { Sun } from './Sun';
import { CameraRig } from './CameraRig';

export function SolarSystem() {
  const [bodies, setBodies] = useState<CelestialBody[]>([]);

  useEffect(() => {
    void bodyRepository.listBodies().then(setBodies);
  }, []);

  const planets = bodies.filter((body) => body.type === 'planet');
  const moon = bodies.find((body) => body.type === 'moon');

  return (
    <>
      <color attach="background" args={['#050816']} />
      <ambientLight intensity={0.18} />
      <hemisphereLight intensity={0.08} color="#dbe7ff" groundColor="#090b18" />
      <Starfield />
      <Sun />
      <CameraRig />
      {planets.map((body) => {
        const distance = educationalOrbitDistance(body.semiMajorAxisAu ?? 1);
        return (
          <group key={body.id}>
            <OrbitLine
              radius={distance}
              eccentricity={body.eccentricity ?? 0}
              inclinationDeg={body.inclinationDeg ?? 0}
            />
            <Planet body={body} orbitDistance={distance} />
          </group>
        );
      })}
      {moon ? <Moon body={moon} /> : null}
    </>
  );
}
