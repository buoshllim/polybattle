import React, { useRef, useState, useEffect } from 'react';

interface JoystickProps {
  onMove: (x: number, y: number) => void;
}

const Joystick: React.FC<JoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const RADIUS = 50; 

  const handleStart = (clientX: number, clientY: number) => {
    setActive(true);
    setOrigin({ x: clientX, y: clientY });
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!active) return;

    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    let renderX = dx;
    let renderY = dy;

    if (dist > RADIUS) {
      const angle = Math.atan2(dy, dx);
      renderX = Math.cos(angle) * RADIUS;
      renderY = Math.sin(angle) * RADIUS;
    }

    setPosition({ x: renderX, y: renderY });

    const inputX = renderX / RADIUS;
    const inputY = renderY / RADIUS;
    
    onMove(inputX, inputY);
  };

  const handleEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  };

  const onTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
  }
  
  const onTouchMove = (e: React.TouchEvent) => {
      e.stopPropagation();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
  }

  const onTouchEnd = (e: React.TouchEvent) => {
      e.stopPropagation();
      handleEnd();
  }
  
  const onMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleStart(e.clientX, e.clientY);
  }
  
  const onMouseMove = (e: React.MouseEvent) => {
      if(active) {
          e.stopPropagation();
          handleMove(e.clientX, e.clientY);
      }
  }

  const onMouseUp = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleEnd();
  }

  // Fallback for dragging off the element
  useEffect(() => {
    const handleGlobalUp = () => {
      if (active) handleEnd();
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [active]);

  return (
    <div 
      className="absolute bottom-8 left-8 z-50 select-none touch-none pointer-events-auto"
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={active ? undefined : (e) => e.stopPropagation()} // Prevent propagation if just hovering
    >
      {/* Base */}
      <div className={`w-32 h-32 rounded-full bg-slate-900/30 border-2 ${active ? 'border-cyan-400/50' : 'border-white/10'} backdrop-blur-sm flex items-center justify-center relative transition-all duration-200`}>
        {/* Stick */}
        <div 
          className="w-12 h-12 rounded-full bg-gradient-to-b from-cyan-500/80 to-blue-600/80 shadow-lg absolute pointer-events-none backdrop-blur-md border border-white/20 transition-transform duration-75 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px)`,
            boxShadow: '0 4px 15px rgba(0, 200, 255, 0.3)'
          }}
        />
        <div className="absolute top-2 w-1 h-1 bg-white/20 rounded-full"></div>
        <div className="absolute bottom-2 w-1 h-1 bg-white/20 rounded-full"></div>
        <div className="absolute left-2 w-1 h-1 bg-white/20 rounded-full"></div>
        <div className="absolute right-2 w-1 h-1 bg-white/20 rounded-full"></div>
      </div>
    </div>
  );
};

export default Joystick;