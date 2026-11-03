export function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[2.05, 48, 48]} />
        <meshBasicMaterial color="#fff1a6" />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[2.05, 32, 32]} />
        <meshBasicMaterial
          color="#f5a623"
          transparent
          opacity={0.14}
          blending={2}
          depthWrite={false}
        />
      </mesh>
      <pointLight intensity={950} distance={150} decay={1.7} color="#fff3cf" />
    </group>
  );
}
