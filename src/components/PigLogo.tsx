import React from 'react';
import clsx from 'clsx';

interface PigLogoProps {
  className?: string;
  animate?: boolean;
}

export default function PigLogo({ className, animate = false }: PigLogoProps) {
  return (
    <div className={clsx(animate && "animate-pig-bounce", "origin-bottom flex items-center justify-center")}>
      <svg 
        viewBox="0 0 100 100" 
        className={className} 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M 28 55 L 28 25 L 45 55 L 45 25 M 55 55 L 55 25 L 72 25 M 55 40 L 68 40" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="50" y="80" fontFamily="Prompt, sans-serif" fontWeight="900" fontSize="14" fill="currentColor" textAnchor="middle">นิพนธ์ฟาร์ม</text>
      </svg>
    </div>
  );
}
