"use client"

import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

interface LeftPanelProps {
  subtitle?: string;
}

export default function LeftPanel({ subtitle = 'Animation Studio Workspace' }: LeftPanelProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="hidden lg:flex lg:w-[42%] relative items-center justify-center overflow-hidden z-20">

      {/* Base */}
      <div
        className="absolute inset-0"
        style={{ background: isDark ? '#2d5c5a' : '#3a7270' }}
      />

      {/* Radial light */}
      <div className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 20% 15%, rgba(99,180,170,0.45) 0%, transparent 65%)' }} />

      {/* Bottom fade */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(2,6,23,0.4) 0%, transparent 50%)' }} />

      {/* Geometric lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="20%" x2="100%" y2="80%" stroke="white" strokeWidth="0.8"/>
        <line x1="0" y1="70%" x2="100%" y2="30%" stroke="white" strokeWidth="0.5"/>
        <circle cx="70%" cy="25%" r="120" fill="none" stroke="white" strokeWidth="0.6"/>
        <circle cx="25%" cy="75%" r="80"  fill="none" stroke="white" strokeWidth="0.5"/>
        <rect x="65%" y="55%" width="200" height="200" rx="4"
          fill="none" stroke="white" strokeWidth="0.5"
          transform="rotate(-15 70% 65%)"/>
      </svg>

      {/* Grain */}
      <div className="absolute inset-0 opacity-25 mix-blend-overlay pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <filter id="authGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#authGrain)"/>
        </svg>
      </div>

      {/* Brand content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 text-center px-12"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.55em] text-white/60 mb-5">
          {subtitle}
        </p>
        <h1
          className="text-[4.5rem] font-black uppercase text-white drop-shadow-xl leading-none mb-5"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: '0.18em' }}
        >
          JOWHAR
        </h1>
        <div className="flex items-center justify-center gap-3 mb-7">
          <div className="h-px w-10 bg-white/30 rounded-full"/>
          <div className="w-1.5 h-1.5 rounded-full bg-white/50"/>
          <div className="h-px w-10 bg-white/30 rounded-full"/>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60">
          Animation Studio Workspace
        </p>
      </motion.div>
    </div>
  );
}