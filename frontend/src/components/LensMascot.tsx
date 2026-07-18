import React from 'react';

interface LensMascotProps {
  className?: string;
  size?: number;
  mood?: 'happy' | 'thinking' | 'sleeping' | 'neutral';
}

export const LensMascot: React.FC<LensMascotProps> = ({ className = '', size = 48, mood = 'neutral' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 64 64" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none ${className}`}
    >
      {/* Soft background glow */}
      <circle cx="32" cy="32" r="28" fill="#7C5CFC" fillOpacity="0.04" />
      
      {/* Antenna */}
      <path d="M32 16V8" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="6" r="2" fill="#7C5CFC" className={mood === 'happy' ? 'animate-pulse' : ''} />
      
      {/* Robot Face Chassis */}
      <rect x="14" y="16" width="36" height="32" rx="10" fill="#1C2128" stroke="#30363D" strokeWidth="2" />
      
      {/* Screen Frame */}
      <rect x="19" y="21" width="26" height="15" rx="4" fill="#0D1117" stroke="#30363D" strokeWidth="1" />
      
      {/* Eyes based on mood */}
      {mood === 'happy' && (
        <>
          <path d="M22 27C23 25 24 25 25 27" stroke="#3FB950" strokeWidth="2" strokeLinecap="round" />
          <path d="M39 27C40 25 41 25 42 27" stroke="#3FB950" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {mood === 'thinking' && (
        <>
          <line x1="22" y1="26" x2="25" y2="26" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" />
          <path d="M38 26C39.5 28 40.5 28 42 26" stroke="#7C5CFC" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
      {mood === 'sleeping' && (
        <>
          <path d="M22 28C23 29 24 29 25 28" stroke="#8B949E" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M39 28C40 29 41 29 42 28" stroke="#8B949E" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
      {mood === 'neutral' && (
        <>
          <circle cx="23.5" cy="27.5" r="2" fill="#58A6FF" />
          <circle cx="40.5" cy="27.5" r="2" fill="#58A6FF" />
        </>
      )}
      
      {/* Robot Ears / Connectors */}
      <rect x="10" y="24" width="4" height="12" rx="1.5" fill="#30363D" />
      <rect x="50" y="24" width="4" height="12" rx="1.5" fill="#30363D" />
      
      {/* Mouth */}
      {mood === 'happy' && (
        <path d="M29 40C30 42 32 42 33 40" stroke="#3FB950" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {mood === 'thinking' && (
        <line x1="29" y1="40" x2="33" y2="40" stroke="#7C5CFC" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {mood === 'neutral' && (
        <line x1="29.5" y1="40" x2="32.5" y2="40" stroke="#8B949E" strokeWidth="1" strokeLinecap="round" />
      )}
      {mood === 'sleeping' && (
        <circle cx="31" cy="40" r="0.5" fill="#8B949E" />
      )}
    </svg>
  );
};
