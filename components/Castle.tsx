
import React from 'react';
import { Team } from '../types';

interface CastleProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  teamColor: string;
  team: Team;
}

const Castle: React.FC<CastleProps> = ({ position, rotation = [0, 0, 0], teamColor, team }) => {
  // Expanded Castle: Enclosed fortress with a gap for the gate in the front
  // Center Position Z is roughly +/- 65.
  // We want walls around it.
  
  // Dimensions relative to center:
  // Width: 40 (x: -20 to 20)
  // Depth: 30 (z: -15 to 15) relative to pivot

  const wallColor = "#a8a29e"; // Lighter Grey Stone
  const towerColor = "#78716c"; // Slightly darker stone for towers

  return (
    <group 
        position={position} 
        rotation={rotation}
    >
      {/* Back Wall */}
      <mesh position={[0, 4, -15]} castShadow receiveShadow>
        <boxGeometry args={[44, 8, 4]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>
      
      {/* Left Wall */}
      <mesh position={[-20, 4, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[30, 8, 4]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>
      
      {/* Right Wall */}
      <mesh position={[20, 4, 0]} rotation={[0, Math.PI / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[30, 8, 4]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>

      {/* Front Wall LEFT (Leaves gap for gate in center) */}
      <mesh position={[-14, 4, 15]} castShadow receiveShadow>
         <boxGeometry args={[16, 8, 4]} />
         <meshStandardMaterial color={wallColor} flatShading />
      </mesh>

      {/* Front Wall RIGHT */}
      <mesh position={[14, 4, 15]} castShadow receiveShadow>
         <boxGeometry args={[16, 8, 4]} />
         <meshStandardMaterial color={wallColor} flatShading />
      </mesh>

      {/* Corner Towers */}
      <mesh position={[-22, 5, -17]} castShadow receiveShadow>
         <boxGeometry args={[6, 12, 6]} />
         <meshStandardMaterial color={towerColor} flatShading />
      </mesh>
      <mesh position={[22, 5, -17]} castShadow receiveShadow>
         <boxGeometry args={[6, 12, 6]} />
         <meshStandardMaterial color={towerColor} flatShading />
      </mesh>
      <mesh position={[-22, 5, 17]} castShadow receiveShadow>
         <boxGeometry args={[6, 12, 6]} />
         <meshStandardMaterial color={towerColor} flatShading />
      </mesh>
      <mesh position={[22, 5, 17]} castShadow receiveShadow>
         <boxGeometry args={[6, 12, 6]} />
         <meshStandardMaterial color={towerColor} flatShading />
      </mesh>

      {/* Gatehouse Pillars (Visual frame for the UnitType.GATE) */}
      <mesh position={[-7, 6, 16]} castShadow receiveShadow>
         <boxGeometry args={[3, 10, 5]} />
         <meshStandardMaterial color={towerColor} flatShading />
      </mesh>
      <mesh position={[7, 6, 16]} castShadow receiveShadow>
         <boxGeometry args={[3, 10, 5]} />
         <meshStandardMaterial color={towerColor} flatShading />
      </mesh>
      
      {/* Archway top */}
      <mesh position={[0, 9, 16]} castShadow>
          <boxGeometry args={[12, 2, 5]} />
          <meshStandardMaterial color={towerColor} flatShading />
      </mesh>

      {/* Team Banner on towers */}
      <mesh position={[-22, 8, 20.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 5, 0.1]} />
        <meshStandardMaterial color={teamColor} />
      </mesh>
      <mesh position={[22, 8, 20.1]} rotation={[0, 0, 0]}>
        <boxGeometry args={[3, 5, 0.1]} />
        <meshStandardMaterial color={teamColor} />
      </mesh>
    </group>
  );
};

export default Castle;
