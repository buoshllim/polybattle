import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Group, MeshStandardMaterial, MathUtils, Vector3 } from 'three';
import { UnitType, Team, GameEntity, GameOutcome } from '../types';

interface UnitMeshProps {
  entity: GameEntity;
  scale?: number;
  gameOutcome?: GameOutcome;
  onClick?: () => void;
}

const UnitMesh: React.FC<UnitMeshProps> = ({ entity, scale = 1, gameOutcome, onClick }) => {
  const groupRef = useRef<Group>(null);
  
  // Body Parts Refs
  const torsoRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null); 
  const rightLegRef = useRef<Group>(null);
  const leftArmRef = useRef<Group>(null); 
  const rightArmRef = useRef<Group>(null); 
  const headRef = useRef<Group>(null);
  
  // Base Refs
  const flagRef = useRef<Group>(null);
  const gateRef = useRef<Group>(null);

  // Horse Refs
  const horseBodyRef = useRef<Group>(null);
  const horseLegFLRef = useRef<Group>(null); // Front Left
  const horseLegFRRef = useRef<Group>(null); // Front Right
  const horseLegBLRef = useRef<Group>(null); // Back Left
  const horseLegBRRef = useRef<Group>(null); // Back Right
  
  // UI Refs
  const hpBarRef = useRef<Group>(null);
  const mpBarRef = useRef<Group>(null);
  const smokeRef = useRef<Group>(null);
  const bodyGroupRef = useRef<Group>(null);

  const isBase = entity.type === UnitType.BASE;
  const isGate = entity.type === UnitType.GATE;
  const isStructure = isBase || isGate;
  const isPlayer = entity.team === Team.PLAYER;
  const isHero = entity.id === 'player';
  const isLancer = entity.type === UnitType.LANCER;

  // Materials reuse
  const { materials, hpColor } = useMemo(() => {
    // Normal Colors
    const mainColor = isPlayer ? '#3b82f6' : '#ef4444'; 
    const armorColor = '#94a3b8'; // Standard Steel
    
    // Adjust opacity for invisibility
    const opacity = entity.isInvisible ? 0.3 : 1.0;
    const transparent = entity.isInvisible;
    
    // --- INVINCIBLE OVERRIDE ---
    const isInvincible = entity.isInvincible;
    const invincColor = '#FFD700'; // Gold

    const bodyMat = new MeshStandardMaterial({ 
        color: isInvincible ? invincColor : mainColor, 
        flatShading: true, 
        roughness: isInvincible ? 0.2 : 0.6, 
        metalness: isInvincible ? 0.8 : 0,
        emissive: isInvincible ? '#B8860B' : '#000000',
        emissiveIntensity: isInvincible ? 0.2 : 0,
        transparent, opacity 
    });

    const armorMat = new MeshStandardMaterial({ 
        color: isInvincible ? invincColor : armorColor, 
        flatShading: true, 
        metalness: isInvincible ? 1.0 : 0.5, 
        roughness: isInvincible ? 0.1 : 0.5, 
        emissive: isInvincible ? '#B8860B' : '#000000',
        emissiveIntensity: isInvincible ? 0.2 : 0,
        transparent, opacity 
    });

    return {
      hpColor: isPlayer ? '#22c55e' : '#ef4444',
      materials: {
        skin: new MeshStandardMaterial({ color: isInvincible ? invincColor : '#ffdbac', flatShading: true, roughness: 0.8, transparent, opacity }),
        primary: bodyMat, 
        armor: armorMat,
        secondary: new MeshStandardMaterial({ color: isPlayer ? '#1e40af' : '#991b1b', flatShading: true, transparent, opacity }),
        wood: new MeshStandardMaterial({ color: '#5d4037', flatShading: true, transparent, opacity }),
        metal: new MeshStandardMaterial({ color: '#e2e8f0', flatShading: true, metalness: 0.8, roughness: 0.2, transparent, opacity }),
        white: new MeshStandardMaterial({ color: '#ffffff', flatShading: true, transparent, opacity }),
        dark: new MeshStandardMaterial({ color: '#1e293b', flatShading: true, transparent, opacity }),
        smoke: new MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, flatShading: true }), 
        flagPole: new MeshStandardMaterial({ color: '#4a3b32', flatShading: true }),
        // Gate materials
        gateWood: new MeshStandardMaterial({ color: '#785645', flatShading: true, roughness: 0.9, transparent: true, opacity: 0.85 }),
        gateIron: new MeshStandardMaterial({ color: '#374151', metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.85 }),
        // Horse materials
        horseBody: new MeshStandardMaterial({ color: isInvincible ? invincColor : '#ffffff', flatShading: true, transparent, opacity, metalness: isInvincible ? 0.6 : 0, roughness: isInvincible ? 0.3 : 1 }), 
        horseDark: new MeshStandardMaterial({ color: '#3E2723', flatShading: true, transparent, opacity }),
        horseHoof: new MeshStandardMaterial({ color: '#1a1a1a', flatShading: true, transparent, opacity }),
      }
    };
  }, [entity.team, entity.isInvisible, entity.isInvincible]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime * 15;

    // --- DEATH ANIMATION ---
    if (entity.isDead) {
       if (hpBarRef.current && hpBarRef.current.parent) hpBarRef.current.parent.visible = false;
       
       if (isBase) {
           if (flagRef.current) {
                flagRef.current.children.forEach((child, i) => {
                    child.position.y -= 0.05 * (i + 1);
                    child.rotation.z += 0.05 * (i % 2 === 0 ? 1 : -1);
                    child.rotation.x += 0.02;
                    if (child.position.y < 0) child.position.y = 0; 
                });
           }
       } else if (isGate) {
           if (gateRef.current) {
               gateRef.current.position.y -= 0.1;
               if (gateRef.current.position.y < -5) gateRef.current.visible = false;
           }
       } else {
           if (bodyGroupRef.current) bodyGroupRef.current.visible = false;
           if (smokeRef.current) {
                smokeRef.current.visible = true;
                smokeRef.current.rotation.y += 0.05;
                smokeRef.current.scale.lerp(new Vector3(2.5, 2.5, 2.5), 0.08);
                smokeRef.current.position.y += 0.04;
                if (smokeRef.current.position.y > 2) smokeRef.current.visible = false;
           }
       }
       return; 
    } else {
        if (!isStructure && bodyGroupRef.current) bodyGroupRef.current.visible = true;
        if (hpBarRef.current && hpBarRef.current.parent) hpBarRef.current.parent.visible = true;
    }

    // HP Bar Logic
    if (hpBarRef.current) {
        const hpPct = Math.max(0, entity.hp / entity.maxHp);
        hpBarRef.current.scale.set(hpPct, 1, 1);
        const width = isStructure ? 5 : 1;
        hpBarRef.current.position.x = (width / 2) * (hpPct - 1);
        hpBarRef.current.visible = true; 
    }

    if (mpBarRef.current && isHero) {
        const mpPct = Math.max(0, (entity.mp || 0) / (entity.maxMp || 100));
        mpBarRef.current.scale.set(mpPct, 1, 1);
        const width = 1;
        mpBarRef.current.position.x = (width / 2) * (mpPct - 1);
    }

    // --- BASE ANIMATION ---
    if (isBase) {
        if (flagRef.current) {
            const banner = flagRef.current.getObjectByName('banner');
            if (banner) {
                banner.rotation.y = Math.sin(state.clock.elapsedTime * 3) * 0.1;
                banner.scale.z = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.05;
            }
        }
        return;
    }
    
    // --- GATE ANIMATION ---
    if (isGate) return;

    // --- CHEER ANIMATION (End of Game) ---
    const myTeamWon = (gameOutcome === 'VICTORY' && entity.team === Team.PLAYER) || 
                      (gameOutcome === 'DEFEAT' && entity.team === Team.ENEMY);
    
    if (myTeamWon) {
        if(torsoRef.current) torsoRef.current.position.y = Math.abs(Math.sin(state.clock.elapsedTime * 10)) * 0.5;
        if(leftArmRef.current) leftArmRef.current.rotation.z = Math.PI - 0.5;
        if(rightArmRef.current) rightArmRef.current.rotation.z = -Math.PI + 0.5;
        if(rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 10) * 0.5;
        // Fix Lancer Horse if cheering (Keep at -0.9)
        if (isLancer && horseBodyRef.current) horseBodyRef.current.position.y = -0.9;
        return;
    }


    // --- UNIT STANDARD ANIMATION ---

    // Breathing / Idle
    if (!entity.isMoving && !entity.isAttacking) {
      if(torsoRef.current) torsoRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.02;
      
      // Fix Lancer Horse Pos when idle (Reset to base offset -0.9)
      if (isLancer && horseBodyRef.current) {
          horseBodyRef.current.position.y = -0.9;
      }

      // Reset limbs
      if(leftLegRef.current) leftLegRef.current.rotation.x = MathUtils.lerp(leftLegRef.current.rotation.x, 0, 0.1);
      if(rightLegRef.current) rightLegRef.current.rotation.x = MathUtils.lerp(rightLegRef.current.rotation.x, 0, 0.1);
      if(leftArmRef.current) leftArmRef.current.rotation.x = MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.1);
      if(rightArmRef.current) rightArmRef.current.rotation.x = MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
      if(rightArmRef.current) rightArmRef.current.position.z = MathUtils.lerp(rightArmRef.current.position.z, 0, 0.1);
    }

    // Walking Animation
    if (entity.isMoving) {
      if (!isLancer) {
        // Human Walking
        if(torsoRef.current) torsoRef.current.position.y = Math.abs(Math.sin(t)) * 0.05;
        if(rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(t) * 0.6;
        if(leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;

        if (entity.type !== UnitType.ARCHER && leftArmRef.current) {
            leftArmRef.current.rotation.x = Math.sin(t) * 0.6;
        } else if (entity.type === UnitType.ARCHER && leftArmRef.current && !entity.isAttacking) {
             leftArmRef.current.rotation.x = Math.sin(t) * 0.2; 
        }
        
        if (!entity.isAttacking && rightArmRef.current) {
            rightArmRef.current.rotation.x = Math.sin(t + Math.PI) * 0.6;
        }
      } else {
        // Horse Gallop
        // Add animation to the BASE OFFSET (-0.9)
        if(horseBodyRef.current) horseBodyRef.current.position.y = -0.9 + Math.abs(Math.sin(t * 1.5)) * 0.1;
        
        // Rider bounces with horse
        if(torsoRef.current) torsoRef.current.position.y = Math.abs(Math.sin(t * 1.5)) * 0.1;

        if(horseLegFLRef.current) horseLegFLRef.current.rotation.x = Math.sin(t * 1.5) * 0.8;
        if(horseLegBLRef.current) horseLegBLRef.current.rotation.x = Math.sin(t * 1.5 + Math.PI) * 0.8;
        if(horseLegFRRef.current) horseLegFRRef.current.rotation.x = Math.sin(t * 1.5 + Math.PI) * 0.8;
        if(horseLegBRRef.current) horseLegBRRef.current.rotation.x = Math.sin(t * 1.5) * 0.8;
      }
    }

    // --- ATTACK ANIMATION ---
    const attackT = state.clock.elapsedTime * 25;
    
    if (entity.type === UnitType.ARCHER) {
         if (leftArmRef.current) {
             if (entity.isAttacking) {
                 leftArmRef.current.rotation.x = MathUtils.lerp(leftArmRef.current.rotation.x, -Math.PI / 2, 0.2);
             }
         }
         if (rightArmRef.current) {
             if (entity.isAttacking) {
                 rightArmRef.current.rotation.x = MathUtils.lerp(rightArmRef.current.rotation.x, -Math.PI / 2, 0.2);
                 const draw = (Math.sin(attackT * 0.5) + 1) / 2; 
                 rightArmRef.current.position.z = MathUtils.lerp(0, 0.3, draw);
             } else if (!entity.isMoving) {
                rightArmRef.current.position.z = MathUtils.lerp(rightArmRef.current.position.z, 0, 0.1);
             }
         }

    } else if (isLancer) {
        // Lancer Attack (Stab)
        if (entity.isAttacking && rightArmRef.current) {
            // Stab forward (Move Z + slightly adjust rot)
            const stab = Math.sin(attackT) * 0.5;
            rightArmRef.current.position.z = stab; 
            rightArmRef.current.rotation.x = -Math.PI / 3 + stab * 0.2; // Angle down slightly
        } else if (!entity.isMoving && rightArmRef.current) {
             rightArmRef.current.rotation.x = MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
             rightArmRef.current.position.z = MathUtils.lerp(rightArmRef.current.position.z, 0, 0.1);
        }
        // Ensure horse stays grounded during attack (at -0.9)
        if (horseBodyRef.current && !entity.isMoving) horseBodyRef.current.position.y = -0.9;

    } else {
         // MELEE (Warrior/Axeman)
         if (entity.isAttacking && rightArmRef.current) {
            rightArmRef.current.rotation.x = -Math.PI / 2 + Math.sin(attackT) * 1.5;
         } else if (!entity.isMoving && rightArmRef.current) {
            rightArmRef.current.rotation.x = MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
         }
    }

  });
  
  // Adjusted billboard height for Lancer since we are moving the unit up
  const billboardY = isBase ? 7.5 : (isGate ? 9 : (isLancer ? 3.5 : 2.4));

  return (
    <group 
        ref={groupRef} 
        scale={[scale, scale, scale]} 
        dispose={null}
        onClick={(e) => {
            if (onClick) {
                e.stopPropagation();
                onClick();
            }
        }}
        onPointerOver={() => { if(onClick) document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      
      <Billboard position={[0, billboardY, 0]}>
         {!isStructure && (
            <Text 
                position={[0, 0.35, 0]} 
                fontSize={0.4} 
                color="white" 
                outlineColor="black" 
                outlineWidth={0.05}
                fontWeight="bold"
            >
                {`Lv.${entity.level}`}
            </Text>
         )}
         <mesh>
            <planeGeometry args={[isStructure ? 5 : 1, isStructure ? 0.4 : (isHero ? 0.2 : 0.1)]} />
            <meshBasicMaterial color="black" />
         </mesh>
         <mesh ref={hpBarRef} position={[0, isHero ? 0.05 : 0, 0.01]}> 
             <planeGeometry args={[isStructure ? 5 : 1, isStructure ? 0.35 : 0.08]} />
             <meshBasicMaterial color={hpColor} />
         </mesh>
         {isHero && (
             <mesh ref={mpBarRef} position={[0, -0.05, 0.01]}>
                 <planeGeometry args={[1, 0.06]} />
                 <meshBasicMaterial color="#3b82f6" />
             </mesh>
         )}
      </Billboard>

      {/* --- BASE MODEL (FLAG) --- */}
      {isBase && (
          <group ref={flagRef}>
              <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                  <cylinderGeometry args={[1, 1.2, 1, 6]} />
                  <meshStandardMaterial color="#57534e" flatShading />
              </mesh>
              <mesh position={[0, 3, 0]} castShadow>
                  <cylinderGeometry args={[0.1, 0.15, 6]} />
                  <primitive object={materials.flagPole} />
              </mesh>
              <mesh position={[0, 6, 0]}>
                  <sphereGeometry args={[0.2]} />
                  <meshStandardMaterial color="#fcd34d" />
              </mesh>
              <mesh name="banner" position={[0.9, 5, 0]} castShadow>
                  <boxGeometry args={[1.8, 1.5, 0.1]} />
                  <primitive object={materials.primary} />
              </mesh>
          </group>
      )}

      {/* --- GATE MODEL --- */}
      {isGate && (
          <group ref={gateRef} position={[0, 4, 0]}>
               <mesh castShadow receiveShadow>
                   <boxGeometry args={[12, 8, 1]} />
                   <primitive object={materials.gateWood} />
               </mesh>
               <mesh position={[0, 0, 0.51]}>
                   <boxGeometry args={[11, 0.5, 0.1]} />
                   <primitive object={materials.gateIron} />
               </mesh>
               <mesh position={[0, 2, 0.51]}>
                   <boxGeometry args={[11, 0.5, 0.1]} />
                   <primitive object={materials.gateIron} />
               </mesh>
               <mesh position={[0, -2, 0.51]}>
                   <boxGeometry args={[11, 0.5, 0.1]} />
                   <primitive object={materials.gateIron} />
               </mesh>
               <mesh position={[0, 0, 0.51]} rotation={[0, 0, Math.PI/2]}>
                   <boxGeometry args={[7, 0.5, 0.1]} />
                   <primitive object={materials.gateIron} />
               </mesh>
               <mesh position={[1, -0.5, 0.6]} rotation={[Math.PI/2, 0, 0]}>
                   <torusGeometry args={[0.4, 0.1, 8, 16]} />
                   <primitive object={materials.white} />
               </mesh>
               <mesh position={[-1, -0.5, 0.6]} rotation={[Math.PI/2, 0, 0]}>
                   <torusGeometry args={[0.4, 0.1, 8, 16]} />
                   <primitive object={materials.white} />
               </mesh>
          </group>
      )}

      {/* --- UNIT MODEL --- */}
      {!isStructure && (
      <>
        {/* Death Smoke */}
        <group ref={smokeRef} visible={false}>
            <mesh position={[0, 0.5, 0]} material={materials.smoke}>
                <dodecahedronGeometry args={[0.5]} />
            </mesh>
            <mesh position={[0.3, 0.8, 0.3]} material={materials.smoke}>
                <dodecahedronGeometry args={[0.3]} />
            </mesh>
            <mesh position={[-0.3, 0.8, -0.2]} material={materials.smoke}>
                <dodecahedronGeometry args={[0.3]} />
            </mesh>
        </group>

        {/* Character Body Group - Raise higher for Lancer (1.15 offset + -0.9 horse = 0.25 net horse center) */}
        <group ref={bodyGroupRef} position={[0, isLancer ? 1.15 : 0.85, 0]}>
            
            {/* HORSE (Sibling of Torso in hierarchy, but pushed down) */}
            {isLancer && (
                // Pushed down significantly to ensure rider sits ON TOP
                // Position Y=-0.9 relative to Rider Group.
                <group position={[0, -0.9, 0]} ref={horseBodyRef}>
                    {/* Body - Center at +0.6 relative to Horse Group */}
                    <mesh position={[0, 0.6, 0]} castShadow>
                        <boxGeometry args={[0.5, 0.5, 1.2]} />
                        <primitive object={materials.horseBody} />
                    </mesh>
                    {/* Neck & Head Group */}
                    <group position={[0, 0.8, 0.5]} rotation={[-0.5, 0, 0]}>
                        <mesh position={[0, 0.2, 0]}>
                            <boxGeometry args={[0.3, 0.6, 0.3]} />
                            <primitive object={materials.horseBody} />
                        </mesh>
                        {/* Snout */}
                        <mesh position={[0, 0.4, 0.2]} rotation={[0.5, 0, 0]}>
                             <boxGeometry args={[0.3, 0.3, 0.4]} />
                             <primitive object={materials.horseBody} />
                        </mesh>
                        
                        {/* Mane */}
                         <mesh position={[0, 0.3, -0.16]}>
                             <boxGeometry args={[0.1, 0.5, 0.1]} />
                             <primitive object={materials.horseDark} />
                        </mesh>

                        {/* --- HORSE FACE DETAILS --- */}
                        {/* Eyes - On sides of the head block */}
                        <mesh position={[0.16, 0.3, 0]}>
                             <boxGeometry args={[0.02, 0.05, 0.05]} />
                             <primitive object={materials.dark} />
                        </mesh>
                        <mesh position={[-0.16, 0.3, 0]}>
                             <boxGeometry args={[0.02, 0.05, 0.05]} />
                             <primitive object={materials.dark} />
                        </mesh>
                        {/* Mouth/Nostrils - At tip of snout */}
                         <mesh position={[0, 0.35, 0.41]}>
                             <boxGeometry args={[0.2, 0.05, 0.02]} />
                             <primitive object={materials.dark} />
                        </mesh>
                    </group>

                    {/* Tail */}
                    <mesh position={[0, 0.7, -0.6]} rotation={[0.5, 0, 0]}>
                        <boxGeometry args={[0.1, 0.4, 0.1]} />
                        <primitive object={materials.horseDark} />
                    </mesh>

                    {/* Legs */}
                    <group position={[-0.2, 0.4, 0.4]} ref={horseLegFLRef}>
                        <mesh position={[0, -0.4, 0]}>
                             <boxGeometry args={[0.12, 0.8, 0.12]} />
                             <primitive object={materials.horseBody} />
                        </mesh>
                         <mesh position={[0, -0.8, 0]}>
                             <boxGeometry args={[0.14, 0.1, 0.14]} />
                             <primitive object={materials.horseHoof} />
                        </mesh>
                    </group>
                    <group position={[0.2, 0.4, 0.4]} ref={horseLegFRRef}>
                        <mesh position={[0, -0.4, 0]}>
                             <boxGeometry args={[0.12, 0.8, 0.12]} />
                             <primitive object={materials.horseBody} />
                        </mesh>
                         <mesh position={[0, -0.8, 0]}>
                             <boxGeometry args={[0.14, 0.1, 0.14]} />
                             <primitive object={materials.horseHoof} />
                        </mesh>
                    </group>
                    <group position={[-0.2, 0.4, -0.4]} ref={horseLegBLRef}>
                        <mesh position={[0, -0.4, 0]}>
                             <boxGeometry args={[0.12, 0.8, 0.12]} />
                             <primitive object={materials.horseBody} />
                        </mesh>
                         <mesh position={[0, -0.8, 0]}>
                             <boxGeometry args={[0.14, 0.1, 0.14]} />
                             <primitive object={materials.horseHoof} />
                        </mesh>
                    </group>
                    <group position={[0.2, 0.4, -0.4]} ref={horseLegBRRef}>
                        <mesh position={[0, -0.4, 0]}>
                             <boxGeometry args={[0.12, 0.8, 0.12]} />
                             <primitive object={materials.horseBody} />
                        </mesh>
                         <mesh position={[0, -0.8, 0]}>
                             <boxGeometry args={[0.14, 0.1, 0.14]} />
                             <primitive object={materials.horseHoof} />
                        </mesh>
                    </group>
                </group>
            )}

            {/* Torso Group */}
            <group ref={torsoRef}>
                <mesh position={[0, 0.4, 0]} material={materials.armor} castShadow>
                <boxGeometry args={[0.5, 0.6, 0.3]} />
                </mesh>
                <mesh position={[0, 0.45, 0.16]} material={materials.primary} castShadow>
                <boxGeometry args={[0.35, 0.3, 0.05]} />
                </mesh>
                <mesh position={[0, 0.1, 0]} material={materials.dark}>
                    <boxGeometry args={[0.52, 0.1, 0.32]} />
                </mesh>

                {/* HEAD */}
                <group position={[0, 0.9, 0]} ref={headRef}>
                    {/* Open Faced Helmet Logic: Back/Top covered, Face open */}
                    <mesh position={[0, 0, 0.05]} material={materials.skin}>
                         <boxGeometry args={[0.25, 0.3, 0.2]} />
                    </mesh>

                    {/* FACE DETAILS */}
                    <mesh position={[-0.05, 0.03, 0.16]} material={materials.dark}>
                        <boxGeometry args={[0.025, 0.025, 0.02]} />
                    </mesh>
                    <mesh position={[0.05, 0.03, 0.16]} material={materials.dark}>
                        <boxGeometry args={[0.025, 0.025, 0.02]} />
                    </mesh>
                    <mesh position={[0, -0.01, 0.16]} material={materials.skin}>
                        <boxGeometry args={[0.03, 0.06, 0.03]} />
                    </mesh>
                    <mesh position={[0, -0.06, 0.16]} material={materials.dark}>
                        <boxGeometry args={[0.06, 0.01, 0.01]} />
                    </mesh>
                    <mesh position={[0, -0.11, 0.16]} material={materials.wood}>
                        <boxGeometry args={[0.26, 0.08, 0.02]} />
                    </mesh>
                    
                    {/* HELMET (Refactored to be open-faced) */}
                    <mesh position={[0, 0.05, -0.08]} material={materials.armor}>
                        <boxGeometry args={[0.32, 0.35, 0.18]} />
                    </mesh>
                    {/* Top Dome */}
                    <mesh position={[0, 0.22, 0]} material={materials.armor}>
                         <boxGeometry args={[0.3, 0.1, 0.28]} />
                    </mesh>
                    {/* Cheek Guards - Extended to cover gap with top dome and side face */}
                    <mesh position={[0.14, 0.01, 0.07]} material={materials.armor}>
                        <boxGeometry args={[0.04, 0.32, 0.14]} /> 
                    </mesh>
                    <mesh position={[-0.14, 0.01, 0.07]} material={materials.armor}>
                        <boxGeometry args={[0.04, 0.32, 0.14]} /> 
                    </mesh>
                    {/* Brow Band */}
                    <mesh position={[0, 0.15, 0.15]} material={materials.armor}>
                        <boxGeometry args={[0.32, 0.05, 0.05]} />
                    </mesh>
                    
                    {/* Plume/Crest */}
                    <mesh position={[0, 0.28, 0]} rotation={[0.2, 0, 0]} material={materials.primary}>
                        <boxGeometry args={[0.1, 0.2, 0.2]} />
                    </mesh>
                </group>

                {/* RIGHT ARM & WEAPON */}
                <group position={[-0.35, 0.6, 0]} ref={rightArmRef}>
                    <mesh position={[0, -0.25, 0]} material={materials.armor} castShadow>
                        <boxGeometry args={[0.15, 0.6, 0.15]} />
                    </mesh>
                    <mesh position={[0, -0.55, 0]} material={materials.skin}>
                        <sphereGeometry args={[0.09]} />
                    </mesh>
                    
                    {/* WEAPON */}
                    <group position={[0, -0.55, 0.05]}> 
                        {entity.type === UnitType.WARRIOR && (
                            // Warrior Sword
                            <group rotation={[Math.PI / 4, 0, 0]} position={[0, 0, 0]}>
                                <mesh material={materials.dark} position={[0, 0.1, 0]}>
                                    <cylinderGeometry args={[0.03, 0.03, 0.3]} />
                                </mesh>
                                <mesh material={materials.metal} position={[0, 0.25, 0]}>
                                    <boxGeometry args={[0.3, 0.05, 0.05]} />
                                </mesh>
                                <mesh material={materials.metal} position={[0, 0.7, 0]}>
                                    <boxGeometry args={[0.08, 0.9, 0.02]} />
                                </mesh>
                            </group>
                        )}
                        {entity.type === UnitType.AXEMAN && (
                            // Axeman Axe (Rotated blade to face forward)
                            <group rotation={[Math.PI / 6, 0, 0]} position={[0, 0.1, 0]}>
                                <mesh material={materials.wood} position={[0, 0.3, 0]}>
                                     <cylinderGeometry args={[0.03, 0.03, 0.7]} />
                                </mesh>
                                <group position={[0, 0.6, 0]} rotation={[0, 0, 0]}> 
                                    <mesh material={materials.metal} position={[0, 0, 0.15]} rotation={[0, Math.PI/2, 0]}>
                                         <boxGeometry args={[0.3, 0.3, 0.05]} />
                                    </mesh>
                                    <mesh material={materials.metal} position={[0, 0, -0.05]} rotation={[0, Math.PI/2, 0]}>
                                         <boxGeometry args={[0.1, 0.15, 0.05]} />
                                    </mesh>
                                </group>
                            </group>
                        )}
                        {entity.type === UnitType.LANCER && (
                            // Lancer Spear
                            <group rotation={[Math.PI/2, 0, 0]} position={[0, -0.3, 0.5]}>
                                {/* Shaft */}
                                <mesh position={[0, 0.5, 0]}>
                                    <cylinderGeometry args={[0.03, 0.03, 2.5]} />
                                    <meshStandardMaterial color="#8D6E63" />
                                </mesh>
                                {/* Hand guard */}
                                <mesh position={[0, -0.4, 0]}>
                                     <cylinderGeometry args={[0.1, 0.05, 0.2]} />
                                     <meshStandardMaterial color="#3E2723" />
                                </mesh>
                                {/* Tip */}
                                <mesh position={[0, 1.8, 0]}>
                                     <coneGeometry args={[0.05, 0.4]} />
                                     <meshStandardMaterial color="#CFD8DC" metalness={0.8} roughness={0.2} />
                                </mesh>
                            </group>
                        )}
                    </group>
                </group>

                {/* LEFT ARM */}
                <group position={[0.35, 0.6, 0]} ref={leftArmRef}>
                    <mesh position={[0, -0.25, 0]} material={materials.armor} castShadow>
                        <boxGeometry args={[0.15, 0.6, 0.15]} />
                    </mesh>
                    <mesh position={[0, -0.55, 0]} material={materials.skin}>
                        <sphereGeometry args={[0.09]} />
                    </mesh>

                    {/* Archer Bow in Left Hand */}
                    {entity.type === UnitType.ARCHER && (
                        <group position={[0, -0.55, 0.05]} rotation={[Math.PI, Math.PI / 2, 0]}>
                            <mesh material={materials.wood} position={[0, 0, 0]} rotation={[0, 0, 0]}>
                                <torusGeometry args={[0.4, 0.04, 8, 20, Math.PI]} />
                            </mesh>
                            <mesh material={materials.white} rotation={[0, 0, Math.PI/2]} position={[0, -0.2, 0]}>
                                <cylinderGeometry args={[0.005, 0.005, 0.8]} />
                            </mesh>
                        </group>
                    )}
                </group>

            </group>

            {/* LEGS (If rider, they are straddling) */}
            <group 
                position={[-0.15, 0, 0]} 
                ref={rightLegRef} 
                rotation={isLancer ? [0, 0, -0.5] : [0,0,0]} // Wider stance for rider
            >
                <mesh position={[0, -0.4, 0]} material={materials.armor} castShadow>
                    <boxGeometry args={[0.18, 0.8, 0.2]} />
                </mesh>
                <mesh position={[0, -0.8, 0.05]} material={materials.dark}>
                    <boxGeometry args={[0.2, 0.15, 0.3]} />
                </mesh>
            </group>

            <group 
                position={[0.15, 0, 0]} 
                ref={leftLegRef} 
                rotation={isLancer ? [0, 0, 0.5] : [0,0,0]} // Wider stance for rider
            >
                <mesh position={[0, -0.4, 0]} material={materials.armor} castShadow>
                    <boxGeometry args={[0.18, 0.8, 0.2]} />
                </mesh>
                <mesh position={[0, -0.8, 0.05]} material={materials.dark}>
                    <boxGeometry args={[0.2, 0.15, 0.3]} />
                </mesh>
            </group>
        </group>
      </>
      )}
    </group>
  );
};

export default React.memo(UnitMesh, (prev, next) => 
    prev.entity === next.entity && 
    prev.scale === next.scale && 
    prev.gameOutcome === next.gameOutcome &&
    prev.onClick === next.onClick
);