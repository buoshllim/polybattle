

import React, { useState } from 'react';
import { SkillType, SKILL_STATS } from '../types';

interface SkillBtnProps {
  learnedSkills: SkillType[];
  onUseSkill: (skill: SkillType) => void;
  cooldowns: Record<SkillType, number>;
  playerMp: number;
}

const SkillBtn: React.FC<SkillBtnProps> = ({ learnedSkills, onUseSkill, cooldowns, playerMp }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (learnedSkills.length === 0) return null;

  const toggleMenu = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault(); // Prevent default to stop ghost clicks
      e.stopPropagation();
      setIsOpen(prev => !prev);
  };

  const handleSkillClick = (e: React.MouseEvent | React.TouchEvent, skill: SkillType) => {
      e.preventDefault();
      e.stopPropagation();
      
      const now = Date.now();
      const readyAt = cooldowns[skill] || 0;
      const config = SKILL_STATS[skill];

      if (now >= readyAt && playerMp >= config.cost) {
          onUseSkill(skill);
          setIsOpen(false);
      }
  };

  const getSkillIcon = (skill: SkillType) => {
      switch(skill) {
          case SkillType.FIREBALL: return '🔥';
          case SkillType.CANNON: return '💣';
          case SkillType.INVISIBILITY: return '👻';
          case SkillType.INVINCIBLE: return '🛡️';
          default: return '?';
      }
  };

  const getSkillColor = (skill: SkillType) => {
      switch(skill) {
          case SkillType.FIREBALL: return 'bg-orange-600 border-orange-400';
          case SkillType.CANNON: return 'bg-slate-700 border-slate-400';
          case SkillType.INVISIBILITY: return 'bg-cyan-600 border-cyan-400';
          case SkillType.INVINCIBLE: return 'bg-yellow-600 border-yellow-400';
          default: return 'bg-gray-600';
      }
  };

  return (
    <div className="absolute bottom-40 right-10 z-50 pointer-events-auto flex flex-col items-end gap-2">
      
      {/* Skill List Popup */}
      {isOpen && (
          <div className="flex flex-col gap-3 mb-2 animate-fade-in-up">
              {learnedSkills.map(skill => {
                  const now = Date.now();
                  const readyAt = cooldowns[skill] || 0;
                  const isCooldown = now < readyAt;
                  const config = SKILL_STATS[skill];
                  const hasMp = playerMp >= config.cost;
                  const disabled = isCooldown || !hasMp;

                  return (
                      <button
                        key={skill}
                        // Support both click and touch via handler logic
                        onMouseDown={(e) => !disabled && handleSkillClick(e, skill)}
                        onTouchStart={(e) => !disabled && handleSkillClick(e, skill)}
                        className={`w-14 h-14 rounded-full border-2 shadow-lg flex items-center justify-center text-2xl transition-all relative
                            ${getSkillColor(skill)}
                            ${disabled ? 'opacity-50 grayscale' : 'hover:scale-110 active:scale-95'}
                        `}
                      >
                          {getSkillIcon(skill)}
                          {/* Cost Label */}
                          <div className="absolute -left-8 text-[10px] font-bold text-blue-300 bg-black/50 px-1 rounded">
                              {config.cost}
                          </div>
                          {/* Cooldown Overlay */}
                          {isCooldown && (
                              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                  {Math.ceil((readyAt - now) / 1000)}s
                              </div>
                          )}
                      </button>
                  );
              })}
          </div>
      )}

      {/* Main Toggle Button */}
      <button 
        onClick={toggleMenu}
        className="w-16 h-16 rounded-full bg-blue-600 border-2 border-blue-400 shadow-xl flex items-center justify-center text-white font-bold text-sm transition-transform hover:scale-105 active:scale-95"
      >
          SKILL
      </button>
    </div>
  );
};

export default SkillBtn;