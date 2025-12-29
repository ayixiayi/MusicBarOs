
import React, { useEffect, useState } from 'react';
import { Song } from '../types';
import { Disc } from 'lucide-react';

interface CoverFlowProps {
  songs: Song[];
  currentIndex: number;
}

export const CoverFlow: React.FC<CoverFlowProps> = ({ songs, currentIndex }) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStyle = (index: number) => {
    const distance = index - currentIndex;
    const absDistance = Math.abs(distance);
    
    const isActive = distance === 0;
    const isVisible = absDistance <= 3; 

    const isTablet = windowWidth > 768;
    const isWide = windowWidth > 1200;
    
    let spacing = 120;
    if (isWide) spacing = 260;
    else if (isTablet) spacing = 180;

    let transform = '';
    let zIndex = 10 - absDistance;
    let opacity = 1;
    let filter = 'none';

    if (isActive) {
      const activeScale = isWide ? 1.4 : (isTablet ? 1.25 : 1.15);
      transform = `scale(${activeScale}) translateZ(120px)`;
      opacity = 1;
    } else {
      const translateX = distance * spacing; 
      const scale = 1 - (absDistance * (isTablet ? 0.12 : 0.18));
      const rotateY = distance > 0 ? -40 : 40; 
      transform = `translateX(${translateX}px) scale(${scale}) perspective(1000px) rotateY(${rotateY}deg)`;
      opacity = 1 - (absDistance * 0.25);
      filter = `brightness(${0.4 - absDistance * 0.05}) blur(${absDistance * 1.5}px)`;
    }

    if (!isVisible) opacity = 0;

    return {
      transform,
      zIndex,
      opacity,
      filter,
      transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)', 
    };
  };

  if (songs.length === 0) return <div className="text-zinc-600 font-mono text-sm uppercase tracking-widest animate-pulse">Scanning Library...</div>;

  const activeSong = songs[currentIndex];

  return (
    <div className="relative w-full h-full flex flex-col justify-center items-center overflow-hidden">
      
      {/* Background Ambient - Keeping it very subtle to allow Background through */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          key={activeSong?.id}
          src={activeSong?.coverUrl} 
          className="w-full h-full object-cover blur-[120px] opacity-5 transition-opacity duration-1000 scale-150"
          alt="ambient"
        />
        {/* Subtle vignette instead of heavy gradient */}
        <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/60 opacity-50"></div>
      </div>

      {/* Main Flow Stage */}
      <div className="relative z-10 w-full h-[40dvh] sm:h-[50dvh] flex justify-center items-center" style={{ perspective: '1500px' }}>
        {songs.map((song, index) => {
          if (Math.abs(index - currentIndex) > 4) return null;

          return (
            <div
              key={song.id}
              className="absolute w-44 h-44 xs:w-52 xs:h-52 sm:w-64 sm:h-64 md:w-80 md:h-80 bg-zinc-900 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex-shrink-0"
              style={getStyle(index)}
            >
              <img 
                src={song.coverUrl} 
                alt={song.title} 
                className="w-full h-full object-cover rounded-3xl border border-white/10 ring-1 ring-white/5"
              />
              <div 
                className="absolute -bottom-[105%] left-0 w-full h-full opacity-10 scale-y-[-1] pointer-events-none hidden xs:block"
                style={{ 
                  backgroundImage: `linear-gradient(to top, rgba(9,9,11,1) 20%, transparent), url(${song.coverUrl})`,
                  backgroundSize: 'cover'
                }} 
              />
            </div>
          );
        })}
      </div>

      <div className="z-20 mt-12 sm:mt-20 text-center space-y-3 sm:space-y-5 max-w-[90vw] sm:max-w-3xl px-6 animate-fade-in">
        <h1 className="text-2xl xs:text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
          {activeSong?.title}
        </h1>
        <div className="flex items-center justify-center space-x-3 text-zinc-400">
          <Disc size={windowWidth > 768 ? 24 : 18} className="animate-spin-slow text-indigo-500/50" />
          <p className="text-base xs:text-lg sm:text-2xl md:text-3xl font-bold tracking-tight text-zinc-300">
            {activeSong?.artist}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
            <p className="text-[9px] sm:text-xs text-zinc-500 uppercase tracking-[0.4em] font-black">{activeSong?.album}</p>
            <div className="h-px w-8 bg-zinc-800"></div>
        </div>
      </div>

    </div>
  );
};
