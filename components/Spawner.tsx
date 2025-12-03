

import React, { useMemo } from 'react';
import { UnitType, Team } from '../types';

interface SpawnerProps {
  type: UnitType;
  team: Team;
  position: { x: number, y: number, z: number };
  onClick?: () => void;
}

const Spawner: React.FC<SpawnerProps> = ({ type, team, position, onClick }) => {
  const isPlayer = team === Team.PLAYER;
  const color = isPlayer ? '#3b82f6' : '#ef4444';
  const rotation = isPlayer ? Math.PI : 0; // Rotate to face center

  const materials = useMemo(() => ({
    stone: '#64748b',
    wood: '#451a03',
    log: '#5D4037',
    hay: '#d4b483', // Wheat color
    targetWhite: '#f1f5f9',
    targetRed: '#ef4444',
    steel: '#94a3b8',
    glow: isPlayer ? '#60a5fa' : '#f87171'
  }), [isPlayer]);

  return (
    <group 
      position={[position.x, position.y, position.z]} 
      rotation={[0, rotation, 0]}
      onClick={(e) => {
        if (onClick) {
            e.stopPropagation();
            onClick();
        }
      }}
      onPointerOver={() => { document.body.style.cursor = onClick ? 'pointer' : 'auto' }}
      onPointerOut={() => { document.body.style.cursor = 'auto' }}
    >
      {/* Base Platform */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.4, 0.2, 8]} />
        <meshStandardMaterial color={materials.stone} flatShading />
      </mesh>
      
      {/* Team Indicator Ring */}
      <mesh position={[0, 0.21, 0]} rotation={[-Math.PI/2, 0, 0]}>
         <ringGeometry args={[1.0, 1.2, 32]} />
         <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {type === UnitType.WARRIOR && (
        // --- WARRIOR SPAWNER (Weapon Rack/Anvil) ---
        <group>
           {/* Anvil Block */}
           <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.8, 0.6, 0.5]} />
              <meshStandardMaterial color="#334155" flatShading />
           </mesh>
           
           {/* Sword stuck in stone/anvil */}
           <group position={[0, 1.2, 0]} rotation={[0.2, 0, -0.1]}>
              <mesh position={[0, -0.3, 0]}>
                 <boxGeometry args={[0.08, 0.8, 0.02]} />
                 <meshStandardMaterial color={materials.steel} metalness={0.8} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.15, 0]}>
                 <boxGeometry args={[0.3, 0.05, 0.05]} />
                 <meshStandardMaterial color={materials.steel} />
              </mesh>
              <mesh position={[0, 0.4, 0]}>
                 <cylinderGeometry args={[0.04, 0.03, 0.4]} />
                 <meshStandardMaterial color={materials.wood} />
              </mesh>
           </group>

           {/* Floating Icon/Hologram effect */}
           <mesh position={[0, 2, 0]}>
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshStandardMaterial color={materials.glow} emissive={materials.glow} emissiveIntensity={2} />
           </mesh>
        </group>
      )}

      {type === UnitType.ARCHER && (
        // --- ARCHER SPAWNER (Hay Bale Target Range) ---
        <group>
           {/* Wooden Stand Legs */}
           <mesh position={[-0.4, 0.6, 0]} rotation={[0, 0, -0.1]} castShadow>
              <boxGeometry args={[0.1, 1.0, 0.1]} />
              <meshStandardMaterial color={materials.wood} />
           </mesh>
           <mesh position={[0.4, 0.6, 0]} rotation={[0, 0, 0.1]} castShadow>
              <boxGeometry args={[0.1, 1.0, 0.1]} />
              <meshStandardMaterial color={materials.wood} />
           </mesh>
           
           {/* Hay Bale */}
           <mesh position={[0, 1.0, 0]} castShadow>
              <boxGeometry args={[1.0, 0.8, 0.5]} />
              <meshStandardMaterial color={materials.hay} flatShading />
           </mesh>

           {/* Target Faces (Front) */}
           <group position={[0, 1.0, 0.26]}>
               {/* Outer Ring */}
               <mesh rotation={[0, 0, 0]}>
                  <planeGeometry args={[0.6, 0.6]} />
                  <meshStandardMaterial color={materials.targetWhite} />
               </mesh>
               {/* Red Ring */}
               <mesh position={[0, 0, 0.01]}>
                  <circleGeometry args={[0.2, 32]} />
                  <meshStandardMaterial color={materials.targetRed} />
               </mesh>
               {/* White Center */}
               <mesh position={[0, 0, 0.02]}>
                  <circleGeometry args={[0.1, 32]} />
                  <meshStandardMaterial color={materials.targetWhite} />
               </mesh>
               {/* Bullseye */}
               <mesh position={[0, 0, 0.03]}>
                  <circleGeometry args={[0.05, 32]} />
                  <meshStandardMaterial color={materials.targetRed} />
               </mesh>
           </group>

           {/* Leaning Bow on the side */}
           <group position={[0.6, 0.8, 0.1]} rotation={[0, 0, -0.4]}>
                <mesh position={[0, 0, 0]} rotation={[0, Math.PI/2, 0]}>
                    <torusGeometry args={[0.4, 0.03, 8, 20, Math.PI]} />
                    <meshStandardMaterial color={materials.wood} />
                </mesh>
                <mesh position={[0, -0.4, 0]} rotation={[0, 0, Math.PI/2]}>
                     <cylinderGeometry args={[0.005, 0.005, 0.8]} />
                     <meshStandardMaterial color="white" />
                </mesh>
           </group>

           {/* Stuck Arrow */}
           <group position={[0.1, 1.1, 0.4]} rotation={[0.2, 0.2, 0]}>
              <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.4]} />
                <meshStandardMaterial color={materials.wood} />
              </mesh>
              <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.05, 0.05, 0.01]} />
                <meshStandardMaterial color="white" />
              </mesh>
           </group>

        </group>
      )}

      {type === UnitType.AXEMAN && (
          // --- AXEMAN SPAWNER (Tree Stump with Axe) ---
          <group>
              {/* Tree Stump */}
              <mesh position={[0, 0.5, 0]} castShadow>
                  <cylinderGeometry args={[0.5, 0.6, 0.6, 8]} />
                  <meshStandardMaterial color={materials.log} flatShading />
              </mesh>
              {/* Stump Top Rings */}
              <mesh position={[0, 0.801, 0]}>
                   <circleGeometry args={[0.45, 16]} />
                   <meshStandardMaterial color="#8D6E63" />
              </mesh>

              {/* Axe stuck in Stump */}
              <group position={[0, 1.2, 0]} rotation={[0, 0, 0.4]}>
                  {/* Handle */}
                  <mesh position={[0, 0, 0]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.8]} />
                      <meshStandardMaterial color={materials.wood} />
                  </mesh>
                  {/* Blade Head */}
                  <group position={[0, 0.35, 0]}>
                      <mesh position={[0.1, 0, 0]}>
                           <boxGeometry args={[0.2, 0.2, 0.05]} />
                           <meshStandardMaterial color={materials.steel} metalness={0.6} roughness={0.3} />
                      </mesh>
                  </group>
              </group>
          </group>
      )}

      {type === UnitType.LANCER && (
          // --- LANCER SPAWNER (Hitching Post with Lance) ---
          <group>
              {/* Vertical Posts */}
              <mesh position={[-0.5, 0.6, 0]} castShadow>
                  <boxGeometry args={[0.15, 1.2, 0.15]} />
                  <meshStandardMaterial color={materials.wood} />
              </mesh>
              <mesh position={[0.5, 0.6, 0]} castShadow>
                  <boxGeometry args={[0.15, 1.2, 0.15]} />
                  <meshStandardMaterial color={materials.wood} />
              </mesh>
              {/* Crossbeam */}
              <mesh position={[0, 1.0, 0]} castShadow>
                  <boxGeometry args={[1.3, 0.15, 0.1]} />
                  <meshStandardMaterial color={materials.wood} />
              </mesh>

              {/* Leaning Lance */}
              <group position={[0.2, 1.0, 0.2]} rotation={[0.4, 0, -0.3]}>
                  {/* Shaft */}
                  <mesh position={[0, 0, 0]}>
                      <cylinderGeometry args={[0.02, 0.02, 2.0]} />
                      <meshStandardMaterial color="#A1887F" />
                  </mesh>
                  {/* Tip */}
                  <mesh position={[0, 1.0, 0]}>
                       <coneGeometry args={[0.04, 0.3]} />
                       <meshStandardMaterial color={materials.steel} />
                  </mesh>
                  {/* Handle Guard */}
                  <mesh position={[0, -0.3, 0]}>
                      <cylinderGeometry args={[0.06, 0.04, 0.2]} />
                      <meshStandardMaterial color="#4E342E" />
                  </mesh>
              </group>
          </group>
      )}

    </group>
  );
};

export default Spawner;