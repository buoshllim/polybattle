
import React, { useRef, useState, Suspense, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import World from './components/World';
import Joystick from './components/Joystick';
import AttackBtn from './components/AttackBtn';
import SkillBtn from './components/SkillBtn';
import { GameOutcome, GAME_CONFIG, UnitType, SkillType, SKILL_STATS, UnitCounts, Team } from './types';
import { playSound } from './utils/audio';

type GameState = 'MENU' | 'PLAYING';

const GoldCoinIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="url(#coinGradient)" stroke="#B45309" strokeWidth="2"/>
    <circle cx="12" cy="12" r="7" stroke="#B45309" strokeWidth="1" strokeDasharray="2 2" opacity="0.5"/>
    <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="900" fill="#78350F" style={{fontFamily: 'serif'}}>$</text>
    <defs>
      <linearGradient id="coinGradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FCD34D"/>
        <stop offset="1" stopColor="#F59E0B"/>
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  const inputRef = useRef({ x: 0, y: 0, isAttacking: false });
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Orientation Check State
  const [isWrongOrientation, setIsWrongOrientation] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      // Heuristic to detect mobile devices (Touch points + User Agent or small screen width)
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
      
      // Only block if it is clearly a mobile device in landscape
      setIsWrongOrientation(isMobile && isLandscape);
    };

    window.addEventListener('resize', checkOrientation);
    checkOrientation(); // Initial check
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Game Settings
  const [difficulty, setDifficulty] = useState(1);

  // Hero Stats
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMp, setPlayerMp] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [learnedSkills, setLearnedSkills] = useState<SkillType[]>([]);
  const [skillCooldowns, setSkillCooldowns] = useState<Record<SkillType, number>>({} as any);
  const [isPlayerInvisible, setIsPlayerInvisible] = useState(false);
  const [isPlayerInvincible, setIsPlayerInvincible] = useState(false); // New State
  const [unitCounts, setUnitCounts] = useState<UnitCounts>({ [Team.PLAYER]: {}, [Team.ENEMY]: {} });
  
  // Kill Counts
  const [playerKills, setPlayerKills] = useState(0);
  const [enemyKills, setEnemyKills] = useState(0);

  // Derived Max Stats based on Level
  const playerMaxHp = useMemo(() => 100 + (playerLevel - 1) * 20, [playerLevel]);
  const playerMaxMp = useMemo(() => 100 + (playerLevel - 1) * 20, [playerLevel]);

  // Structure HPs (Base and Gate)
  const [structureHps, setStructureHps] = useState({ 
      playerBase: GAME_CONFIG.BASE_HP, 
      playerGate: GAME_CONFIG.BASE_HP,
      enemyBase: GAME_CONFIG.BASE_HP,
      enemyGate: GAME_CONFIG.BASE_HP
  });
  
  // Gold State
  const [playerGold, setPlayerGold] = useState(0);
  const [enemyGold, setEnemyGold] = useState(0);
  
  const [respawnTrigger, setRespawnTrigger] = useState(0);
  const [gameOutcome, setGameOutcome] = useState<GameOutcome>(null);

  // --- PLAYER SPAWNER UPGRADE STATE ---
  const [warriorLevel, setWarriorLevel] = useState(1);
  const [archerLevel, setArcherLevel] = useState(1);
  const [axemanLevel, setAxemanLevel] = useState(1); 
  const [lancerLevel, setLancerLevel] = useState(1); // New
  
  const [warriorSpawnerLevel, setWarriorSpawnerLevel] = useState(1);
  const [archerSpawnerLevel, setArcherSpawnerLevel] = useState(1);
  const [axemanSpawnerLevel, setAxemanSpawnerLevel] = useState(1);
  const [lancerSpawnerLevel, setLancerSpawnerLevel] = useState(1); // New
  
  // --- ENEMY UPGRADE STATE ---
  const [enemyWarriorLevel, setEnemyWarriorLevel] = useState(1);
  const [enemyArcherLevel, setEnemyArcherLevel] = useState(1);
  const [enemyAxemanLevel, setEnemyAxemanLevel] = useState(1);
  const [enemyLancerLevel, setEnemyLancerLevel] = useState(1); // New

  const [enemyWarriorSpawnerLevel, setEnemyWarriorSpawnerLevel] = useState(1);
  const [enemyArcherSpawnerLevel, setEnemyArcherSpawnerLevel] = useState(1);
  const [enemyAxemanSpawnerLevel, setEnemyAxemanSpawnerLevel] = useState(1);
  const [enemyLancerSpawnerLevel, setEnemyLancerSpawnerLevel] = useState(1); // New

  // 'PLAYER_BASE' is used for the Hero/Skill upgrade menu
  const [upgradeMenuType, setUpgradeMenuType] = useState<UnitType | 'PLAYER_BASE' | null>(null);
  const [showSkillSelect, setShowSkillSelect] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Skill Trigger
  const [playerSkillTrigger, setPlayerSkillTrigger] = useState<{ skill: SkillType, timestamp: number } | null>(null);

  const handleMove = (x: number, y: number) => {
    inputRef.current.x = x;
    inputRef.current.y = y;
  };

  const handleAttack = (isAttacking: boolean) => {
    inputRef.current.isAttacking = isAttacking;
  };

  const startGame = () => {
    setGameState('PLAYING');
    setPlayerGold(0);
    setEnemyGold(0);
    setPlayerHp(100);
    setPlayerMp(100);
    setPlayerLevel(1);
    setLearnedSkills([]);
    setGameOutcome(null);
    setStructureHps({ 
        playerBase: GAME_CONFIG.BASE_HP, 
        playerGate: GAME_CONFIG.BASE_HP,
        enemyBase: GAME_CONFIG.BASE_HP,
        enemyGate: GAME_CONFIG.BASE_HP
    });
    setIsPlayerInvisible(false);
    setIsPlayerInvincible(false);
    setPlayerSkillTrigger(null); // Reset skill trigger
    setUnitCounts({ [Team.PLAYER]: {}, [Team.ENEMY]: {} });
    setPlayerKills(0);
    setEnemyKills(0);
    
    // Reset Player Levels
    setWarriorLevel(1);
    setArcherLevel(1);
    setAxemanLevel(1);
    setLancerLevel(1);
    setWarriorSpawnerLevel(1);
    setArcherSpawnerLevel(1);
    setAxemanSpawnerLevel(1);
    setLancerSpawnerLevel(1);

    // Reset Enemy Levels based on Difficulty
    setEnemyWarriorLevel(difficulty);
    setEnemyArcherLevel(difficulty);
    setEnemyAxemanLevel(difficulty);
    setEnemyLancerLevel(difficulty);
    
    // Reset Enemy Spawners (Base speed)
    setEnemyWarriorSpawnerLevel(1);
    setEnemyArcherSpawnerLevel(1);
    setEnemyAxemanSpawnerLevel(1);
    setEnemyLancerSpawnerLevel(1);
  };

  const revivePlayer = () => {
    setRespawnTrigger(Date.now());
    setPlayerHp(playerMaxHp);
    setPlayerMp(playerMaxMp);
    setIsPlayerInvisible(false);
    setIsPlayerInvincible(false);
  };

  const returnToMenu = () => {
    setGameState('MENU');
    setPlayerGold(0);
    setEnemyGold(0);
    setPlayerHp(100);
    setGameOutcome(null);
    setUpgradeMenuType(null);
    setIsPlayerInvisible(false);
    setIsPlayerInvincible(false);
    setPlayerSkillTrigger(null);
    setPlayerKills(0);
    setEnemyKills(0);
  };

  // --- ENEMY AI UPGRADE LOGIC ---
  useEffect(() => {
    if (gameState !== 'PLAYING' || gameOutcome) return;
    if (enemyGold >= GAME_CONFIG.UPGRADE_COST) {
        // AI randomly upgrades one of its assets
        const choice = Math.floor(Math.random() * 8); // Updated to 8 choices
        setEnemyGold(prev => prev - GAME_CONFIG.UPGRADE_COST);
        switch (choice) {
            case 0: setEnemyWarriorLevel(l => l + 1); break;
            case 1: setEnemyArcherLevel(l => l + 1); break;
            case 2: setEnemyAxemanLevel(l => l + 1); break;
            case 3: setEnemyLancerLevel(l => l + 1); break;
            case 4: setEnemyWarriorSpawnerLevel(l => Math.min(30, l + 1)); break;
            case 5: setEnemyArcherSpawnerLevel(l => Math.min(30, l + 1)); break;
            case 6: setEnemyAxemanSpawnerLevel(l => Math.min(30, l + 1)); break;
            case 7: setEnemyLancerSpawnerLevel(l => Math.min(30, l + 1)); break;
        }
        playSound('upgrade');
    }
  }, [enemyGold, gameState, gameOutcome]);


  // --- PLAYER UPGRADE LOGIC ---
  const handleSpawnerClick = (type: UnitType) => {
      setUpgradeMenuType(type);
  };

  const handleBaseClick = () => {
      setUpgradeMenuType('PLAYER_BASE');
      setShowSkillSelect(false);
  };

  const currentLevels = () => {
      if (upgradeMenuType === UnitType.WARRIOR) return { unit: warriorLevel, spawner: warriorSpawnerLevel };
      if (upgradeMenuType === UnitType.ARCHER) return { unit: archerLevel, spawner: archerSpawnerLevel };
      if (upgradeMenuType === UnitType.AXEMAN) return { unit: axemanLevel, spawner: axemanSpawnerLevel };
      if (upgradeMenuType === UnitType.LANCER) return { unit: lancerLevel, spawner: lancerSpawnerLevel };
      return { unit: 1, spawner: 1 };
  };

  const performUpgrade = (category: 'UNIT' | 'SPAWNER') => {
      if (playerGold < GAME_CONFIG.UPGRADE_COST) return;

      if (category === 'SPAWNER') {
          const { spawner } = currentLevels();
          if (spawner >= 30) return;
      }

      setPlayerGold(prev => prev - GAME_CONFIG.UPGRADE_COST);
      playSound('upgrade');
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 800);

      if (category === 'UNIT') {
          if (upgradeMenuType === UnitType.WARRIOR) setWarriorLevel(l => l + 1);
          if (upgradeMenuType === UnitType.ARCHER) setArcherLevel(l => l + 1);
          if (upgradeMenuType === UnitType.AXEMAN) setAxemanLevel(l => l + 1);
          if (upgradeMenuType === UnitType.LANCER) setLancerLevel(l => l + 1);
      } else {
          if (upgradeMenuType === UnitType.WARRIOR) setWarriorSpawnerLevel(l => l + 1);
          if (upgradeMenuType === UnitType.ARCHER) setArcherSpawnerLevel(l => l + 1);
          if (upgradeMenuType === UnitType.AXEMAN) setAxemanSpawnerLevel(l => l + 1);
          if (upgradeMenuType === UnitType.LANCER) setLancerSpawnerLevel(l => l + 1);
      }
  };
  
  const performHeroUpgrade = () => {
      if (playerGold < GAME_CONFIG.UPGRADE_COST) return;
      setPlayerGold(prev => prev - GAME_CONFIG.UPGRADE_COST);
      setPlayerLevel(l => l + 1);
      // NOTE: Max HP increases with level, visual update handled by state change
      playSound('upgrade');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 800);
  }

  const performSkillLearn = (skill: SkillType) => {
      const unlockCost = SKILL_STATS[skill].unlockCost;
      if (playerMp < unlockCost) return;
      if (learnedSkills.includes(skill)) return;

      setPlayerMp(prev => prev - unlockCost);
      setLearnedSkills(prev => [...prev, skill]);
      playSound('skill_unlock');
      
      setShowSkillSelect(false);
  };

  const handleUseSkill = (skill: SkillType) => {
      setPlayerSkillTrigger({ skill, timestamp: Date.now() });
  };

  // Helper to determine if spawner is maxed for button state
  const isSpawnerMaxed = () => {
      const { spawner } = currentLevels();
      return spawner >= 30;
  };

  // Calculations for total counts
  const totalPlayerUnits = useMemo(() => Object.values(unitCounts[Team.PLAYER]).reduce((a: number, b: number) => a + b, 0), [unitCounts]);
  const totalEnemyUnits = useMemo(() => Object.values(unitCounts[Team.ENEMY]).reduce((a: number, b: number) => a + b, 0), [unitCounts]);

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden select-none font-sans">
      
      {/* Orientation Lock Overlay */}
      {isWrongOrientation && (
        <div className="absolute inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center text-center p-6 touch-none">
           <div className="text-6xl mb-6 animate-pulse">📱</div>
           <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-widest">Portrait Mode Only</h2>
           <p className="text-slate-400 font-bold">Please rotate your device to play.</p>
        </div>
      )}

      {/* --- START SCREEN --- */}
      {gameState === 'MENU' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-black text-white">
          <div className="text-center animate-fade-in-up flex flex-col items-center w-full max-w-md px-4">
             {/* Title - Reduced Size */}
             <h1 className="text-4xl md:text-6xl font-black mb-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-lg tracking-tighter">
               POLY BATTLE
             </h1>
             <p className="text-sm text-slate-400 mb-4 tracking-widest uppercase font-bold">POCKET WAR KINGDOM</p>
             
             {/* Difficulty Selector - Compacted */}
             <div className="mb-4 w-full bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                <div className="text-blue-300 font-bold mb-2 tracking-widest text-xs uppercase">Select Difficulty</div>
                
                <div className="flex flex-col gap-1.5 items-center">
                    {/* Row 1: 1-5 */}
                    <div className="flex justify-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setDifficulty(lvl)}
                                className={`w-8 h-8 rounded font-bold text-sm transition-all duration-200 border-2
                                    ${difficulty === lvl 
                                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)] scale-110' 
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
                                `}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    {/* Row 2: 6-10 */}
                    <div className="flex justify-center gap-1.5">
                        {[6, 7, 8, 9, 10].map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setDifficulty(lvl)}
                                className={`w-8 h-8 rounded font-bold text-sm transition-all duration-200 border-2
                                    ${difficulty === lvl 
                                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)] scale-110' 
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
                                `}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    {/* Row 3: 11-15 */}
                    <div className="flex justify-center gap-1.5">
                        {[11, 12, 13, 14, 15].map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setDifficulty(lvl)}
                                className={`w-8 h-8 rounded font-bold text-sm transition-all duration-200 border-2
                                    ${difficulty === lvl 
                                        ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(220,38,38,0.6)] scale-110' 
                                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
                                `}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-2 text-xs text-slate-400 font-mono bg-slate-900/50 py-1 px-3 rounded-full inline-block">
                    Enemy Lv: <span className="text-red-400 font-bold ml-1">{difficulty}</span>
                </div>
             </div>

             {/* Start Button - Compacted */}
             <button 
                onClick={startGame}
                className="group relative px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full text-lg font-bold shadow-[0_0_20px_rgba(37,99,235,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.8)] hover:scale-105 transition-all duration-300 overflow-hidden mb-4 w-full max-w-xs"
             >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full"></div>
                <span className="relative z-10">START BATTLE</span>
             </button>

             {/* Instructions - Horizontal Layout to save height */}
             <div className="flex flex-row gap-2 justify-center bg-slate-800/80 p-3 rounded-xl border border-slate-600 backdrop-blur-md w-full shadow-xl">
                 <div className="flex flex-1 items-center gap-2 p-1 bg-slate-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-lg shadow-inner border border-slate-600">⚙️</div>
                    <div className="text-left">
                       <div className="text-white font-bold text-xs leading-tight">Spawners</div>
                       <div className="text-slate-400 text-[10px] leading-tight">Upgrade Units</div>
                    </div>
                 </div>
                 <div className="flex flex-1 items-center gap-2 p-1 bg-slate-700/30 rounded-lg">
                    <div className="w-8 h-8 rounded bg-blue-900/50 flex items-center justify-center text-lg shadow-inner border border-blue-800">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400">
                           <path fillRule="evenodd" d="M3 2.25a.75.75 0 01.75.75v.54l1.838-.46a9.75 9.75 0 016.725.738l.108.054a8.25 8.25 0 005.58.652l3.109-.732a.75.75 0 01.917.81 47.784 47.784 0 00.005 10.337.75.75 0 01-.574.812l-3.114.733a9.75 9.75 0 01-6.594-.158l-.108-.054a8.25 8.25 0 00-5.89-.538l-2.258.452v7.12a.75.75 0 01-1.5 0v-19.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="text-left">
                       <div className="text-white font-bold text-xs leading-tight">Base Flag</div>
                       <div className="text-slate-400 text-[10px] leading-tight">Upgrade Hero</div>
                    </div>
                 </div>
             </div>

          </div>
        </div>
      )}

      {/* --- GAME SCENE --- */}
      {gameState === 'PLAYING' && (
        <>
          <Canvas shadows camera={{ position: [0, 15, 30], fov: 50 }}>
            <Suspense fallback={null}>
              <World 
                inputRef={inputRef} 
                setPlayerHp={setPlayerHp} 
                setPlayerMp={setPlayerMp}
                playerMp={playerMp}
                playerMaxHp={playerMaxHp}
                playerMaxMp={playerMaxMp}
                playerLevel={playerLevel}
                setStructureHps={setStructureHps}
                setPlayerGold={setPlayerGold}
                setEnemyGold={setEnemyGold}
                setGameOutcome={setGameOutcome}
                gameOutcome={gameOutcome}
                respawnTrigger={respawnTrigger}
                setIsPlayerInvisible={setIsPlayerInvisible}
                isPlayerInvisible={isPlayerInvisible}
                // New Prop for World
                setIsPlayerInvincible={setIsPlayerInvincible}
                isPlayerInvincible={isPlayerInvincible}
                
                setPlayerKills={setPlayerKills}
                setEnemyKills={setEnemyKills}
                
                // Player Stats
                warriorLevel={warriorLevel}
                archerLevel={archerLevel}
                axemanLevel={axemanLevel}
                lancerLevel={lancerLevel}
                warriorSpawnerLevel={warriorSpawnerLevel}
                archerSpawnerLevel={archerSpawnerLevel}
                axemanSpawnerLevel={axemanSpawnerLevel}
                lancerSpawnerLevel={lancerSpawnerLevel}
                playerSkills={learnedSkills}
                playerSkillTrigger={playerSkillTrigger}
                
                // Enemy Stats
                enemyWarriorLevel={enemyWarriorLevel}
                enemyArcherLevel={enemyArcherLevel}
                enemyAxemanLevel={enemyAxemanLevel}
                enemyLancerLevel={enemyLancerLevel}
                enemyWarriorSpawnerLevel={enemyWarriorSpawnerLevel}
                enemyArcherSpawnerLevel={enemyArcherSpawnerLevel}
                enemyAxemanSpawnerLevel={enemyAxemanSpawnerLevel}
                enemyLancerSpawnerLevel={enemyLancerSpawnerLevel}
                
                onSpawnerClick={handleSpawnerClick}
                onBaseClick={handleBaseClick}
                updateCooldowns={setSkillCooldowns}
                setUnitCounts={setUnitCounts}
              />
            </Suspense>
          </Canvas>
          <Loader />

          {/* UI Overlay */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-4 flex flex-col justify-between z-40">
            
            {/* Top Header */}
            <div className="w-full flex flex-col gap-2">
                {/* Base HP Bars (Center) */}
                <div className="flex justify-between items-start w-full pointer-events-auto px-2">
                    {/* Player Base & Gate */}
                    <div className="flex flex-col items-end flex-1 max-w-[45%]">
                        {/* Stats Row */}
                        <div className="flex items-center justify-between w-full mb-1">
                             <div className="flex items-center gap-3">
                                 <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded">
                                   <GoldCoinIcon /> {playerGold}
                                 </div>
                                 <div className="flex items-center gap-1 text-slate-300 text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded">
                                   <span>☠️</span> {playerKills}
                                 </div>
                             </div>
                             <div className="text-blue-400 text-xs font-bold uppercase tracking-wider">ALLY</div>
                        </div>
                        
                        {/* Flag HP */}
                        <div className="w-full flex justify-between items-center px-1 mb-0.5">
                            <span className="text-[9px] font-bold text-blue-200">FLAG</span>
                            <span className="text-[9px] font-bold text-white shadow-black drop-shadow-md">
                                {Math.ceil(structureHps.playerBase)} / {GAME_CONFIG.BASE_HP}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-slate-800/80 border border-blue-900 rounded-full overflow-hidden mb-1 relative">
                             <div 
                                className="h-full bg-blue-500 transition-all duration-500"
                                style={{ width: `${(structureHps.playerBase / GAME_CONFIG.BASE_HP) * 100}%` }}
                             />
                        </div>

                        {/* Gate HP */}
                        <div className="w-full flex justify-between items-center px-1 mb-0.5">
                            <span className="text-[9px] font-bold text-blue-300">GATE</span>
                            <span className="text-[9px] font-bold text-slate-200 shadow-black drop-shadow-md">
                                {Math.ceil(structureHps.playerGate)} / {GAME_CONFIG.BASE_HP}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800/80 border border-blue-900/50 rounded-full overflow-hidden mb-1">
                             <div 
                                className="h-full bg-cyan-600 transition-all duration-500"
                                style={{ width: `${(structureHps.playerGate / GAME_CONFIG.BASE_HP) * 100}%` }}
                             />
                        </div>

                        {/* Player Unit Counts */}
                        <div className="flex gap-0.5 mt-0.5 flex-nowrap justify-end w-full items-center">
                          <div className="flex items-center gap-0.5 bg-blue-900/60 px-1 py-0.5 rounded text-[9px] text-blue-100 font-bold whitespace-nowrap border border-blue-800 mr-0.5">
                             <span className="text-[9px]">ALL</span> {totalPlayerUnits}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>⚔️</span> {unitCounts[Team.PLAYER][UnitType.WARRIOR] || 0}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>🏹</span> {unitCounts[Team.PLAYER][UnitType.ARCHER] || 0}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>🪓</span> {unitCounts[Team.PLAYER][UnitType.AXEMAN] || 0}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>🐎</span> {unitCounts[Team.PLAYER][UnitType.LANCER] || 0}
                          </div>
                        </div>
                    </div>
                    
                    {/* VS */}
                    <div className="text-white font-black text-xl italic opacity-50 px-2 mt-4">VS</div>

                    {/* Enemy Base & Gate */}
                    <div className="flex flex-col items-start flex-1 max-w-[45%]">
                        {/* Stats Row */}
                        <div className="flex items-center justify-between w-full mb-1">
                             <div className="text-red-400 text-xs font-bold uppercase tracking-wider">ENEMY</div>
                             <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-slate-300 text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded">
                                   <span>☠️</span> {enemyKills}
                                 </div>
                                 <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-bold bg-black/40 px-1.5 py-0.5 rounded">
                                   <GoldCoinIcon /> {enemyGold}
                                 </div>
                             </div>
                        </div>

                         {/* Flag HP */}
                        <div className="w-full flex justify-between items-center px-1 mb-0.5">
                            <span className="text-[9px] font-bold text-red-200">FLAG</span>
                            <span className="text-[9px] font-bold text-white shadow-black drop-shadow-md">
                                {Math.ceil(structureHps.enemyBase)} / {GAME_CONFIG.BASE_HP}
                            </span>
                        </div>
                         <div className="w-full h-3 bg-slate-800/80 border border-red-900 rounded-full overflow-hidden mb-1 relative">
                             <div 
                                className="h-full bg-red-500 transition-all duration-500"
                                style={{ width: `${(structureHps.enemyBase / GAME_CONFIG.BASE_HP) * 100}%` }}
                             />
                        </div>

                        {/* Gate HP */}
                        <div className="w-full flex justify-between items-center px-1 mb-0.5">
                            <span className="text-[9px] font-bold text-red-300">GATE</span>
                            <span className="text-[9px] font-bold text-slate-200 shadow-black drop-shadow-md">
                                {Math.ceil(structureHps.enemyGate)} / {GAME_CONFIG.BASE_HP}
                            </span>
                        </div>
                        <div className="w-full h-2 bg-slate-800/80 border border-red-900/50 rounded-full overflow-hidden mb-1">
                             <div 
                                className="h-full bg-orange-600 transition-all duration-500"
                                style={{ width: `${(structureHps.enemyGate / GAME_CONFIG.BASE_HP) * 100}%` }}
                             />
                        </div>

                         {/* Enemy Unit Counts */}
                        <div className="flex gap-0.5 mt-0.5 flex-nowrap justify-start w-full items-center">
                          <div className="flex items-center gap-0.5 bg-red-900/60 px-1 py-0.5 rounded text-[9px] text-red-100 font-bold whitespace-nowrap border border-red-800 mr-0.5">
                             <span className="text-[9px]">ALL</span> {totalEnemyUnits}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>⚔️</span> {unitCounts[Team.ENEMY][UnitType.WARRIOR] || 0}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>🏹</span> {unitCounts[Team.ENEMY][UnitType.ARCHER] || 0}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>🪓</span> {unitCounts[Team.ENEMY][UnitType.AXEMAN] || 0}
                          </div>
                          <div className="flex items-center gap-0.5 bg-black/40 px-1 py-0.5 rounded text-[9px] text-white whitespace-nowrap">
                             <span>🐎</span> {unitCounts[Team.ENEMY][UnitType.LANCER] || 0}
                          </div>
                        </div>
                    </div>
                </div>

                {/* Sub Header (HP & MP) */}
                <div className="flex justify-between items-start mt-2 pointer-events-auto">
                    {/* Player HP & MP */}
                    <div className="bg-slate-900/70 p-2 rounded-lg backdrop-blur-md border border-slate-600 w-36">
                        {/* HP */}
                        <div className="text-white text-[10px] font-bold mb-1 uppercase tracking-wider flex justify-between">
                            <span>HP</span>
                            <span>{Math.floor(Math.max(0, playerHp))} / {playerMaxHp}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                            <div 
                              className={`h-full transition-all duration-300 ${playerHp < playerMaxHp * 0.3 ? 'bg-red-500' : 'bg-green-500'}`} 
                              style={{ width: `${Math.min(100, Math.max(0, (playerHp / playerMaxHp) * 100))}%` }}
                            />
                        </div>

                        {/* MP */}
                        <div className="text-blue-200 text-[10px] font-bold mb-1 uppercase tracking-wider flex justify-between">
                            <span>MP</span>
                            <span>{Math.floor(Math.max(0, playerMp))} / {playerMaxMp}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, (playerMp / playerMaxMp) * 100))}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* UPGRADE MODAL */}
            {upgradeMenuType && !gameOutcome && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-auto z-50 backdrop-blur-sm animate-fade-in">
                    <div className="relative bg-slate-800 border-2 border-slate-600 p-6 rounded-2xl w-80 shadow-2xl">
                        
                        {showSuccess && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-2xl z-10 animate-pulse pointer-events-none">
                                <div className="text-green-400 font-black text-3xl drop-shadow-md">UPGRADED!</div>
                            </div>
                        )}

                        {/* --- HERO BASE UPGRADE --- */}
                        {upgradeMenuType === 'PLAYER_BASE' && !showSkillSelect && (
                            <>
                                <div className="text-center mb-6 border-b border-slate-600 pb-4">
                                     <h2 className="text-2xl font-black text-white uppercase tracking-wider">HERO UPGRADE</h2>
                                     <div className="text-xs text-slate-400 mt-1">Strengthen your Commander</div>
                                </div>

                                <button 
                                    onClick={performHeroUpgrade}
                                    disabled={playerGold < GAME_CONFIG.UPGRADE_COST}
                                    className={`w-full p-4 mb-3 rounded-xl flex items-center justify-between transition-all border-2 group
                                        ${playerGold >= GAME_CONFIG.UPGRADE_COST ? 'bg-blue-600 hover:bg-blue-500 border-blue-400' : 'bg-slate-700 border-slate-600 opacity-50 cursor-not-allowed'}
                                    `}
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-white">Level Up Hero</div>
                                        <div className="text-xs text-blue-200">Stats + (HP, Atk, Spd)</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-2xl font-black text-cyan-400">Lv.{playerLevel}</span>
                                            <span className="text-slate-500 text-xs">▶</span>
                                            <span className="text-xs font-bold text-slate-500">Lv.{playerLevel + 1}</span>
                                        </div>
                                        <div className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                            <GoldCoinIcon /> {GAME_CONFIG.UPGRADE_COST}
                                        </div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => setShowSkillSelect(true)}
                                    className="w-full p-4 mb-6 rounded-xl flex items-center justify-between transition-all border-2 bg-purple-600 hover:bg-purple-500 border-purple-400"
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-white">Learn Skills</div>
                                        <div className="text-xs text-purple-200">Unlock new abilities</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="text-sm font-bold text-blue-200">Use MP</div>
                                    </div>
                                </button>
                            </>
                        )}

                        {/* --- SKILL SELECTION SUB-MENU --- */}
                        {upgradeMenuType === 'PLAYER_BASE' && showSkillSelect && (
                            <>
                                <div className="text-center mb-4 border-b border-slate-600 pb-2">
                                     <h2 className="text-xl font-black text-white uppercase">Select Skill</h2>
                                     <div className="text-xs text-blue-300">Unlock with MP</div>
                                </div>
                                <div className="flex flex-col gap-2 mb-4">
                                    {[SkillType.FIREBALL, SkillType.CANNON, SkillType.INVISIBILITY, SkillType.INVINCIBLE]
                                        .sort((a, b) => SKILL_STATS[b].unlockCost - SKILL_STATS[a].unlockCost)
                                        .map(skill => {
                                        const config = SKILL_STATS[skill];
                                        const unlockCost = config.unlockCost;
                                        const isLearned = learnedSkills.includes(skill);
                                        const canAfford = playerMp >= unlockCost;
                                        
                                        return (
                                            <button 
                                                key={skill}
                                                disabled={isLearned || !canAfford}
                                                onClick={() => performSkillLearn(skill)}
                                                className={`p-3 rounded-lg border flex items-center justify-between
                                                    ${isLearned ? 'bg-green-900/50 border-green-700 text-green-200' : 
                                                      canAfford ? 'bg-slate-700 hover:bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-gray-500 opacity-50'}
                                                `}
                                            >
                                                <span>
                                                    {skill === SkillType.CANNON && '💣 Cannon Shot'}
                                                    {skill === SkillType.INVISIBILITY && '👻 Invisibility'}
                                                    {skill === SkillType.FIREBALL && '🔥 Fireball'}
                                                    {skill === SkillType.INVINCIBLE && '🛡️ Invincible'}
                                                </span>
                                                {isLearned ? <span className="text-xs">LEARNED</span> : <span className="text-xs font-bold text-blue-300">{unlockCost} MP</span>}
                                            </button>
                                        )
                                    })}
                                </div>
                                <button onClick={() => setShowSkillSelect(false)} className="w-full py-2 bg-slate-700 text-white rounded font-bold text-sm">Back</button>
                            </>
                        )}

                        {/* --- SPAWNER UPGRADE --- */}
                        {upgradeMenuType !== 'PLAYER_BASE' && upgradeMenuType !== null && (
                            <>
                                <div className="text-center mb-6 border-b border-slate-600 pb-4">
                                     <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                                         {upgradeMenuType} Upgrade
                                     </h2>
                                     <div className="text-xs text-slate-400 mt-1">Enhance your forces</div>
                                </div>

                                <button 
                                    onClick={() => performUpgrade('UNIT')}
                                    disabled={playerGold < GAME_CONFIG.UPGRADE_COST}
                                    className={`w-full p-4 mb-3 rounded-xl flex items-center justify-between transition-all border-2 group
                                        ${playerGold >= GAME_CONFIG.UPGRADE_COST ? 'bg-blue-600 hover:bg-blue-500 border-blue-400' : 'bg-slate-700 border-slate-600 opacity-50 cursor-not-allowed'}
                                    `}
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-white">Upgrade Unit</div>
                                        <div className="text-xs text-blue-200">Stats + (HP, Atk, Spd)</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-2xl font-black text-cyan-400">Lv.{currentLevels().unit}</span>
                                            <span className="text-slate-500 text-xs">▶</span>
                                            <span className="text-xs font-bold text-slate-500">Lv.{currentLevels().unit + 1}</span>
                                        </div>
                                        <div className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                            <GoldCoinIcon /> {GAME_CONFIG.UPGRADE_COST}
                                        </div>
                                    </div>
                                </button>

                                <button 
                                    onClick={() => performUpgrade('SPAWNER')}
                                    disabled={playerGold < GAME_CONFIG.UPGRADE_COST || isSpawnerMaxed()}
                                    className={`w-full p-4 mb-6 rounded-xl flex items-center justify-between transition-all border-2 group
                                        ${isSpawnerMaxed() ? 'bg-slate-700 border-slate-600 opacity-50 cursor-not-allowed' :
                                          playerGold >= GAME_CONFIG.UPGRADE_COST ? 'bg-purple-600 hover:bg-purple-500 border-purple-400' : 'bg-slate-700 border-slate-600 opacity-50 cursor-not-allowed'}
                                    `}
                                >
                                    <div className="text-left">
                                        <div className="font-bold text-white">Upgrade Spawner</div>
                                        <div className="text-xs text-purple-200">Spawn Speed +</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {isSpawnerMaxed() ? (
                                            <div className="text-2xl font-black text-white mb-1">MAX</div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-2xl font-black text-purple-400">Lv.{currentLevels().spawner}</span>
                                                <span className="text-slate-500 text-xs">▶</span>
                                                <span className="text-xs font-bold text-slate-500">Lv.{currentLevels().spawner + 1}</span>
                                            </div>
                                        )}
                                        
                                        {!isSpawnerMaxed() && (
                                            <div className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                                                <GoldCoinIcon /> {GAME_CONFIG.UPGRADE_COST}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            </>
                        )}
                        
                        {/* Close Button (Global) */}
                        {!showSkillSelect && (
                            <button 
                                onClick={() => setUpgradeMenuType(null)}
                                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {(playerHp <= 0 || gameOutcome) && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center pointer-events-auto z-50 backdrop-blur-sm">
                 <div className="text-center animate-bounce-in">
                    
                    {gameOutcome === 'VICTORY' && (
                        <>
                            <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2 tracking-tighter drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]">VICTORY</h1>
                            <p className="text-yellow-100 text-2xl mb-12 font-bold uppercase tracking-widest">Enemy Base Destroyed</p>
                        </>
                    )}

                    {gameOutcome === 'DEFEAT' && (
                        <>
                            <h1 className="text-8xl font-black text-red-600 mb-2 tracking-tighter drop-shadow-red-glow">DEFEAT</h1>
                            <p className="text-red-200 text-2xl mb-12 font-bold uppercase tracking-widest">Your Base Has Fallen</p>
                        </>
                    )}

                    {!gameOutcome && playerHp <= 0 && (
                        <>
                            <h1 className="text-7xl font-black text-slate-400 mb-2 tracking-tighter">FALLEN</h1>
                            <p className="text-slate-300 text-xl mb-12">You fell in battle.</p>
                        </>
                    )}
                    
                    <div className="flex flex-col md:flex-row gap-6 justify-center">
                      {!gameOutcome && playerHp <= 0 && (
                          <button 
                            onClick={revivePlayer} 
                            className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95 border-2 border-yellow-400"
                          >
                            ⚡ Revive
                          </button>
                      )}
                      
                      <button 
                        onClick={returnToMenu} 
                        className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95 border-2 border-slate-500"
                      >
                        🏠 Main Menu
                      </button>
                    </div>
                 </div>
              </div>
            )}
          </div>
          
          {/* Controls Layer */}
          <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none z-30">
              <Joystick onMove={handleMove} />
              
              <SkillBtn 
                 learnedSkills={learnedSkills} 
                 onUseSkill={handleUseSkill} 
                 cooldowns={skillCooldowns}
                 playerMp={playerMp}
              />
              
              <AttackBtn onAttackState={handleAttack} />
          </div>
          
        </>
      )}

    </div>
  );
};

export default App;
