// ... (imports remain the same)
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Stars, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { UnitType, Team, GameEntity, PlayerState, GAME_CONFIG, GameOutcome, Projectile, SkillType, SKILL_STATS, FireWall, Crater, UnitCounts } from '../types';
import { getTerrainHeight, randomRange, generateId, distance, resolveRectCollision, resolveCircleCollision, RectCollider, CircleCollider } from '../utils/gameUtils';
import { playSound } from '../utils/audio';
import UnitMesh from './UnitMesh';
import { ArrowMesh } from './ArrowMesh';
import Castle from './Castle';
import Spawner from './Spawner';

interface WorldProps {
  inputRef: React.MutableRefObject<{ x: number, y: number, isAttacking: boolean }>;
  setPlayerHp: (hp: number) => void;
  setPlayerMp: (cb: (mp: number) => number) => void;
  playerMp: number; 
  playerMaxHp: number;
  playerMaxMp: number;
  playerLevel: number;
  setStructureHps: (hps: { playerBase: number, playerGate: number, enemyBase: number, enemyGate: number }) => void;
  setPlayerGold: (cb: (g: number) => number) => void;
  setEnemyGold: (cb: (g: number) => number) => void;
  setGameOutcome: (outcome: GameOutcome) => void;
  gameOutcome: GameOutcome;
  respawnTrigger: number;
  setIsPlayerInvisible: (val: boolean) => void;
  isPlayerInvisible: boolean;
  setIsPlayerInvincible: (val: boolean) => void; // New prop
  isPlayerInvincible: boolean; // New prop
  
  // Kill Counters
  setPlayerKills: (cb: (k: number) => number) => void;
  setEnemyKills: (cb: (k: number) => number) => void;

  // Player Upgrade Props
  warriorLevel: number;
  archerLevel: number;
  axemanLevel: number;
  lancerLevel: number;
  warriorSpawnerLevel: number;
  archerSpawnerLevel: number;
  axemanSpawnerLevel: number;
  lancerSpawnerLevel: number;
  playerSkills: SkillType[];
  playerSkillTrigger: { skill: SkillType, timestamp: number } | null;
  
  // Enemy Upgrade Props
  enemyWarriorLevel: number;
  enemyArcherLevel: number;
  enemyAxemanLevel: number;
  enemyLancerLevel: number;
  enemyWarriorSpawnerLevel: number;
  enemyArcherSpawnerLevel: number;
  enemyAxemanSpawnerLevel: number;
  enemyLancerSpawnerLevel: number;

  onSpawnerClick: (type: UnitType) => void;
  onBaseClick: () => void;
  updateCooldowns: (cds: Record<SkillType, number>) => void;
  setUnitCounts: (counts: UnitCounts) => void;
}

// Fixed Spawner Locations (Updated to be inside the new larger walls)
const SPAWN_POINTS = {
    PLAYER: {
        WARRIOR: { x: -6, z: 58 },
        ARCHER: { x: 6, z: 58 },
        AXEMAN: { x: -12, z: 65 }, // Inside Castle Left
        LANCER: { x: 12, z: 65 }   // Inside Castle Right
    },
    ENEMY: {
        WARRIOR: { x: -6, z: -58 }, 
        ARCHER: { x: 6, z: -58 },
        AXEMAN: { x: -12, z: -65 }, // Inside Castle Left
        LANCER: { x: 12, z: -65 }   // Inside Castle Right
    }
};

// Conditional Walls (Front Walls near Gates)
const PLAYER_FRONT_WALLS: RectCollider[] = [
    { x: -14, z: 50, width: 16, depth: 4 },
    { x: 14, z: 50, width: 16, depth: 4 }
];

const ENEMY_FRONT_WALLS: RectCollider[] = [
    { x: -14, z: -50, width: 16, depth: 4 },
    { x: 14, z: -50, width: 16, depth: 4 }
];

const World: React.FC<WorldProps> = ({ 
    inputRef, 
    setPlayerHp, 
    setPlayerMp,
    playerMp,
    playerMaxHp,
    playerMaxMp,
    playerLevel,
    setStructureHps, 
    setPlayerGold, 
    setEnemyGold, 
    setGameOutcome, 
    gameOutcome, 
    respawnTrigger,
    setIsPlayerInvisible,
    isPlayerInvisible,
    setIsPlayerInvincible,
    isPlayerInvincible,
    setPlayerKills,
    setEnemyKills,
    warriorLevel,
    archerLevel,
    axemanLevel,
    lancerLevel,
    warriorSpawnerLevel,
    archerSpawnerLevel,
    axemanSpawnerLevel,
    lancerSpawnerLevel,
    playerSkills,
    playerSkillTrigger,
    enemyWarriorLevel,
    enemyArcherLevel,
    enemyAxemanLevel,
    enemyLancerLevel,
    enemyWarriorSpawnerLevel,
    enemyArcherSpawnerLevel,
    enemyAxemanSpawnerLevel,
    enemyLancerSpawnerLevel,
    onSpawnerClick,
    onBaseClick,
    updateCooldowns,
    setUnitCounts
}) => {
  const { camera, gl, scene } = useThree();
  
  // Camera State
  const [cameraYaw, setCameraYaw] = useState(0);
  const [cameraPitch, setCameraPitch] = useState(0.6); 
  const [cameraZoom, setCameraZoom] = useState(30); 
  
  // Cycle State
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunMeshRef = useRef<THREE.Mesh>(null);
  const moonMeshRef = useRef<THREE.Group>(null);
  
  // Double tap detection
  const lastTapRef = useRef(0);

  // Performance Optimization Refs
  const lastReportedHp = useRef<number>(playerMaxHp);
  const lastReportedStructureHps = useRef({
      playerBase: GAME_CONFIG.BASE_HP, 
      playerGate: GAME_CONFIG.BASE_HP,
      enemyBase: GAME_CONFIG.BASE_HP,
      enemyGate: GAME_CONFIG.BASE_HP
  });

  const touchState = useRef<{
    mode: 'none' | 'manipulate'; 
    startDist: number;
    startMidX: number;
    startMidY: number;
    startYaw: number;
    startPitch: number;
    startZoom: number;
  }>({
    mode: 'none',
    startDist: 0,
    startMidX: 0,
    startMidY: 0,
    startYaw: 0,
    startPitch: 0,
    startZoom: 0
  });

  const isBottomInterfaceArea = (y: number) => {
      return y > window.innerHeight * 0.66;
  };

  const getMidpoint = (t1: Touch, t2: Touch) => {
      return {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2
      };
  };

  // Camera Input Handler
  useEffect(() => {
    const el = gl.domElement.parentElement || document.body; 

    const onTouchStart = (e: TouchEvent) => {
      const now = Date.now();
      
      if (e.target === gl.domElement && e.touches.length === 1 && now - lastTapRef.current < 300) {
        if (!isBottomInterfaceArea(e.touches[0].clientY)) {
             setCameraYaw(0);
             setCameraPitch(0.6);
             setCameraZoom(30);
             lastTapRef.current = 0;
             return;
        }
      }
      lastTapRef.current = now;

      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const mid = getMidpoint(t1, t2);
        if (isBottomInterfaceArea(mid.y)) return;

        e.preventDefault();

        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        touchState.current.mode = 'manipulate';
        touchState.current.startDist = dist;
        touchState.current.startZoom = cameraZoom;
        
        touchState.current.startMidX = mid.x;
        touchState.current.startMidY = mid.y;
        touchState.current.startYaw = cameraYaw;
        touchState.current.startPitch = cameraPitch;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (touchState.current.mode === 'manipulate' && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const scale = touchState.current.startDist / dist;
        const newZoom = Math.max(10, Math.min(60, touchState.current.startZoom * scale));
        setCameraZoom(newZoom);

        const mid = getMidpoint(t1, t2);
        const midDx = mid.x - touchState.current.startMidX;
        const midDy = mid.y - touchState.current.startMidY;

        setCameraYaw(touchState.current.startYaw + midDx * 0.008);
        
        let newPitch = touchState.current.startPitch + midDy * 0.008;
        newPitch = Math.max(0.2, Math.min(Math.PI / 2.2, newPitch)); 
        setCameraPitch(newPitch);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        touchState.current.mode = 'none';
      }
    };
    
    const onMouseDown = (e: MouseEvent) => {
         if (e.target !== gl.domElement || isBottomInterfaceArea(e.clientY)) return;
         touchState.current.mode = 'manipulate'; 
         touchState.current.startMidX = e.clientX;
         touchState.current.startMidY = e.clientY;
         touchState.current.startYaw = cameraYaw;
         touchState.current.startPitch = cameraPitch;
    };
    const onMouseMove = (e: MouseEvent) => {
        if (e.buttons === 1 && touchState.current.mode === 'manipulate') {
             const dx = e.clientX - touchState.current.startMidX;
             const dy = e.clientY - touchState.current.startMidY;
             setCameraYaw(touchState.current.startYaw + dx * 0.008);
             let newPitch = touchState.current.startPitch + dy * 0.008;
             newPitch = Math.max(0.2, Math.min(Math.PI / 2.2, newPitch)); 
             setCameraPitch(newPitch);
        }
    }
    const onMouseUp = () => {
         touchState.current.mode = 'none';
    }

    const onDblClick = (e: MouseEvent) => {
         if (e.target !== gl.domElement) return;
         setCameraYaw(0);
         setCameraPitch(0.6);
         setCameraZoom(30);
    }
    
    const onWheel = (e: WheelEvent) => {
        setCameraZoom(prev => Math.max(10, Math.min(60, prev + e.deltaY * 0.01)));
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false }); 
    window.addEventListener('touchend', onTouchEnd);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('dblclick', onDblClick);
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('dblclick', onDblClick);
      el.removeEventListener('wheel', onWheel);
    };
  }, [gl.domElement, cameraYaw, cameraPitch, cameraZoom]); 

  
  // Game State Refs
  const playerRef = useRef<PlayerState>({
    id: 'player',
    type: UnitType.WARRIOR,
    team: Team.PLAYER,
    position: { x: 0, y: 0, z: GAME_CONFIG.CASTLE_Z - 5 }, 
    rotation: Math.PI, 
    hp: 100,
    maxHp: 100,
    mp: 100,
    maxMp: 100,
    targetId: null,
    lastAttackTime: 0,
    isDead: false,
    isMoving: false,
    isAttacking: false,
    radius: 0.5,
    level: 1,
    learnedSkills: [],
    skillCooldowns: {} as any,
    speedMultiplier: 1.0,
    isInvincible: false
  });

  // Sync playerRef with Props Synchronously for Visuals and Game Loop
  // We use useMemo as a way to update the ref during render phase, or simple assignment.
  // Direct assignment is cleaner for this pattern where ref holds mutable game state separate from react state.
  playerRef.current.mp = playerMp;
  playerRef.current.maxMp = playerMaxMp;
  playerRef.current.maxHp = playerMaxHp;
  playerRef.current.level = playerLevel;
  playerRef.current.isInvisible = isPlayerInvisible;
  playerRef.current.isInvincible = isPlayerInvincible;

  // Helper to sync MP state and ref
  const addPlayerMp = (amount: number) => {
      const player = playerRef.current;
      if (player.mp < player.maxMp) {
          const newMp = Math.min(player.maxMp, player.mp + amount);
          player.mp = newMp;
          setPlayerMp(prev => Math.min(player.maxMp, prev + amount));
      }
  };

  const [entities, setEntities] = useState<GameEntity[]>([]);
  const entitiesRef = useRef<GameEntity[]>([]); 
  
  // Update unit counts whenever entities change
  useEffect(() => {
      const counts: UnitCounts = {
          [Team.PLAYER]: { [UnitType.WARRIOR]: 0, [UnitType.ARCHER]: 0, [UnitType.AXEMAN]: 0, [UnitType.LANCER]: 0 },
          [Team.ENEMY]: { [UnitType.WARRIOR]: 0, [UnitType.ARCHER]: 0, [UnitType.AXEMAN]: 0, [UnitType.LANCER]: 0 }
      };

      entities.forEach(u => {
          if (!u.isDead && u.type !== UnitType.BASE && u.type !== UnitType.GATE) {
              if (counts[u.team]) {
                  if (counts[u.team][u.type] !== undefined) {
                      counts[u.team][u.type]++;
                  } else {
                      counts[u.team][u.type] = 1;
                  }
              }
          }
      });
      setUnitCounts(counts);
  }, [entities, setUnitCounts]);

  // Projectiles
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);

  // Fire Walls & Craters
  const [fireWalls, setFireWalls] = useState<FireWall[]>([]);
  const fireWallsRef = useRef<FireWall[]>([]);

  const [craters, setCraters] = useState<Crater[]>([]);
  const cratersRef = useRef<Crater[]>([]);

  // Initialize Bases AND Gates
  useEffect(() => {
      // --- PLAYER CASTLE ---
      const playerBase: GameEntity = {
          id: 'base_player',
          type: UnitType.BASE,
          team: Team.PLAYER,
          position: { x: 0, y: 0, z: GAME_CONFIG.CASTLE_Z },
          rotation: Math.PI, 
          hp: GAME_CONFIG.BASE_HP,
          maxHp: GAME_CONFIG.BASE_HP,
          targetId: null,
          lastAttackTime: 0,
          isDead: false,
          isMoving: false,
          isAttacking: false,
          radius: 1.5,
          level: 1,
          speedMultiplier: 1.0
      };

      const playerGate: GameEntity = {
          id: 'gate_player',
          type: UnitType.GATE,
          team: Team.PLAYER,
          position: { x: 0, y: 0, z: GAME_CONFIG.CASTLE_Z - 15 }, // Z=50
          rotation: Math.PI,
          hp: GAME_CONFIG.BASE_HP,
          maxHp: GAME_CONFIG.BASE_HP,
          targetId: null,
          lastAttackTime: 0,
          isDead: false,
          isMoving: false,
          isAttacking: false,
          radius: 4, // Large targeting radius
          level: 1
      };
      
      // --- ENEMY CASTLE ---
      const enemyBase: GameEntity = {
          id: 'base_enemy',
          type: UnitType.BASE,
          team: Team.ENEMY,
          position: { x: 0, y: 0, z: -GAME_CONFIG.CASTLE_Z },
          rotation: 0, 
          hp: GAME_CONFIG.BASE_HP,
          maxHp: GAME_CONFIG.BASE_HP,
          targetId: null,
          lastAttackTime: 0,
          isDead: false,
          isMoving: false,
          isAttacking: false,
          radius: 1.5,
          level: 1,
          speedMultiplier: 1.0
      };

      const enemyGate: GameEntity = {
          id: 'gate_enemy',
          type: UnitType.GATE,
          team: Team.ENEMY,
          position: { x: 0, y: 0, z: -(GAME_CONFIG.CASTLE_Z - 15) }, // Z=-50
          rotation: 0,
          hp: GAME_CONFIG.BASE_HP,
          maxHp: GAME_CONFIG.BASE_HP,
          targetId: null,
          lastAttackTime: 0,
          isDead: false,
          isMoving: false,
          isAttacking: false,
          radius: 4, 
          level: 1
      };
      
      entitiesRef.current = [playerBase, playerGate, enemyBase, enemyGate];
      setEntities([...entitiesRef.current]);
  }, []);

  // Handle Respawn Trigger
  useEffect(() => {
    if (respawnTrigger > 0) {
      playerRef.current.hp = playerMaxHp;
      playerRef.current.mp = playerMaxMp;
      setPlayerMp(() => playerMaxMp); // Reset UI MP
      playerRef.current.isDead = false;
      playerRef.current.deathTime = undefined;
      playerRef.current.position.x = 0;
      playerRef.current.position.z = GAME_CONFIG.CASTLE_Z - 5; 
      playerRef.current.isInvisible = false;
      setIsPlayerInvisible(false);
      
      // Activate Invincible on Respawn
      playerRef.current.isInvincible = true;
      setIsPlayerInvincible(true);
      playSound('invincible');

      const duration = SKILL_STATS[SkillType.INVINCIBLE].duration || 6000;
      const timeoutId = setTimeout(() => {
          if (playerRef.current) {
              playerRef.current.isInvincible = false;
              setIsPlayerInvincible(false);
          }
      }, duration);
      
      fireWallsRef.current = [];
      setFireWalls([]);
      
      cratersRef.current = [];
      setCraters([]);

      return () => clearTimeout(timeoutId);
    }
  }, [respawnTrigger, playerMaxHp, playerMaxMp]);

  // Handle Skill Trigger from UI
  useEffect(() => {
      if (playerSkillTrigger) {
          useSkill(playerSkillTrigger.skill);
      }
  }, [playerSkillTrigger]);

  const useSkill = (skill: SkillType) => {
      const now = Date.now();
      const config = SKILL_STATS[skill];
      const player = playerRef.current;

      if (player.isDead || gameOutcome) return;

      // Deduct MP (UI check already done, but double check)
      if (player.mp < config.cost) return;
      
      // Update Ref MP and State MP
      player.mp -= config.cost;
      setPlayerMp(prev => Math.max(0, prev - config.cost));

      // Set Cooldown
      player.skillCooldowns[skill] = now + config.cooldown;
      updateCooldowns({ ...player.skillCooldowns });

      // Execute Skill
      if (skill === SkillType.FIREBALL || skill === SkillType.CANNON) {
          const dmg = config.damage + (player.level - 1) * 10; // Level scaling for skills
          const spawnOffset = new THREE.Vector3(0, 1.5, 0);
          const direction = new THREE.Vector3(Math.sin(player.rotation), 0, Math.cos(player.rotation));
          const spawnPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z).add(spawnOffset);
          const targetPos = spawnPos.clone().add(direction.multiplyScalar(30)); // Shoot straight ahead

          const projectile: Projectile = {
              id: generateId(),
              ownerTeam: Team.PLAYER,
              startPos: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
              targetId: null, // Directional
              targetPos: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
              position: { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z },
              speed: config.speed,
              damage: dmg,
              progress: 0,
              visualType: skill === SkillType.CANNON ? 'CANNONBALL' : 'FIREBALL',
              radius: skill === SkillType.CANNON ? 1.5 : 1.0,
              explosionRadius: config.explosionRadius
          };
          projectilesRef.current.push(projectile);
          setProjectiles([...projectilesRef.current]);
          
          playSound(skill === SkillType.CANNON ? 'cannon' : 'fireball');
      } else if (skill === SkillType.INVISIBILITY) {
          player.isInvisible = true;
          setIsPlayerInvisible(true); // Trigger re-render of mesh
          playSound('invisibility');
          // Reset invisibility after duration
          setTimeout(() => {
              if (playerRef.current) {
                  playerRef.current.isInvisible = false;
                  setIsPlayerInvisible(false);
              }
          }, config.duration || 5000);
      } else if (skill === SkillType.INVINCIBLE) {
          player.isInvincible = true;
          setIsPlayerInvincible(true);
          playSound('invincible');
          
          setTimeout(() => {
             if (playerRef.current) {
                 playerRef.current.isInvincible = false;
                 setIsPlayerInvincible(false);
             }
          }, config.duration || 6000);
      }
  };
  
  // Terrain
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(GAME_CONFIG.MAP_SIZE * 2, GAME_CONFIG.MAP_SIZE * 2, 64, 64);
    geo.rotateX(-Math.PI / 2);
    const posAttribute = geo.attributes.position;
    for (let i = 0; i < posAttribute.count; i++) {
      const x = posAttribute.getX(i);
      const z = posAttribute.getZ(i);
      posAttribute.setY(i, getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Environment & Obstacles
  const { trees, rocks, staticObstacles } = useMemo(() => {
      const treeItems = [];
      const rockItems = [];
      const obstacles: (RectCollider | CircleCollider)[] = [];

      // Trees
      for(let i=0; i<40; i++) {
          const r = randomRange(15, GAME_CONFIG.MAP_SIZE - 20);
          const theta = randomRange(0, Math.PI * 2);
          const x = Math.sin(theta) * r;
          const z = Math.cos(theta) * r;
          if (Math.abs(z) > 40) continue; // Expanded exclusion zone for bigger castles
          const y = getTerrainHeight(x, z);
          const scale = randomRange(0.8, 1.5);
          treeItems.push({ position: [x, y, z] as [number, number, number], scale: [scale, scale, scale] as [number, number, number] });
          obstacles.push({ x, z, radius: 0.6 } as CircleCollider); // Tree collision
      }

      // Rocks
      for(let i=0; i<20; i++) {
          const r = randomRange(10, GAME_CONFIG.MAP_SIZE - 20);
          const theta = randomRange(0, Math.PI * 2);
          const x = Math.sin(theta) * r;
          const z = Math.cos(theta) * r;
          if (Math.abs(z) > 40) continue;
          const y = getTerrainHeight(x, z);
          const scale = randomRange(0.5, 1.2);
          rockItems.push({ position: [x, y, z] as [number, number, number], scale: [scale, scale * 0.6, scale] as [number, number, number], rotation: [randomRange(0, Math.PI), randomRange(0, Math.PI), randomRange(0, Math.PI)] as [number, number, number] });
          obstacles.push({ x, z, radius: 1.0 * scale } as CircleCollider); // Rock collision
      }

      // Spawners (treated as circular obstacles)
      Object.values(SPAWN_POINTS.PLAYER).forEach(p => obstacles.push({ x: p.x, z: p.z, radius: 1.0 }));
      Object.values(SPAWN_POINTS.ENEMY).forEach(p => obstacles.push({ x: p.x, z: p.z, radius: 1.0 }));

      // --- CASTLE WALLS ---
      // PLAYER CASTLE (Center Z = 65)
      obstacles.push({ x: 0, z: 80, width: 44, depth: 4 } as RectCollider); // Back
      obstacles.push({ x: -20, z: 65, width: 4, depth: 30 } as RectCollider); // Left
      obstacles.push({ x: 20, z: 65, width: 4, depth: 30 } as RectCollider); // Right
      // Front Wall moved to conditional logic (Z = 50)

      // ENEMY CASTLE (Center Z = -65)
      obstacles.push({ x: 0, z: -80, width: 44, depth: 4 } as RectCollider); // Back
      obstacles.push({ x: -20, z: -65, width: 4, depth: 30 } as RectCollider); // Left
      obstacles.push({ x: 20, z: -65, width: 4, depth: 30 } as RectCollider); // Right
      // Front Wall moved to conditional logic (Z = -50)

      return { trees: treeItems, rocks: rockItems, staticObstacles: obstacles };
  }, []);

  // Collision Resolver Function
  const resolvePosition = (x: number, z: number, r: number, selfId: string, dynamicUnits: GameEntity[], player: PlayerState, currentFireWalls: FireWall[]) => {
      let nx = x;
      let nz = z;
      
      const selfUnit = selfId === 'player' ? player : dynamicUnits.find(u => u.id === selfId);
      const myTeam = selfUnit?.team || Team.PLAYER; // Default to player team if logic fails

      // 1. Static Obstacles (Unconditional Walls, Trees, Rocks)
      for (const obs of staticObstacles) {
          if ('width' in obs) {
              const res = resolveRectCollision(nx, nz, r, obs as RectCollider);
              nx = res.x;
              nz = res.z;
          } else {
              const res = resolveCircleCollision(nx, nz, r, obs.x, obs.z, (obs as CircleCollider).radius);
              nx = res.x;
              nz = res.z;
          }
      }

      // 2. Conditional Front Walls (Permeable to owners)
      if (myTeam === Team.ENEMY) {
          // Enemies interact with Player Front Walls (cannot pass)
          for (const wall of PLAYER_FRONT_WALLS) {
              const res = resolveRectCollision(nx, nz, r, wall);
              nx = res.x;
              nz = res.z;
          }
          // Enemies pass through Enemy Front Walls (ignore)
      } else {
          // Player/Allies interact with Enemy Front Walls (cannot pass)
          for (const wall of ENEMY_FRONT_WALLS) {
              const res = resolveRectCollision(nx, nz, r, wall);
              nx = res.x;
              nz = res.z;
          }
          // Player/Allies pass through Player Front Walls (ignore)
      }

      // 3. Fire Walls (Act as temporary obstacles)
      for (const fw of currentFireWalls) {
           const res = resolveCircleCollision(nx, nz, r, fw.position.x, fw.position.z, fw.radius);
           nx = res.x;
           nz = res.z;
      }

      // 4. Dynamic Units (Separation + GATES)
      const checkUnit = (u: GameEntity | PlayerState) => {
          if (u.id === selfId || u.isDead) return;

          // GATE Logic
          if (u.type === UnitType.GATE) {
             // If my team, pass through. If enemy team, block.
             if (u.team === myTeam) {
                 return; // Ignore collision
             } else {
                 // Treat Enemy Gate as a solid Rectangle (width ~10, depth ~2)
                 const gateRect = { x: u.position.x, z: u.position.z, width: 12, depth: 3 };
                 const res = resolveRectCollision(nx, nz, r, gateRect);
                 nx = res.x;
                 nz = res.z;
                 return;
             }
          }

          const res = resolveCircleCollision(nx, nz, r, u.position.x, u.position.z, u.radius);
          nx = nx + (res.x - nx) * 0.5;
          nz = nz + (res.z - nz) * 0.5;
      };

      for (const u of dynamicUnits) checkUnit(u);
      if (selfId !== player.id) checkUnit(player);

      return { x: nx, z: nz };
  };

  // Spawner Logic
  // Using refs to keep track of accumulated time for different spawners
  const lastSpawnTimeWarrior = useRef(0);
  const lastSpawnTimeArcher = useRef(0);
  const lastSpawnTimeAxeman = useRef(0);
  const lastSpawnTimeLancer = useRef(0);

  const lastEnemySpawnTimeWarrior = useRef(0);
  const lastEnemySpawnTimeArcher = useRef(0);
  const lastEnemySpawnTimeAxeman = useRef(0);
  const lastEnemySpawnTimeLancer = useRef(0);
  
  // Regen logic
  const lastRegenTime = useRef(0);

  // We need to run spawn logic in a loop, but with variable intervals
  useFrame((state) => {
      if (gameOutcome) return;
      const time = state.clock.elapsedTime * 1000;

      // REGEN LOOP (2 Seconds)
      if (time - lastRegenTime.current > GAME_CONFIG.REGEN_INTERVAL) {
          lastRegenTime.current = time;
          const player = playerRef.current;
          if (!player.isDead) {
              // HP Regen (Use dynamic maxHp)
              if (player.hp < player.maxHp) {
                  player.hp = Math.min(player.maxHp, player.hp + 1);
                  setPlayerHp(player.hp);
                  lastReportedHp.current = player.hp;
              }
              // MP Regen (Use dynamic maxMp logic inside helper)
              addPlayerMp(1);
          }
      }

      // Calculate Intervals based on Level for BOTH teams symmetrically
      // Formula: Base (3100ms) - (Level - 1) * 100ms
      const baseInterval = GAME_CONFIG.SPAWN_RATE_MS;
      const reductionPerLevel = 100; // 0.1s
      
      const calculateInterval = (level: number) => {
          // Cap reduction to not go below 200ms
          return Math.max(200, baseInterval - (level - 1) * reductionPerLevel);
      };

      const warriorInterval = calculateInterval(warriorSpawnerLevel);
      const archerInterval = calculateInterval(archerSpawnerLevel);
      const axemanInterval = calculateInterval(axemanSpawnerLevel);
      const lancerInterval = calculateInterval(lancerSpawnerLevel);

      const enemyWarriorInterval = calculateInterval(enemyWarriorSpawnerLevel);
      const enemyArcherInterval = calculateInterval(enemyArcherSpawnerLevel);
      const enemyAxemanInterval = calculateInterval(enemyAxemanSpawnerLevel);
      const enemyLancerInterval = calculateInterval(enemyLancerSpawnerLevel);

      const TARGET_COUNT = 24; // Increased limit for more unit types
      const activeEnemies = entitiesRef.current.filter(e => e.team === Team.ENEMY && !e.isDead && e.type !== UnitType.BASE && e.type !== UnitType.GATE);
      const activeAllies = entitiesRef.current.filter(e => e.team === Team.PLAYER && !e.isDead && e.type !== UnitType.BASE && e.type !== UnitType.GATE);

      // Player Spawns
      if (activeAllies.length < TARGET_COUNT) {
          if (time - lastSpawnTimeWarrior.current > warriorInterval) {
              spawnUnit(Team.PLAYER, UnitType.WARRIOR, warriorLevel);
              lastSpawnTimeWarrior.current = time;
          }
          if (time - lastSpawnTimeArcher.current > archerInterval) {
              spawnUnit(Team.PLAYER, UnitType.ARCHER, archerLevel);
              lastSpawnTimeArcher.current = time;
          }
          if (time - lastSpawnTimeAxeman.current > axemanInterval) {
              spawnUnit(Team.PLAYER, UnitType.AXEMAN, axemanLevel);
              lastSpawnTimeAxeman.current = time;
          }
          if (time - lastSpawnTimeLancer.current > lancerInterval) {
              spawnUnit(Team.PLAYER, UnitType.LANCER, lancerLevel);
              lastSpawnTimeLancer.current = time;
          }
      }

      // Enemy Spawns (Symmetrical logic)
      if (activeEnemies.length < TARGET_COUNT) {
          if (time - lastEnemySpawnTimeWarrior.current > enemyWarriorInterval) {
              spawnUnit(Team.ENEMY, UnitType.WARRIOR, enemyWarriorLevel);
              lastEnemySpawnTimeWarrior.current = time;
          }
          if (time - lastEnemySpawnTimeArcher.current > enemyArcherInterval) {
              spawnUnit(Team.ENEMY, UnitType.ARCHER, enemyArcherLevel);
              lastEnemySpawnTimeArcher.current = time;
          }
          if (time - lastEnemySpawnTimeAxeman.current > enemyAxemanInterval) {
              spawnUnit(Team.ENEMY, UnitType.AXEMAN, enemyAxemanLevel);
              lastEnemySpawnTimeAxeman.current = time;
          }
          if (time - lastEnemySpawnTimeLancer.current > enemyLancerInterval) {
              spawnUnit(Team.ENEMY, UnitType.LANCER, enemyLancerLevel);
              lastEnemySpawnTimeLancer.current = time;
          }
      }

      // --- LANCER RALLY LOGIC ---
      // Check if we have 6 or more rallying lancers, then release them
      const playerLancersWaiting = entitiesRef.current.filter(e => e.team === Team.PLAYER && e.type === UnitType.LANCER && e.isRallying);
      if (playerLancersWaiting.length >= 6) {
          playerLancersWaiting.forEach(u => u.isRallying = false);
      }
      
      const enemyLancersWaiting = entitiesRef.current.filter(e => e.team === Team.ENEMY && e.type === UnitType.LANCER && e.isRallying);
      if (enemyLancersWaiting.length >= 6) {
          enemyLancersWaiting.forEach(u => u.isRallying = false);
      }
  });


  const spawnUnit = (team: Team, type: UnitType, level: number) => {
    // Determine spawn position based on type and team
    let spawnConfig;
    if (team === Team.PLAYER) {
        if (type === UnitType.WARRIOR) spawnConfig = SPAWN_POINTS.PLAYER.WARRIOR;
        else if (type === UnitType.ARCHER) spawnConfig = SPAWN_POINTS.PLAYER.ARCHER;
        else if (type === UnitType.AXEMAN) spawnConfig = SPAWN_POINTS.PLAYER.AXEMAN;
        else spawnConfig = SPAWN_POINTS.PLAYER.LANCER;
    } else {
        if (type === UnitType.WARRIOR) spawnConfig = SPAWN_POINTS.ENEMY.WARRIOR;
        else if (type === UnitType.ARCHER) spawnConfig = SPAWN_POINTS.ENEMY.ARCHER;
        else if (type === UnitType.AXEMAN) spawnConfig = SPAWN_POINTS.ENEMY.AXEMAN;
        else spawnConfig = SPAWN_POINTS.ENEMY.LANCER;
    }

    const spawnX = spawnConfig.x + randomRange(-0.5, 0.5);
    const spawnZ = spawnConfig.z + randomRange(-0.5, 0.5);

    // Stats Configuration
    let baseHp = 50; 
    let radius = 0.5;
    
    if (type === UnitType.ARCHER) baseHp = 25;
    if (type === UnitType.LANCER) {
        baseHp = 80; // High HP
        radius = 0.8; // Bigger collider for horse
    }

    const maxHp = baseHp + (level - 1) * (type === UnitType.LANCER ? 15 : 10);

    const newUnit: GameEntity = {
      id: generateId(),
      type,
      team,
      position: { x: spawnX, y: getTerrainHeight(spawnX, spawnZ), z: spawnZ },
      rotation: team === Team.PLAYER ? Math.PI : 0, 
      hp: maxHp,
      maxHp,
      targetId: null,
      lastAttackTime: 0,
      isDead: false,
      isMoving: false,
      isAttacking: false,
      radius,
      level,
      speedMultiplier: 1.0,
      // Lancers start in Rallying mode
      isRallying: type === UnitType.LANCER
    };

    entitiesRef.current.push(newUnit);
    setEntities([...entitiesRef.current]);
  };

  // Pre-allocate color objects for memory efficiency
  const noonColor = useMemo(() => new THREE.Color('#87CEEB'), []);
  const sunsetColor = useMemo(() => new THREE.Color('#ED7014'), []);
  const nightColor = useMemo(() => new THREE.Color('#0b1026'), []);
  const sunLightColor = useMemo(() => new THREE.Color('#fffce0'), []);
  const moonLightColor = useMemo(() => new THREE.Color('#a5b4fc'), []);

  // Game Loop
  useFrame((state, delta) => {
    // --- Day/Night Cycle ---
    const cycleDuration = 120; // 2 minutes per day
    const time = state.clock.elapsedTime;
    const cycleProgress = (time % cycleDuration) / cycleDuration; // 0 to 1
    const angle = cycleProgress * Math.PI * 2; // 0 to 2PI

    const radius = 120;
    const sunX = Math.cos(angle) * radius; // East to West
    const sunY = Math.sin(angle) * radius; // Up and Down
    const sunZ = -60; // Bias towards background
    
    const sunPos = new THREE.Vector3(sunX, sunY, sunZ);
    
    // Sun Visual Mesh
    if (sunMeshRef.current) {
        sunMeshRef.current.position.copy(sunPos);
        sunMeshRef.current.lookAt(0,0,0);
    }
    
    // Moon Visual Mesh (Opposite to Sun)
    if (moonMeshRef.current) {
        moonMeshRef.current.position.set(-sunX, -sunY, sunZ);
        moonMeshRef.current.lookAt(0,0,0);
    }

    // Sky Background Color Animation
    const sunHeight = Math.sin(angle); // 1 = Noon, -1 = Midnight
    
    let bgColor = new THREE.Color();
    if (sunHeight > 0.3) {
        // Day
        bgColor.copy(noonColor);
    } else if (sunHeight > -0.1) {
        // Sunset / Sunrise
        if (sunHeight > 0.1) {
             const t = (sunHeight - 0.1) / 0.2; // 0 to 1
             bgColor.lerpColors(sunsetColor, noonColor, t);
        } else {
             const t = (sunHeight + 0.1) / 0.2;
             bgColor.lerpColors(nightColor, sunsetColor, t);
        }
    } else {
        // Night
        bgColor.copy(nightColor);
    }
    scene.background = bgColor;

    // Lighting Updates
    if (lightRef.current && ambientRef.current) {
        let dirIntensity = 0;
        let ambIntensity = 0.5; // Base visibility
        
        const isDay = sunHeight > 0;
        
        if (isDay) {
            lightRef.current.position.copy(sunPos);
            lightRef.current.color.lerp(sunLightColor, 0.1);
            dirIntensity = 0.8 + Math.max(0, sunHeight) * 0.4;
            ambIntensity = 0.6 + Math.max(0, sunHeight) * 0.3;
        } else {
            lightRef.current.position.set(-sunX, -sunY, sunZ); // Moon position
            lightRef.current.color.lerp(moonLightColor, 0.1);
            dirIntensity = 0.5; 
            ambIntensity = 0.5; 
        }

        lightRef.current.intensity = dirIntensity;
        ambientRef.current.intensity = ambIntensity;
    }


    if (gameOutcome) return; 

    const now = state.clock.elapsedTime * 1000;
    const player = playerRef.current;

    // --- Fire Wall Logic ---
    let fireWallsChanged = false;
    fireWallsRef.current = fireWallsRef.current.filter(fw => {
        if (now > fw.createdAt + fw.duration) {
            fireWallsChanged = true;
            return false;
        }
        return true;
    });

    // --- Crater Logic (Slowing Effect) ---
    let cratersChanged = false;
    cratersRef.current = cratersRef.current.filter(c => {
        if (now > c.createdAt + c.duration) {
            cratersChanged = true;
            return false;
        }
        return true;
    });

    // Check Fire Wall Damage (10 dmg per 500ms)
    // Apply to ALL units (Player + Enemies + Allies)
    const checkFireDamage = (unit: GameEntity | PlayerState) => {
        if (unit.isDead) return;

        // Invincibility check for Player
        if (unit.id === 'player' && (unit as PlayerState).isInvincible) return;
        
        // Cooldown check
        if (unit.lastBurnTime && now - unit.lastBurnTime < 500) return;

        let burning = false;
        for (const fw of fireWallsRef.current) {
             const dist = distance(unit.position, fw.position);
             if (dist < fw.radius + unit.radius) {
                 burning = true;
                 break;
             }
        }

        if (burning) {
            unit.hp -= 10;
            unit.lastBurnTime = now;
            // Break Rally if damaged
            if (unit.isRallying) unit.isRallying = false;

            if (unit.type !== UnitType.BASE && unit.type !== UnitType.GATE) playSound('hit');

            if (unit.hp <= 0) {
                 unit.isDead = true;
                 unit.deathTime = now;
                 if (unit.id === 'player') {
                     playSound('death');
                     setEnemyKills(k => k + 1);
                 } else {
                     playSound('death');
                     if (unit.team === Team.ENEMY) {
                         setPlayerGold(g => g + GAME_CONFIG.GOLD_REWARD_UNIT);
                         setPlayerKills(k => k + 1);
                         addPlayerMp(GAME_CONFIG.MP_ON_KILL);
                     } else if (unit.team === Team.PLAYER) {
                         setEnemyGold(g => g + GAME_CONFIG.GOLD_REWARD_UNIT);
                         setEnemyKills(k => k + 1);
                     }
                 }
            }
        }
    }

    // Apply Slow Effect from Craters (Resets every frame)
    const checkCraterSlow = (unit: GameEntity | PlayerState) => {
        if (unit.isDead) return;
        
        // Reset speed modifier first
        unit.speedMultiplier = 1.0;

        for (const crater of cratersRef.current) {
             const dist = distance(unit.position, crater.position);
             if (dist < crater.radius + unit.radius) {
                 unit.speedMultiplier = 0.4; // 60% Slow
                 // Craters don't damage, so rally doesn't necessarily break, but maybe it should?
                 // Prompt said "attack if attacked". Slowing isn't damage. Keep rallying unless damaged.
                 break; 
             }
        }
    }
    
    checkFireDamage(player);
    checkCraterSlow(player);

    entitiesRef.current.forEach(u => {
        checkFireDamage(u);
        checkCraterSlow(u);
    });
    
    if (fireWallsChanged) setFireWalls([...fireWallsRef.current]);
    if (cratersChanged) setCraters([...cratersRef.current]);


    // --- Player Logic ---
    if (!player.isDead) {
      const { x: dx, y: dy, isAttacking } = inputRef.current;
      
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        player.isMoving = true;
        
        const cos = Math.cos(cameraYaw);
        const sin = Math.sin(cameraYaw);
        
        const rotDx = dx * cos - dy * sin;
        const rotDz = dx * sin + dy * cos;

        // Player Level Speed Upgrade + Slow Modifier
        const speed = GAME_CONFIG.PLAYER_SPEED * (1 + (player.level - 1) * 0.05) * (player.speedMultiplier || 1.0);

        const moveX = rotDx * speed;
        const moveZ = rotDz * speed; 

        // Apply movement
        let nextX = player.position.x + moveX;
        let nextZ = player.position.z + moveZ;

        // Collision Resolution (Static + Units + FireWalls)
        const resolved = resolvePosition(nextX, nextZ, player.radius, player.id, entitiesRef.current, player, fireWallsRef.current);
        nextX = resolved.x;
        nextZ = resolved.z;

        player.position.x = Math.max(-GAME_CONFIG.BOUNDS, Math.min(GAME_CONFIG.BOUNDS, nextX));
        player.position.z = Math.max(-GAME_CONFIG.BOUNDS, Math.min(GAME_CONFIG.BOUNDS, nextZ));
        
        player.rotation = Math.atan2(moveX, moveZ);
      } else {
        player.isMoving = false;
        // Even if idle, resolve collisions
        const resolved = resolvePosition(player.position.x, player.position.z, player.radius, player.id, entitiesRef.current, player, fireWallsRef.current);
        player.position.x = resolved.x;
        player.position.z = resolved.z;
      }

      player.position.y = getTerrainHeight(player.position.x, player.position.z);

      // Attack
      if (isAttacking) {
        if (!player.isAttacking) player.isAttacking = true;

        if (now - player.lastAttackTime > GAME_CONFIG.ATTACK_COOLDOWN) {
            player.lastAttackTime = now;
            playSound('attack');
            
            entitiesRef.current.forEach(e => {
                if (e.team === Team.ENEMY && !e.isDead) {
                    const dist = distance(player.position, e.position);
                    let range = GAME_CONFIG.ATTACK_RANGE_MELEE * 1.5;
                    if (e.type === UnitType.BASE) range = GAME_CONFIG.ATTACK_RANGE_BASE;
                    if (e.type === UnitType.GATE) range = GAME_CONFIG.ATTACK_RANGE_BASE;

                    if (dist < range) { 
                         // Player Level Attack Upgrade + Invincible Bonus (2x)
                         let dmg = 25 + (player.level - 1) * 5;
                         if (player.isInvincible) dmg *= 2; 

                         e.hp -= dmg;
                         
                         // Break rally if attacked (melee hit from player)
                         if (e.isRallying) e.isRallying = false;

                         if (e.type === UnitType.BASE || e.type === UnitType.GATE) playSound('hit');
                         else playSound('hit');

                         if (e.hp <= 0) {
                             e.isDead = true;
                             e.deathTime = now;
                             setPlayerGold(g => g + (e.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                             setPlayerKills(k => k + 1);

                             // Gain MP on kill
                             addPlayerMp(GAME_CONFIG.MP_ON_KILL);

                             if (e.type === UnitType.BASE) {
                                playSound('crumble');
                                setTimeout(() => {
                                    setGameOutcome('VICTORY');
                                    playSound('victory');
                                }, 1000);
                             } else if (e.type === UnitType.GATE) {
                                playSound('crumble');
                             } else {
                                playSound('death');
                             }
                         }
                    }
                }
            });
        }
      } else {
          player.isAttacking = false;
      }
    }
    
    // OPTIMIZED STATE UPDATES: Only update if value changed to prevent heavy re-renders
    if (Math.floor(player.hp) !== Math.floor(lastReportedHp.current)) {
         setPlayerHp(player.hp);
         lastReportedHp.current = player.hp;
    }

    // --- AI Logic ---
    let unitsChanged = false;
    let pBaseHp = 0;
    let eBaseHp = 0;
    let pGateHp = 0;
    let eGateHp = 0;

    entitiesRef.current.forEach(unit => {
      if (unit.type === UnitType.BASE) {
          if (unit.team === Team.PLAYER) pBaseHp = unit.hp;
          else eBaseHp = unit.hp;
      }
      if (unit.type === UnitType.GATE) {
          if (unit.team === Team.PLAYER) pGateHp = unit.hp;
          else eGateHp = unit.hp;
      }

      if (unit.isDead || unit.type === UnitType.BASE) return;
      if (unit.type === UnitType.GATE) return; // Gates don't think

      // Select Target
      let target: GameEntity | PlayerState | null = null;
      
      let enemies: (GameEntity | PlayerState)[];
      if (unit.team === Team.PLAYER) {
          enemies = entitiesRef.current.filter(e => e.team === Team.ENEMY && !e.isDead);
      } else {
          // ENEMY Team Targeting
          const potentialTargets = entitiesRef.current.filter(e => e.team === Team.PLAYER && !e.isDead);
          // Only add player if NOT invisible
          if (!player.isDead && !player.isInvisible) {
              potentialTargets.push(player);
          }
          enemies = potentialTargets;
      }
      
      let minDist = Infinity;
      enemies.forEach(e => {
          const d = distance(unit.position, e.position);
          if (d < minDist) {
              minDist = d;
              target = e;
          }
      });

      // RALLYING LOGIC
      // If rallying, stay near spawn unless an enemy is VERY close (Self Defense)
      if (unit.isRallying) {
          if (minDist < 5) {
              // Enemy too close! Break rally and attack
              unit.isRallying = false;
          } else {
              // Just wait. 
              // To prevent stacking, we can try to move them slightly towards a rally point
              // Player Spawn Z=65, Rally Point Z=55
              // Enemy Spawn Z=-65, Rally Point Z=-55
              const rallyZ = unit.team === Team.PLAYER ? 55 : -55;
              const dx = unit.position.x - unit.position.x; // Keep X
              const dz = rallyZ - unit.position.z;
              const distToRally = Math.abs(dz);

              if (distToRally > 1) {
                   unit.isMoving = true;
                   unit.isAttacking = false;
                   const angle = Math.atan2(0, dz);
                   unit.rotation = angle;
                   
                   const speed = GAME_CONFIG.UNIT_SPEED * 1.4; // Lancers are fast
                   let nextZ = unit.position.z + Math.cos(angle) * speed;
                   
                   // Simple resolve
                   const resolved = resolvePosition(unit.position.x, nextZ, unit.radius, unit.id, entitiesRef.current, player, fireWallsRef.current);
                   unit.position.z = resolved.z;
                   unit.position.x = resolved.x;
              } else {
                  unit.isMoving = false;
                   // Resolve collision to keep them apart
                   const resolved = resolvePosition(unit.position.x, unit.position.z, unit.radius, unit.id, entitiesRef.current, player, fireWallsRef.current);
                   unit.position.x = resolved.x;
                   unit.position.z = resolved.z;
              }
              // Skip normal attack logic
              return;
          }
      }

      if (!target || target.isDead) {
          unit.isMoving = false;
          unit.isAttacking = false;
          return;
      }

      const distToTarget = distance(unit.position, target.position);
      let range = unit.type === UnitType.ARCHER ? GAME_CONFIG.ATTACK_RANGE_RANGED : GAME_CONFIG.ATTACK_RANGE_MELEE;
      
      // Lancer has slightly more reach
      if (unit.type === UnitType.LANCER) range *= 1.2;

      if (target.type === UnitType.BASE) range = GAME_CONFIG.ATTACK_RANGE_BASE;
      if (target.type === UnitType.GATE) range = GAME_CONFIG.ATTACK_RANGE_BASE;

      // Apply Level Speed Modifier + Slow + Unit Type Modifier
      let unitBaseSpeed = GAME_CONFIG.UNIT_SPEED;
      if (unit.type === UnitType.AXEMAN) unitBaseSpeed *= 0.7; // Axeman is slower
      if (unit.type === UnitType.LANCER) unitBaseSpeed *= 1.4; // Lancer is faster

      const speed = unitBaseSpeed * (1 + (unit.level - 1) * 0.05) * (unit.speedMultiplier || 1.0);

      if (distToTarget > range) {
          unit.isMoving = true;
          unit.isAttacking = false;
          const dx = target.position.x - unit.position.x;
          const dz = target.position.z - unit.position.z;
          const angle = Math.atan2(dx, dz);
          unit.rotation = angle;
          
          let nextX = unit.position.x + Math.sin(angle) * speed;
          let nextZ = unit.position.z + Math.cos(angle) * speed;

          // Collision Resolution
          const resolved = resolvePosition(nextX, nextZ, unit.radius, unit.id, entitiesRef.current, player, fireWallsRef.current);
          nextX = resolved.x;
          nextZ = resolved.z;

          unit.position.x = Math.max(-GAME_CONFIG.BOUNDS, Math.min(GAME_CONFIG.BOUNDS, nextX));
          unit.position.z = Math.max(-GAME_CONFIG.BOUNDS, Math.min(GAME_CONFIG.BOUNDS, nextZ));

          unit.position.y = getTerrainHeight(unit.position.x, unit.position.z);
      } else {
          unit.isMoving = false;
          // Still resolve collisions to avoid stacking when stopped
          const resolved = resolvePosition(unit.position.x, unit.position.z, unit.radius, unit.id, entitiesRef.current, player, fireWallsRef.current);
          unit.position.x = resolved.x;
          unit.position.z = resolved.z;
          
          const dx = target.position.x - unit.position.x;
          const dz = target.position.z - unit.position.z;
          unit.rotation = Math.atan2(dx, dz);

          if (now - unit.lastAttackTime > GAME_CONFIG.ATTACK_COOLDOWN + randomRange(0, 500)) {
              unit.isAttacking = true;
              unit.lastAttackTime = now;
              playSound('attack');

              // Damage Calculation based on level & type
              let baseDmg = 4; // Warrior
              if (unit.type === UnitType.ARCHER) baseDmg = 3;
              if (unit.type === UnitType.AXEMAN) baseDmg = 7;
              if (unit.type === UnitType.LANCER) baseDmg = 8; // Lancer Hits hard

              const dmg = baseDmg + (unit.level - 1) * 1.5;

              if (unit.type === UnitType.ARCHER) {
                  // Fire Projectile
                  const arrow: Projectile = {
                      id: generateId(),
                      ownerTeam: unit.team,
                      startPos: { ...unit.position, y: unit.position.y + 1 },
                      targetId: target.id,
                      targetPos: { ...target.position, y: target.position.y + 1 }, // Aim at chest
                      position: { ...unit.position, y: unit.position.y + 1 },
                      speed: GAME_CONFIG.ARROW_SPEED,
                      damage: dmg,
                      progress: 0
                  };
                  projectilesRef.current.push(arrow);
                  setProjectiles([...projectilesRef.current]);

              } else {
                  // Melee Damage Immediate
                  if (target.id === 'player') {
                      // Invincibility check
                      const pState = target as PlayerState;
                      if (!pState.isInvincible) {
                          const playerDmg = Math.floor(dmg * 0.5); // Reduce dmg to player slightly
                          target.hp -= playerDmg;
                          playSound('hit');
                          if (target.hp <= 0) {
                              target.isDead = true;
                              target.deathTime = now;
                              playSound('death');
                              setEnemyGold(g => g + GAME_CONFIG.GOLD_REWARD_UNIT);
                              setEnemyKills(k => k + 1);
                          }
                      } else {
                          // Invincible hit effect?
                      }
                  } else {
                      target.hp -= dmg;
                      
                      // Break Rally if attacked
                      if (target.isRallying) target.isRallying = false;

                      if (target.type !== UnitType.BASE && target.type !== UnitType.GATE) playSound('hit');
                      else playSound('hit');
                      
                      if (target.hp <= 0) {
                          target.isDead = true;
                          target.deathTime = now;
                          
                          if (unit.team === Team.PLAYER && target.team === Team.ENEMY) {
                              setPlayerGold(g => g + (target.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                              setPlayerKills(k => k + 1);
                          } else if (unit.team === Team.ENEMY && target.team === Team.PLAYER) {
                              setEnemyGold(g => g + (target.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                              setEnemyKills(k => k + 1);
                          }

                          if (target.type === UnitType.BASE) {
                              playSound('crumble');
                              setTimeout(() => {
                                  if (target.team === Team.PLAYER) {
                                      setGameOutcome('DEFEAT');
                                      playSound('defeat');
                                  } else {
                                      setGameOutcome('VICTORY');
                                      playSound('victory');
                                  }
                              }, 1000);
                          } else if (target.type === UnitType.GATE) {
                              playSound('crumble');
                              unitsChanged = true;
                          } else {
                              playSound('death');
                              unitsChanged = true;
                          }
                      }
                  }
              }
              
              setTimeout(() => { unit.isAttacking = false; }, 300);
          }
      }
    });

    // --- Projectile Logic ---
    let projectilesChanged = false;
    const remainingProjectiles: Projectile[] = [];

    projectilesRef.current.forEach(proj => {
        proj.progress += proj.speed * 0.1; // Speed factor
        
        // Lerp position (Linear)
        const p1 = proj.startPos;
        const p2 = proj.targetPos;
        
        // Directional Projectile Logic (Skills)
        if (!proj.targetId) {
             // Simply move forward along vector
             // progress 0 = start, progress 1 = max range
             const dx = p2.x - p1.x;
             const dy = p2.y - p1.y;
             const dz = p2.z - p1.z;
             proj.position.x = p1.x + dx * proj.progress;
             proj.position.y = p1.y + dy * proj.progress;
             proj.position.z = p1.z + dz * proj.progress;

             const hitRadius = proj.radius || 1.0;
             let hit = false;
             
             // Check if it hit something or reached end
             if (proj.progress < 1) {
                 for (const enemy of entitiesRef.current) {
                     if (enemy.team !== proj.ownerTeam && !enemy.isDead) {
                         const d = distance(proj.position, enemy.position);
                         if (d < hitRadius) {
                             hit = true;
                             break;
                         }
                     }
                 }
                 // Check fire wall collision? (Projectiles fly over, so no)
             }

             if (hit || proj.progress >= 1) {
                 projectilesChanged = true; 
                 // EXPLOSION LOGIC (AoE)
                 if (proj.explosionRadius) {
                     const boomCenter = proj.position;
                     entitiesRef.current.forEach(enemy => {
                         if (enemy.team !== proj.ownerTeam && !enemy.isDead) {
                             const distToBoom = distance(boomCenter, enemy.position);
                             if (distToBoom <= proj.explosionRadius!) {
                                 // Apply Damage
                                 enemy.hp -= proj.damage;
                                 
                                 // Break rally if attacked by AoE
                                 if (enemy.isRallying) enemy.isRallying = false;

                                 if (enemy.hp <= 0) {
                                     enemy.isDead = true;
                                     enemy.deathTime = now;
                                     if (enemy.team === Team.ENEMY) {
                                         setPlayerGold(g => g + (enemy.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                                         setPlayerKills(k => k + 1);
                                         addPlayerMp(GAME_CONFIG.MP_ON_KILL);
                                     } else if (enemy.team === Team.PLAYER) {
                                         setEnemyGold(g => g + (enemy.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                                         setEnemyKills(k => k + 1);
                                     }

                                     if (enemy.type === UnitType.BASE) {
                                          playSound('crumble');
                                          setTimeout(() => setGameOutcome('VICTORY'), 1000);
                                     } else if (enemy.type === UnitType.GATE) {
                                          playSound('crumble');
                                     }
                                 }
                             }
                         }
                     });
                     playSound('hit'); // Explosion sound

                     // FIREBALL SPECIAL: Create Fire Wall
                     if (proj.visualType === 'FIREBALL') {
                         fireWallsRef.current.push({
                             id: generateId(),
                             position: { x: boomCenter.x, y: getTerrainHeight(boomCenter.x, boomCenter.z), z: boomCenter.z },
                             radius: 2.5,
                             createdAt: now,
                             duration: 3000 // 3 seconds
                         });
                         setFireWalls([...fireWallsRef.current]);
                     }
                     
                     // CANNON SPECIAL: Create Mud Crater (Slow Zone)
                     if (proj.visualType === 'CANNONBALL') {
                         cratersRef.current.push({
                             id: generateId(),
                             position: { x: boomCenter.x, y: getTerrainHeight(boomCenter.x, boomCenter.z), z: boomCenter.z },
                             radius: 3.5,
                             createdAt: now,
                             duration: 5000 // 5 seconds
                         });
                         setCraters([...cratersRef.current]);
                     }

                 }
             } else {
                 remainingProjectiles.push(proj);
             }

        } else {
            // Targeted Projectile (Arrows)
            proj.position.x = p1.x + (p2.x - p1.x) * proj.progress;
            proj.position.y = p1.y + (p2.y - p1.y) * proj.progress;
            proj.position.z = p1.z + (p2.z - p1.z) * proj.progress;

            if (proj.progress >= 1) {
                // Impact
                projectilesChanged = true;
                
                // Find current target status (might have moved or died)
                let realTarget: GameEntity | PlayerState | undefined;
                if (proj.targetId === 'player') {
                    realTarget = playerRef.current;
                } else {
                    realTarget = entitiesRef.current.find(e => e.id === proj.targetId);
                }

                if (realTarget && !realTarget.isDead) {
                    // Apply Damage
                    if (proj.targetId === 'player') {
                         // Invincible check
                         const pState = realTarget as PlayerState;
                         if (!pState.isInvincible) {
                             realTarget.hp -= Math.floor(proj.damage * 0.5); 
                             if (realTarget.hp <= 0) {
                                 realTarget.isDead = true;
                                 realTarget.deathTime = now;
                                 playSound('death');
                                 setEnemyGold(g => g + GAME_CONFIG.GOLD_REWARD_UNIT);
                                 setEnemyKills(k => k + 1);
                             } else {
                                 playSound('hit');
                             }
                         }
                    } else {
                        realTarget.hp -= proj.damage;
                        
                        // Break rally if hit by arrow
                        if (realTarget.isRallying) realTarget.isRallying = false;

                        if (realTarget.type === UnitType.BASE || realTarget.type === UnitType.GATE) playSound('hit');
                        else playSound('hit');
                        
                        if (realTarget.hp <= 0) {
                             realTarget.isDead = true;
                             realTarget.deathTime = now;
                             
                             if (proj.ownerTeam === Team.PLAYER && realTarget.team === Team.ENEMY) {
                                 setPlayerGold(g => g + (realTarget.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                                 setPlayerKills(k => k + 1);
                             } else if (proj.ownerTeam === Team.ENEMY && realTarget.team === Team.PLAYER) {
                                 setEnemyGold(g => g + (realTarget.type === UnitType.BASE ? GAME_CONFIG.GOLD_REWARD_BASE : GAME_CONFIG.GOLD_REWARD_UNIT));
                                 setEnemyKills(k => k + 1);
                             }

                             if (realTarget.type === UnitType.BASE) {
                                  playSound('crumble');
                                  setTimeout(() => {
                                      if (realTarget.team === Team.PLAYER) {
                                          setGameOutcome('DEFEAT');
                                          playSound('defeat');
                                      } else {
                                          setGameOutcome('VICTORY');
                                          playSound('victory');
                                      }
                                  }, 1000);
                             } else if (realTarget.type === UnitType.GATE) {
                                 playSound('crumble');
                                 unitsChanged = true;
                             } else {
                                 playSound('death');
                                 unitsChanged = true;
                             }
                        }
                    }
                }
            } else {
                remainingProjectiles.push(proj);
            }
        }
    });
    
    if (projectilesChanged || remainingProjectiles.length !== projectilesRef.current.length) {
        projectilesRef.current = remainingProjectiles;
        setProjectiles([...projectilesRef.current]);
    }

    // Structure HPs check to avoid heavy React re-renders every frame
    const newStructs = { 
        playerBase: Math.max(0, pBaseHp), 
        playerGate: Math.max(0, pGateHp),
        enemyBase: Math.max(0, eBaseHp),
        enemyGate: Math.max(0, eGateHp)
    };
    const prevStructs = lastReportedStructureHps.current;
    if (
        newStructs.playerBase !== prevStructs.playerBase ||
        newStructs.playerGate !== prevStructs.playerGate ||
        newStructs.enemyBase !== prevStructs.enemyBase ||
        newStructs.enemyGate !== prevStructs.enemyGate
    ) {
        setStructureHps(newStructs);
        lastReportedStructureHps.current = newStructs;
    }

    const activeOrRecentlyDead = entitiesRef.current.filter(e => !e.isDead || (e.isDead && e.deathTime && now - e.deathTime < 2000)); 
    if (activeOrRecentlyDead.length !== entitiesRef.current.length || unitsChanged) {
        entitiesRef.current = activeOrRecentlyDead;
        setEntities([...entitiesRef.current]);
    }

    const hDist = Math.cos(cameraPitch) * cameraZoom;
    const vDist = Math.sin(cameraPitch) * cameraZoom;
    const camTargetX = player.position.x + Math.sin(cameraYaw) * hDist;
    const camTargetZ = player.position.z + Math.cos(cameraYaw) * hDist;
    const camTargetY = player.position.y + vDist;

    camera.position.x += (camTargetX - camera.position.x) * 0.1;
    camera.position.z += (camTargetZ - camera.position.z) * 0.1;
    camera.position.y += (camTargetY - camera.position.y) * 0.1;
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);
  });

  return (
    <>
      {/* ATMOSPHERE */}
      <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
      
      {/* VISIBLE CELESTIAL BODIES */}
      {/* Sun Mesh */}
      <mesh ref={sunMeshRef}>
          <sphereGeometry args={[8, 16, 16]} />
          <meshBasicMaterial color="#FDB813" /> 
      </mesh>
      
      {/* Moon Mesh */}
      <group ref={moonMeshRef}>
         <mesh>
             <sphereGeometry args={[6, 16, 16]} />
             <meshStandardMaterial color="#ddd" emissive="#fff" emissiveIntensity={0.5} />
         </mesh>
      </group>

      {/* DYNAMIC LIGHTS */}
      <ambientLight ref={ambientRef} intensity={0.6} color="#eef" />
      <directionalLight 
        ref={lightRef}
        position={[0, 100, 0]} 
        intensity={1.0} 
        castShadow 
        shadow-mapSize={[2048, 2048]} 
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0005}
      />
      
      <mesh receiveShadow geometry={terrainGeometry}>
        <meshStandardMaterial color="#508c46" flatShading roughness={0.9} />
      </mesh>

      <Castle 
        position={[0, 0, GAME_CONFIG.CASTLE_Z]} 
        rotation={[0, Math.PI, 0]} 
        teamColor="#3b82f6" 
        team={Team.PLAYER}
        // Removed onClick from Castle
      />
      <Castle 
        position={[0, 0, -GAME_CONFIG.CASTLE_Z]} 
        rotation={[0, 0, 0]} 
        teamColor="#ef4444" 
        team={Team.ENEMY}
      />
      
      {/* Player Spawners */}
      <Spawner 
         type={UnitType.WARRIOR} 
         team={Team.PLAYER} 
         position={{ x: SPAWN_POINTS.PLAYER.WARRIOR.x, y: getTerrainHeight(SPAWN_POINTS.PLAYER.WARRIOR.x, SPAWN_POINTS.PLAYER.WARRIOR.z), z: SPAWN_POINTS.PLAYER.WARRIOR.z }} 
         onClick={() => onSpawnerClick(UnitType.WARRIOR)}
      />
      <Spawner 
         type={UnitType.ARCHER} 
         team={Team.PLAYER} 
         position={{ x: SPAWN_POINTS.PLAYER.ARCHER.x, y: getTerrainHeight(SPAWN_POINTS.PLAYER.ARCHER.x, SPAWN_POINTS.PLAYER.ARCHER.z), z: SPAWN_POINTS.PLAYER.ARCHER.z }} 
         onClick={() => onSpawnerClick(UnitType.ARCHER)}
      />
      {/* Axeman Spawner - Inside Castle */}
      <Spawner 
         type={UnitType.AXEMAN} 
         team={Team.PLAYER} 
         position={{ x: SPAWN_POINTS.PLAYER.AXEMAN.x, y: getTerrainHeight(SPAWN_POINTS.PLAYER.AXEMAN.x, SPAWN_POINTS.PLAYER.AXEMAN.z), z: SPAWN_POINTS.PLAYER.AXEMAN.z }} 
         onClick={() => onSpawnerClick(UnitType.AXEMAN)}
      />
       {/* Lancer Spawner - Inside Castle Right */}
       <Spawner 
         type={UnitType.LANCER} 
         team={Team.PLAYER} 
         position={{ x: SPAWN_POINTS.PLAYER.LANCER.x, y: getTerrainHeight(SPAWN_POINTS.PLAYER.LANCER.x, SPAWN_POINTS.PLAYER.LANCER.z), z: SPAWN_POINTS.PLAYER.LANCER.z }} 
         onClick={() => onSpawnerClick(UnitType.LANCER)}
      />

      {/* Enemy Spawners (Non-clickable) */}
      <Spawner 
         type={UnitType.WARRIOR} 
         team={Team.ENEMY} 
         position={{ x: SPAWN_POINTS.ENEMY.WARRIOR.x, y: getTerrainHeight(SPAWN_POINTS.ENEMY.WARRIOR.x, SPAWN_POINTS.ENEMY.WARRIOR.z), z: SPAWN_POINTS.ENEMY.WARRIOR.z }} 
      />
      <Spawner 
         type={UnitType.ARCHER} 
         team={Team.ENEMY} 
         position={{ x: SPAWN_POINTS.ENEMY.ARCHER.x, y: getTerrainHeight(SPAWN_POINTS.ENEMY.ARCHER.x, SPAWN_POINTS.ENEMY.ARCHER.z), z: SPAWN_POINTS.ENEMY.ARCHER.z }} 
      />
      <Spawner 
         type={UnitType.AXEMAN} 
         team={Team.ENEMY} 
         position={{ x: SPAWN_POINTS.ENEMY.AXEMAN.x, y: getTerrainHeight(SPAWN_POINTS.ENEMY.AXEMAN.x, SPAWN_POINTS.ENEMY.AXEMAN.z), z: SPAWN_POINTS.ENEMY.AXEMAN.z }} 
      />
      <Spawner 
         type={UnitType.LANCER} 
         team={Team.ENEMY} 
         position={{ x: SPAWN_POINTS.ENEMY.LANCER.x, y: getTerrainHeight(SPAWN_POINTS.ENEMY.LANCER.x, SPAWN_POINTS.ENEMY.LANCER.z), z: SPAWN_POINTS.ENEMY.LANCER.z }} 
      />


      <Instances range={trees.length}>
        <cylinderGeometry args={[0.2, 0.4, 1.5, 5]} />
        <meshStandardMaterial color="#5D4037" flatShading />
        {trees.map((t, i) => (
            <Instance key={`trunk-${i}`} position={t.position} scale={t.scale} />
        ))}
      </Instances>
      <Instances range={trees.length}>
        <coneGeometry args={[1.2, 3, 6]} />
        <meshStandardMaterial color="#2E7D32" flatShading />
        {trees.map((t, i) => (
             <Instance key={`leaves-${i}`} position={[t.position[0], t.position[1] + 2 * t.scale[1], t.position[2]]} scale={t.scale} />
        ))}
      </Instances>

      <Instances range={rocks.length}>
        <dodecahedronGeometry args={[1]} />
        <meshStandardMaterial color="#78909c" flatShading />
        {rocks.map((t, i) => (
             <Instance key={`rock-${i}`} position={t.position} scale={t.scale} rotation={t.rotation} />
        ))}
      </Instances>

      {/* FIRE WALLS */}
      {fireWalls.map(fw => (
          <FireWallVisuals key={fw.id} fireWall={fw} />
      ))}
      
      {/* CRATERS (Mud Pools) */}
      {craters.map(c => (
          <CraterVisuals key={c.id} crater={c} />
      ))}

      <PlayerVisuals 
        playerRef={playerRef} 
        gameOutcome={gameOutcome} 
        playerLevel={playerLevel}
        isInvisible={isPlayerInvisible}
        isInvincible={isPlayerInvincible}
      />

      {entities.map(unit => (
        <SceneUnit 
            key={unit.id} 
            unit={unit} 
            gameOutcome={gameOutcome} 
            onClick={unit.type === UnitType.BASE && unit.team === Team.PLAYER ? onBaseClick : undefined}
        />
      ))}

      {projectiles.map(p => (
           <ArrowScene key={p.id} projectile={p} />
      ))}
    </>
  );
};

// Fire Wall Component
const FireWallVisuals: React.FC<{ fireWall: FireWall }> = ({ fireWall }) => {
    // Rotating ring of fire particles or a cylinder
    const group = useRef<THREE.Group>(null);
    useFrame((state) => {
        if(group.current) {
            group.current.rotation.y += 0.05;
            // Pulsate
            const scale = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
            group.current.scale.set(scale, 1, scale);
        }
    });

    return (
        <group position={[fireWall.position.x, fireWall.position.y, fireWall.position.z]}>
            <group ref={group}>
                {/* Core Fire */}
                <mesh position={[0, 0.5, 0]}>
                    <cylinderGeometry args={[fireWall.radius, fireWall.radius, 1.5, 16, 1, true]} />
                    <meshStandardMaterial color="orange" emissive="red" emissiveIntensity={2} transparent opacity={0.6} side={THREE.DoubleSide} />
                </mesh>
                {/* Inner Glow */}
                 <mesh position={[0, 0.5, 0]}>
                    <cylinderGeometry args={[fireWall.radius * 0.8, fireWall.radius * 0.8, 1.5, 16, 1, true]} />
                    <meshStandardMaterial color="yellow" emissive="yellow" emissiveIntensity={1} transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>
            </group>
            <pointLight intensity={1} distance={5} color="orange" />
        </group>
    )
}

// Crater Component (Visuals for slow zone)
const CraterVisuals: React.FC<{ crater: Crater }> = ({ crater }) => {
    return (
        <group position={[crater.position.x, crater.position.y + 0.05, crater.position.z]}>
             {/* Main Mud Pool */}
             <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow>
                 <circleGeometry args={[crater.radius, 32]} />
                 <meshStandardMaterial color="#292524" roughness={1} transparent opacity={0.9} />
             </mesh>
             {/* Cracked Edge Ring */}
             <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.02, 0]}>
                 <ringGeometry args={[crater.radius * 0.9, crater.radius, 32]} />
                 <meshStandardMaterial color="#1c1917" roughness={1} />
             </mesh>
             {/* Floating text or particles could go here */}
        </group>
    )
}

// Modified to accept level and invisible prop to force re-render of memoized UnitMesh
const PlayerVisuals: React.FC<{ 
    playerRef: React.MutableRefObject<PlayerState>, 
    gameOutcome: GameOutcome,
    playerLevel: number,
    isInvisible: boolean,
    isInvincible: boolean // New Prop
}> = ({ playerRef, gameOutcome, playerLevel, isInvisible, isInvincible }) => {
    const group = useRef<THREE.Group>(null);
    useFrame(() => {
        if (group.current) {
            const p = playerRef.current;
            group.current.position.set(p.position.x, p.position.y, p.position.z);
            group.current.rotation.y = p.rotation;
        }
    });

    return (
        <group ref={group}>
             <LiveUnitMesh 
                key={`player-${playerLevel}-${isInvisible}-${isInvincible}`} // Force remount on visual state change
                entity={playerRef.current} // Pass mutable ref directly
                scale={1.2} 
                gameOutcome={gameOutcome} 
             />
        </group>
    )
}

const SceneUnit: React.FC<{ unit: GameEntity, gameOutcome: GameOutcome, onClick?: () => void }> = ({ unit, gameOutcome, onClick }) => {
    const group = useRef<THREE.Group>(null);
    useFrame(() => {
        if (group.current) {
            group.current.position.set(unit.position.x, unit.position.y, unit.position.z);
            group.current.rotation.y = unit.rotation;
        }
    });
    return (
        <group ref={group}>
             <LiveUnitMesh entity={unit} gameOutcome={gameOutcome} onClick={onClick} />
        </group>
    )
}

const ArrowScene: React.FC<{ projectile: Projectile }> = ({ projectile }) => {
    const group = useRef<THREE.Group>(null);
    useFrame(() => {
        if (group.current) {
            group.current.position.set(projectile.position.x, projectile.position.y, projectile.position.z);
            if(projectile.targetPos) {
                group.current.lookAt(projectile.targetPos.x, projectile.targetPos.y, projectile.targetPos.z);
            }
        }
    });
    return (
        <group ref={group}>
            <ArrowMesh visualType={projectile.visualType} />
        </group>
    )
}

const LiveUnitMesh: React.FC<{ entity: GameEntity, scale?: number, gameOutcome?: GameOutcome, onClick?: () => void }> = React.memo(({ entity, scale = 1, gameOutcome, onClick }) => {
    return <UnitMesh entity={entity} scale={scale} gameOutcome={gameOutcome} onClick={onClick} />;
}, (prev, next) => 
    prev.entity.id === next.entity.id &&
    prev.entity.hp === next.entity.hp && 
    prev.entity.level === next.entity.level &&
    prev.entity.isInvisible === next.entity.isInvisible &&
    prev.entity.isInvincible === next.entity.isInvincible && // Check invincible change
    prev.entity.isMoving === next.entity.isMoving &&
    prev.entity.isAttacking === next.entity.isAttacking &&
    prev.entity.isDead === next.entity.isDead &&
    prev.scale === next.scale && 
    prev.gameOutcome === next.gameOutcome &&
    prev.onClick === next.onClick
); 

export default World;