import React from 'react';

export const ArrowMesh: React.FC<{ visualType?: 'ARROW' | 'FIREBALL' | 'CANNONBALL' }> = ({ visualType = 'ARROW' }) => {
  
  if (visualType === 'FIREBALL') {
      return (
          <group>
              <mesh>
                  <sphereGeometry args={[0.4]} />
                  <meshStandardMaterial color="orange" emissive="red" emissiveIntensity={2} />
              </mesh>
              <pointLight distance={5} intensity={2} color="orange" />
          </group>
      );
  }

  if (visualType === 'CANNONBALL') {
      return (
          <mesh>
              <sphereGeometry args={[0.6]} />
              <meshStandardMaterial color="#111" metalness={0.8} roughness={0.2} />
          </mesh>
      );
  }

  // Default Arrow
  return (
    <group>
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.6]} />
        <meshStandardMaterial color="#5d4037" />
      </mesh>
      <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0, 0, -0.25]} rotation={[0, 0, Math.PI / 4]}>
         <boxGeometry args={[0.1, 0.1, 0.01]} />
         <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
};
