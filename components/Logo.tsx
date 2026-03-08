
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  imageUrl?: string | null;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40, imageUrl = null }) => {
  if (imageUrl) {
    return (
      <div className={`flex items-center justify-center overflow-hidden rounded-xl ${className}`} style={{ width: size, height: size }}>
        <img src={imageUrl} alt="App Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Outer Shield Shape - Softened */}
        <path 
          d="M50 5 C50 5 85 15 85 45 C85 75 50 95 50 95 C50 95 15 75 15 45 C15 15 50 5 50 5Z" 
          fill="url(#logoGrad)" 
          className="drop-shadow-md"
        />
        
        {/* Inner Book/Education Symbol */}
        <path 
          d="M30 40 C30 35 35 32 50 32 C65 32 70 35 70 40 V65 C70 70 65 73 50 73 C35 73 30 70 30 65 V40Z" 
          fill="white" 
          fillOpacity="0.2" 
        />
        
        {/* Graduation Cap Top */}
        <path 
          d="M50 25 L80 38 L50 51 L20 38 L50 25Z" 
          fill="white" 
          className="animate-float"
          style={{ animationDuration: '4s' }}
        />
        
        {/* Graduation Tassel */}
        <path 
          d="M80 38 V55 C80 55 78 58 75 58" 
          stroke="white" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        
        {/* Smart/AI Sparkle */}
        <circle 
          cx="50" 
          cy="51" 
          r="6" 
          fill="url(#accentGrad)" 
          filter="url(#softGlow)"
          className="animate-pulse"
        />
        
        {/* Circuit Lines representing "Smart" */}
        <path 
          d="M50 51 V65 M50 65 H35 M50 65 H65" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeOpacity="0.6"
        />
        
        {/* Floating Particles */}
        <circle cx="25" cy="25" r="2" fill="white" fillOpacity="0.4" className="animate-ping" style={{ animationDuration: '3s' }} />
        <circle cx="75" cy="75" r="2" fill="white" fillOpacity="0.4" className="animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
      </svg>
    </div>
  );
};

export default Logo;
