import React, { useState } from 'react';

interface AttackBtnProps {
  onAttackState: (isAttacking: boolean) => void;
}

const AttackBtn: React.FC<AttackBtnProps> = ({ onAttackState }) => {
  const pressedState = React.useRef(false);
  const [pressed, setPressed] = useState(false);

  // Helper to sync state and ref
  const updateState = (isPressed: boolean) => {
      pressedState.current = isPressed;
      setPressed(isPressed);
      onAttackState(isPressed);
  }

  // Handle both touch and mouse events reliably
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if(e.cancelable) e.preventDefault(); 
    e.stopPropagation();
    updateState(true);
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if(e.cancelable) e.preventDefault();
    e.stopPropagation();
    updateState(false);
  };

  return (
    <div 
      className="absolute bottom-10 right-10 z-50 select-none touch-none pointer-events-auto"
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      <div 
        className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-100 shadow-2xl overflow-hidden
          ${pressed ? 'bg-red-900 scale-95' : 'bg-slate-900 hover:bg-slate-800'}
        `}
        style={{
            boxShadow: pressed 
              ? 'inset 0 0 20px rgba(0,0,0,0.8)' 
              : '0 10px 25px rgba(0,0,0,0.9), inset 0 2px 10px rgba(255,255,255,0.1)'
        }}
      >
        <svg 
            width="80" 
            height="80" 
            viewBox="0 0 100 100" 
            fill="currentColor" 
            className={`drop-shadow-lg transition-transform duration-100 ${pressed ? 'scale-110 rotate-12' : ''}`}
        >
          <defs>
            <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#e2e8f0', stopOpacity: 1 }} />
              <stop offset="50%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#94a3b8', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#fcd34d', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#b45309', stopOpacity: 1 }} />
            </linearGradient>
          </defs>

          {/* Centered Group */}
          <g transform="rotate(45, 50, 50)">
             {/* Thick "Do" (Saber) Blade */}
             {/* Curve on the back, sharp edge on the front, wider at the top */}
             <path d="M45 20 C 45 20, 42 60, 44 70 L 56 70 C 58 60, 65 30, 45 10 Z" fill="url(#bladeGrad)" stroke="#475569" strokeWidth="1" />
             
             {/* Blood groove / Fuller */}
             <path d="M48 25 C 48 25, 46 55, 48 65" stroke="#94a3b8" strokeWidth="2" fill="none" opacity="0.6" />

             {/* Guard (Tsuba/Disc style) */}
             <ellipse cx="50" cy="72" rx="14" ry="5" fill="url(#goldGrad)" stroke="#451a03" strokeWidth="1" />
             
             {/* Hilt */}
             <rect x="46" y="74" width="8" height="18" fill="#3f2e21" stroke="black" strokeWidth="0.5" rx="1" />
             
             {/* Grip Wrapping */}
             <path d="M46 78 L54 80 M46 82 L54 84 M46 86 L54 88" stroke="#1c1917" strokeWidth="1" />

             {/* Pommel */}
             <circle cx="50" cy="94" r="5" fill="url(#goldGrad)" stroke="#451a03" strokeWidth="1" />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default AttackBtn;