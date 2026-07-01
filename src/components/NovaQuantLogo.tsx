import React from 'react';
// @ts-ignore
import logoUrl from '../assets/images/novaquant_logo_1780893276213.png';

interface NovaQuantLogoProps {
  className?: string;
  size?: number;
}

export default function NovaQuantLogo({ className = '', size = 120 }: NovaQuantLogoProps) {
  return (
    <div 
      className={`${className} relative flex items-center justify-center overflow-hidden rounded-full bg-transparent`}
      style={{ width: size, height: size }}
    >
      <img 
        src={logoUrl} 
        alt="NovaQuant Logo" 
        referrerPolicy="no-referrer"
        className="select-none object-cover rounded-full"
        style={{ 
          width: '100%', 
          height: '100%',
          transform: 'scale(1.22)', // Scale up to cleanly push all surrounding white padding outside the clipping circle
        }}
      />
    </div>
  );
}

